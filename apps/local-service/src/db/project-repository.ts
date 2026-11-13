import { createHash, randomUUID } from 'node:crypto';
import { constants, closeSync, copyFileSync, existsSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseProject } from '../../../../packages/project-schema/src/index.ts';
import type { ProjectDocument } from '../../../../packages/project-schema/src/index.ts';
import type { CreateProject, ProjectRepository, ProjectSummary, RevisionEnvelope, SaveProject } from '../server.ts';
import { HttpError, MAX_JSON_BYTES, opaqueId, storageRoot } from '../security.ts';
import { ProjectDatabase, RecoveryRequiredError, regularFile, validateDatabase } from './database.ts';

const MAX_ASSET_BYTES = 64 * 1024 * 1024;
const MAX_LIBRARY_ASSET_BYTES = 512 * 1024 * 1024;
const sha256 = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

export class StaleSaveConflict extends HttpError {
  readonly projectId: string;
  readonly expectedRevisionId: string;
  readonly actualRevisionId: string;
  constructor(projectId: string, expectedRevisionId: string, actualRevisionId: string) {
    super(409, 'REVISION_CONFLICT', 'The saved head has changed.');
    this.projectId = projectId;
    this.expectedRevisionId = expectedRevisionId;
    this.actualRevisionId = actualRevisionId;
  }
}

function checkedDocument(value: unknown): ProjectDocument {
  try {
    const json = JSON.stringify(value);
    if (Buffer.byteLength(json) > MAX_JSON_BYTES) throw new Error('Document limit exceeded.');
    const result = parseProject(JSON.parse(json));
    opaqueId(result.id);
    if (result.title.length > 200) throw new Error('Title limit exceeded.');
    return result;
  } catch { throw new HttpError(422, 'INVALID_DOCUMENT', 'The project document is invalid.'); }
}

type RevisionRow = { id: string; project_id: string; document_json: string; document_sha256: string };
type AssetRow = { sha256: string; media_type: string; byte_length: number; relative_path: string };

/** One service-owned connection; renderer processes receive revision envelopes. */
export class SqliteProjectRepository implements ProjectRepository {
  readonly database: ProjectDatabase;
  private healthy = true;

  constructor(root: string) {
    this.database = new ProjectDatabase(root);
    try {
      const db = this.database.connection;
      const total = Number(db.prepare('SELECT coalesce(sum(byte_length), 0) AS bytes FROM assets').get()!.bytes);
      if (total > MAX_LIBRARY_ASSET_BYTES) throw new RecoveryRequiredError();
      for (const row of db.prepare('SELECT * FROM assets').all()) this.assetBytes(row as AssetRow);
      // The 128 MiB database limit bounds this startup scan, including JSON hashes.
      for (const row of db.prepare('SELECT * FROM project_revisions').all()) {
        const revision = this.decode(row as RevisionRow);
        const linked = db.prepare('SELECT asset_sha256 FROM revision_assets WHERE revision_id = ? ORDER BY asset_sha256').all(revision.revisionId);
        const expected = [...new Set(revision.document.assets.map(asset => asset.sha256))].sort();
        if (canonical(linked.map(item => item.asset_sha256)) !== canonical(expected)) throw new RecoveryRequiredError();
        this.verifyAssets(revision.document);
      }
    } catch {
      this.healthy = false;
      this.database.close();
      throw new RecoveryRequiredError();
    }
  }

  ready(): boolean { return this.healthy && this.database.ready(); }
  close(): void { this.database.close(); }

  list(): ProjectSummary[] {
    this.requireReady();
    return this.database.connection.prepare(`SELECT id, title, head_revision_id AS headRevisionId,
      updated_at AS updatedAt FROM projects ORDER BY updated_at DESC, id LIMIT 1001`).all() as ProjectSummary[];
  }

  get(projectId: string, revisionId?: string): RevisionEnvelope | undefined {
    this.requireReady();
    opaqueId(projectId);
    if (revisionId !== undefined) opaqueId(revisionId);
    const db = this.database.connection;
    const row = revisionId === undefined
      ? db.prepare(`SELECT r.* FROM project_revisions r JOIN projects p
          ON p.head_revision_id = r.id AND p.id = r.project_id WHERE p.id = ?`).get(projectId)
      : db.prepare('SELECT * FROM project_revisions WHERE project_id = ? AND id = ?').get(projectId, revisionId);
    return row ? this.decode(row as RevisionRow) : undefined;
  }

  create(input: CreateProject): RevisionEnvelope {
    this.requireReady();
    opaqueId(input.clientMutationId);
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200) {
      throw new HttpError(422, 'INVALID_INPUT', 'A title of 1 to 200 characters is required.');
    }
    const requestHash = sha256(canonical({ title: input.title }));
    return this.database.transaction(() => {
      const retry = this.retry('create', input.clientMutationId, requestHash);
      if (retry) return retry;
      const db = this.database.connection;
      if (Number(db.prepare('SELECT count(*) AS count FROM projects').get()!.count) >= 1000) {
        throw new HttpError(422, 'INVALID_INPUT', 'The local project capacity was reached.');
      }
      const id = randomUUID(), revisionId = randomUUID(), now = new Date().toISOString();
      const document = checkedDocument({
        schemaVersion: 1, id, title: input.title, createdAt: now, updatedAt: now, fps: 30, projection: 'mercator',
        outputVariants: { portrait: { width: 1080, height: 1920 }, landscape: { width: 1920, height: 1080 } },
        assets: [], sources: [], features: [], featureRevisions: [], layers: [],
        scenes: [{ id: 'scene-1', kind: 'map', durationFrames: 300, focusSteps: [], annotations: [],
          cameraTrack: [{ frame: 0, center: [0, 0], zoom: 0, bearing: 0, pitch: 0, easing: 'linear' }] }],
      });
      db.prepare('INSERT INTO projects VALUES (?, ?, ?, ?)').run(id, document.title, revisionId, now);
      this.insertRevision(id, revisionId, null, 1, document, now);
      this.recordMutation('create', input.clientMutationId, requestHash, revisionId, now);
      return { projectId: id, revisionId, document };
    });
  }

  save(projectId: string, input: SaveProject): RevisionEnvelope {
    this.requireReady();
    opaqueId(projectId); opaqueId(input.expectedRevisionId); opaqueId(input.clientMutationId);
    const document = checkedDocument(input.document);
    if (document.id !== projectId) throw new HttpError(422, 'INVALID_DOCUMENT', 'Project IDs must match.');
    const requestHash = sha256(canonical({ expectedRevisionId: input.expectedRevisionId, document }));
    return this.database.transaction(() => {
      const scope = `save:${projectId}`;
      // Retry receipts precede the head check: a lost acknowledgement may be retried after later saves.
      const retry = this.retry(scope, input.clientMutationId, requestHash);
      if (retry) return retry;
      const db = this.database.connection;
      const head = db.prepare(`SELECT p.head_revision_id, r.ordinal FROM projects p JOIN project_revisions r
        ON r.id = p.head_revision_id WHERE p.id = ?`).get(projectId);
      if (!head) throw new HttpError(404, 'NOT_FOUND', 'Unknown project.');
      if (head.head_revision_id !== input.expectedRevisionId) {
        throw new StaleSaveConflict(projectId, input.expectedRevisionId, String(head.head_revision_id));
      }
      this.verifyAssets(document);
      const revisionId = randomUUID(), now = new Date().toISOString();
      this.insertRevision(projectId, revisionId, input.expectedRevisionId, Number(head.ordinal) + 1, document, now);
      const changed = db.prepare(`UPDATE projects SET head_revision_id = ?, title = ?, updated_at = ?
        WHERE id = ? AND head_revision_id = ?`).run(revisionId, document.title, now, projectId, input.expectedRevisionId);
      if (changed.changes !== 1) throw new StaleSaveConflict(projectId, input.expectedRevisionId, String(head.head_revision_id));
      this.recordMutation(scope, input.clientMutationId, requestHash, revisionId, now);
      return { projectId, revisionId, document };
    });
  }

  /** Accept already reviewed bytes; MIME metadata does not establish rights or sniff a file format. */
  putAsset(bytes: Uint8Array, expectedSha256: string, mediaType: string): void {
    this.requireReady();
    if (!/^[a-f0-9]{64}$/.test(expectedSha256) || bytes.byteLength > MAX_ASSET_BYTES
        || !/^[a-z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(mediaType) || sha256(bytes) !== expectedSha256) {
      throw new HttpError(422, 'INVALID_INPUT', 'Invalid asset bytes or metadata.');
    }
    const directory = storageRoot(this.database.root, 'assets');
    mkdirSync(directory, { recursive: true });
    const filename = path.join(directory, expectedSha256);
    regularFile(filename);
    this.database.transaction(() => {
      const db = this.database.connection;
      const existing = db.prepare('SELECT * FROM assets WHERE sha256 = ?').get(expectedSha256) as AssetRow | undefined;
      if (existing) {
        this.assetBytes(existing);
        if (existing.media_type !== mediaType) throw new HttpError(422, 'INVALID_INPUT', 'Asset metadata differs.');
        return;
      }
      const total = Number(db.prepare('SELECT coalesce(sum(byte_length), 0) AS bytes FROM assets').get()!.bytes);
      if (total + bytes.byteLength > MAX_LIBRARY_ASSET_BYTES) throw new HttpError(422, 'INVALID_INPUT', 'Asset capacity exceeded.');
      if (existsSync(filename)) {
        if (statSync(filename).size !== bytes.byteLength || sha256(readFileSync(filename)) !== expectedSha256) {
          throw new RecoveryRequiredError();
        }
      } else {
        const temporary = path.join(directory, `upload-${randomUUID()}.tmp`);
        const fd = openSync(temporary, 'wx');
        try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
        try {
          // Linking publishes without replacing any existing content-addressed file.
          linkSync(temporary, filename);
        } finally { rmSync(temporary); }
      }
      db.prepare('INSERT INTO assets VALUES (?, ?, ?, ?, ?)')
        .run(expectedSha256, mediaType, bytes.byteLength, `assets/${expectedSha256}`, new Date().toISOString());
    });
  }

  async createBackup(): Promise<string> {
    this.requireReady();
    return this.database.createBackup();
  }

  private requireReady(): void {
    if (!this.ready()) throw new HttpError(503, 'NOT_READY', 'Project storage is not ready.');
  }

  private decode(row: RevisionRow): RevisionEnvelope {
    try {
      if (sha256(row.document_json) !== row.document_sha256) throw new Error('Hash mismatch.');
      const document = checkedDocument(JSON.parse(row.document_json));
      if (document.id !== row.project_id) throw new Error('Owner mismatch.');
      return { projectId: row.project_id, revisionId: row.id, document };
    } catch { this.healthy = false; throw new RecoveryRequiredError(); }
  }

  private assetBytes(row: AssetRow): Buffer {
    try {
      if (!/^[a-f0-9]{64}$/.test(row.sha256) || row.relative_path !== `assets/${row.sha256}`
          || row.byte_length < 0 || row.byte_length > MAX_ASSET_BYTES) throw new RecoveryRequiredError();
      const filename = path.join(storageRoot(this.database.root, 'assets'), row.sha256);
      regularFile(filename);
      if (statSync(filename).size !== row.byte_length) throw new RecoveryRequiredError();
      const bytes = readFileSync(filename);
      if (sha256(bytes) !== row.sha256) throw new RecoveryRequiredError();
      return bytes;
    } catch { this.healthy = false; throw new RecoveryRequiredError(); }
  }

  private verifyAssets(document: ProjectDocument): void {
    for (const asset of document.assets) {
      const row = this.database.connection.prepare('SELECT * FROM assets WHERE sha256 = ?').get(asset.sha256) as AssetRow | undefined;
      if (!row || row.media_type !== asset.mediaType) throw new HttpError(422, 'INVALID_DOCUMENT', 'A required asset is unavailable.');
      this.assetBytes(row);
    }
  }

  private insertRevision(projectId: string, revisionId: string, parentId: string | null, ordinal: number, document: ProjectDocument, now: string): void {
    const json = JSON.stringify(document), db = this.database.connection;
    db.prepare('INSERT INTO project_revisions VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(revisionId, projectId, ordinal, parentId, document.schemaVersion, json, sha256(json), now);
    for (const digest of new Set(document.assets.map(asset => asset.sha256))) {
      db.prepare('INSERT INTO revision_assets VALUES (?, ?)').run(revisionId, digest);
    }
  }

  private retry(scope: string, mutationId: string, requestHash: string): RevisionEnvelope | undefined {
    const db = this.database.connection;
    const receipt = db.prepare('SELECT * FROM mutations WHERE scope = ? AND client_mutation_id = ?').get(scope, mutationId);
    if (!receipt) return undefined;
    if (receipt.request_sha256 !== requestHash) throw new HttpError(422, 'INVALID_INPUT', 'Mutation identifier was reused with different input.');
    return this.decode(db.prepare('SELECT * FROM project_revisions WHERE id = ?').get(receipt.result_revision_id!) as RevisionRow);
  }

  private recordMutation(scope: string, mutationId: string, requestHash: string, revisionId: string, now: string): void {
    this.database.connection.prepare('INSERT INTO mutations VALUES (?, ?, ?, ?, ?)').run(scope, mutationId, requestHash, revisionId, now);
  }
}

/** Explicit recovery only. The caller must close the original service first. */
export function restoreBackup(sourceRoot: string, backupName: string, destinationRoot: string): SqliteProjectRepository {
  const source = storageRoot(process.cwd(), sourceRoot);
  if (!/^library-[0-9]{13}-[a-f0-9-]{36}\.sqlite$/.test(backupName)) throw new RecoveryRequiredError();
  const filename = path.join(storageRoot(source, 'backups'), backupName);
  regularFile(filename);
  // Only closed, self-contained snapshots are accepted. Never remove a WAL to repair one.
  if (['-wal', '-shm', '-journal'].some(suffix => existsSync(filename + suffix))) throw new RecoveryRequiredError();
  if (!existsSync(filename) || statSync(filename).size > 128 * 1024 * 1024) throw new RecoveryRequiredError();
  const destination = storageRoot(process.cwd(), destinationRoot);
  if (existsSync(destination)) throw new Error('Recovery requires a new, absent data root.');
  const snapshot = new DatabaseSync(filename, { readOnly: true });
  try {
    validateDatabase(snapshot);
    const assets = snapshot.prepare('SELECT * FROM assets').all() as AssetRow[];
    if (assets.reduce((total, asset) => total + asset.byte_length, 0) > MAX_LIBRARY_ASSET_BYTES) throw new RecoveryRequiredError();
    mkdirSync(destination);
    // A partial failed destination is retained for diagnosis and is never reused automatically.
    copyFileSync(filename, path.join(destination, 'library.sqlite'), constants.COPYFILE_EXCL);
    mkdirSync(path.join(destination, 'assets'));
    for (const asset of assets) {
      if (!/^[a-f0-9]{64}$/.test(asset.sha256) || asset.relative_path !== `assets/${asset.sha256}`
          || asset.byte_length < 0 || asset.byte_length > MAX_ASSET_BYTES) throw new RecoveryRequiredError();
      const original = path.join(storageRoot(source, 'assets'), asset.sha256);
      regularFile(original);
      if (statSync(original).size !== asset.byte_length || sha256(readFileSync(original)) !== asset.sha256) throw new RecoveryRequiredError();
      copyFileSync(original, path.join(destination, 'assets', asset.sha256), constants.COPYFILE_EXCL);
    }
  } finally { snapshot.close(); }
  return new SqliteProjectRepository(destination);
}
