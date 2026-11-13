import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';
import { storageRoot } from '../security.ts';

const APPLICATION_ID = 0x47535459;
const MAX_DATABASE_BYTES = 128 * 1024 * 1024;
const BACKUP_NAME = /^library-[0-9]{13}-[a-f0-9-]{36}\.sqlite$/;

export class RecoveryRequiredError extends Error {
  readonly code = 'RECOVERY_REQUIRED';
  constructor() { super('Storage validation failed. Preserve the data root and explicitly restore a verified backup to a new root.'); }
}

/** Reject existing links and non-files, including SQLite's sidecar paths. */
export function regularFile(filename: string): void {
  try {
    const entry = lstatSync(filename);
    if (entry.isSymbolicLink() || !entry.isFile()) throw new RecoveryRequiredError();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

function bounded(db: DatabaseSync): void {
  const pages = Number(db.prepare('PRAGMA page_count').get()!.page_count);
  const size = Number(db.prepare('PRAGMA page_size').get()!.page_size);
  if (pages * size > MAX_DATABASE_BYTES) throw new RecoveryRequiredError();
}

/** Check a known schema without repairing, migrating, or discarding any records. */
export function validateDatabase(db: DatabaseSync): void {
  bounded(db);
  if (db.prepare('PRAGMA application_id').get()!.application_id !== APPLICATION_ID
      || db.prepare('PRAGMA user_version').get()!.user_version !== 1
      || db.prepare('PRAGMA quick_check(1)').get()!.quick_check !== 'ok'
      || db.prepare('SELECT count(*) AS count FROM schema_migrations').get()!.count !== 1
      || !db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get()
      || db.prepare('PRAGMA foreign_key_check').get()
      || db.prepare(`SELECT 1 FROM projects p LEFT JOIN project_revisions r
        ON r.id = p.head_revision_id AND r.project_id = p.id WHERE r.id IS NULL LIMIT 1`).get()) {
    throw new RecoveryRequiredError();
  }
}

const schema = `
  CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL) STRICT;
  CREATE TABLE projects (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, head_revision_id TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (head_revision_id, id) REFERENCES project_revisions(id, project_id) DEFERRABLE INITIALLY DEFERRED
  ) STRICT;
  CREATE TABLE project_revisions (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), ordinal INTEGER NOT NULL CHECK (ordinal > 0),
    parent_id TEXT, schema_version INTEGER NOT NULL CHECK (schema_version = 1), document_json TEXT NOT NULL,
    document_sha256 TEXT NOT NULL, created_at TEXT NOT NULL,
    UNIQUE (id, project_id), UNIQUE (project_id, ordinal),
    FOREIGN KEY (parent_id, project_id) REFERENCES project_revisions(id, project_id)
  ) STRICT;
  CREATE TABLE assets (
    sha256 TEXT PRIMARY KEY, media_type TEXT NOT NULL, byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
    relative_path TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
  ) STRICT;
  CREATE TABLE revision_assets (
    revision_id TEXT NOT NULL REFERENCES project_revisions(id), asset_sha256 TEXT NOT NULL REFERENCES assets(sha256),
    PRIMARY KEY (revision_id, asset_sha256)
  ) STRICT;
  CREATE TABLE mutations (
    scope TEXT NOT NULL, client_mutation_id TEXT NOT NULL, request_sha256 TEXT NOT NULL,
    result_revision_id TEXT NOT NULL REFERENCES project_revisions(id), created_at TEXT NOT NULL,
    PRIMARY KEY (scope, client_mutation_id)
  ) STRICT;
  INSERT INTO schema_migrations VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  PRAGMA application_id = ${APPLICATION_ID};
  PRAGMA user_version = 1;
`;

export class ProjectDatabase {
  readonly root: string;
  readonly connection: DatabaseSync;
  readonly settings: { journalMode: string; synchronous: number; foreignKeys: number; busyTimeoutMs: number };
  private closed = false;
  private healthy = true;
  private backingUp = false;

  constructor(root: string) {
    this.root = storageRoot(process.cwd(), root);
    mkdirSync(this.root, { recursive: true });
    const filename = path.join(this.root, 'library.sqlite');
    for (const suffix of ['', '-wal', '-shm', '-journal']) regularFile(filename + suffix);
    const fresh = !existsSync(filename);
    if (!fresh && statSync(filename).size > MAX_DATABASE_BYTES) throw new RecoveryRequiredError();
    const db = new DatabaseSync(filename, { enableForeignKeyConstraints: true, enableDoubleQuotedStringLiterals: false });
    this.connection = db;
    try {
      db.exec('PRAGMA busy_timeout = 1000');
      // Existing or zero-length files are never interpreted as a new library.
      if (!fresh) validateDatabase(db);
      db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA wal_autocheckpoint = 1000');
      const pageSize = Number(db.prepare('PRAGMA page_size').get()!.page_size);
      db.exec(`PRAGMA max_page_count = ${Math.floor(MAX_DATABASE_BYTES / pageSize)}`);
      if (fresh) this.transaction(() => {
        db.exec(schema);
        for (const table of ['project_revisions', 'revision_assets', 'assets', 'mutations']) {
          for (const action of ['UPDATE', 'DELETE']) {
            db.exec(`CREATE TRIGGER immutable_${table}_${action} BEFORE ${action} ON ${table}
              BEGIN SELECT RAISE(ABORT, 'Immutable storage record'); END`);
          }
        }
      });
      validateDatabase(db);
      this.settings = {
        journalMode: String(db.prepare('PRAGMA journal_mode').get()!.journal_mode),
        synchronous: Number(db.prepare('PRAGMA synchronous').get()!.synchronous),
        foreignKeys: Number(db.prepare('PRAGMA foreign_keys').get()!.foreign_keys),
        busyTimeoutMs: Number(db.prepare('PRAGMA busy_timeout').get()!.timeout),
      };
      if (this.settings.journalMode !== 'wal' || this.settings.synchronous !== 2 || this.settings.foreignKeys !== 1) {
        throw new RecoveryRequiredError();
      }
    } catch {
      db.close();
      throw new RecoveryRequiredError();
    }
  }

  ready(): boolean { return !this.closed && this.healthy; }

  transaction<T>(operation: () => T): T {
    if (!this.ready() || this.backingUp) throw new Error('Storage is unavailable or backing up.');
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.connection.exec('COMMIT');
      return result;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }

  /** Keep three consistent SQLite snapshots; never copy an open main file. */
  async createBackup(): Promise<string> {
    if (!this.ready() || this.backingUp) throw new Error('Storage is unavailable or backing up.');
    try { validateDatabase(this.connection); }
    catch { this.healthy = false; throw new RecoveryRequiredError(); }
    const directory = storageRoot(this.root, 'backups');
    mkdirSync(directory, { recursive: true });
    const destination = path.join(directory, `library-${Date.now()}-${randomUUID()}.sqlite`);
    const temporary = destination + '.tmp';
    const deadline = Date.now() + 10_000;
    let steps = 0;
    this.backingUp = true;
    try {
      await backup(this.connection, temporary, { rate: 128, progress: () => {
        if (++steps > 1024 || Date.now() > deadline) throw new Error('Backup limit exceeded.');
      } });
      const snapshot = new DatabaseSync(temporary);
      try {
        // Published snapshots are self-contained closed files with no WAL dependency.
        snapshot.exec('PRAGMA journal_mode = DELETE; PRAGMA synchronous = FULL');
        validateDatabase(snapshot);
      } finally { snapshot.close(); }
      renameSync(temporary, destination);
      const previous = readdirSync(directory).filter(name => BACKUP_NAME.test(name) && name !== path.basename(destination)).sort().reverse();
      for (const name of previous.slice(2)) {
        const filename = path.join(directory, name);
        regularFile(filename);
        rmSync(filename);
      }
      return destination;
    } finally {
      this.backingUp = false;
      if (existsSync(temporary)) rmSync(temporary);
    }
  }

  close(): void {
    if (this.backingUp) throw new Error('Wait for the backup before closing storage.');
    if (!this.closed) { this.connection.close(); this.closed = true; }
  }
}
