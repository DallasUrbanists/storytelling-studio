import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, lstatSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseProject } from '../../../../packages/project-schema/src/index.ts';
import { canonicalJson } from '../../../../packages/project-schema/src/canonical.ts';
import type { ProjectDocument } from '../../../../packages/project-schema/src/index.ts';
import type { CreateProject, SaveProject, RevisionEnvelope, ProjectSummary } from '../server.ts';
import { HttpError, opaqueId } from '../security.ts';

export const hashBytes = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const fixtureDirectory = fileURLToPath(new URL('../../../../tests/fixtures/synthetic-story/', import.meta.url));

const blankStyle = Buffer.from(JSON.stringify({ version: 8, name: 'Local source canvas', transition: { duration: 0, delay: 0 }, sources: {}, layers: [{ id: 'ground', type: 'background', paint: { 'background-color': '#f5f4ed' } }] }));
const resourceBytes = (file: string): Buffer => file === 'assets/bridge-style.json' ? blankStyle : readFileSync(path.join(fixtureDirectory, file));

/** Produce a blank story with explicitly licensed local rendering resources. */
export function blankProject(title: string, id = randomUUID(), now = new Date().toISOString()): ProjectDocument {
  const assets = [
    ['fixture-style', 'assets/bridge-style.json', 'application/json', 'MIT', 'Dallas Urbanists'],
    ['fixture-font', 'assets/Inter-Regular.woff2', 'font/woff2', 'OFL-1.1', 'Inter by Rasmus Andersson'],
    ['font-license', 'assets/OFL-Inter.txt', 'text/plain', 'OFL-1.1', 'Inter by Rasmus Andersson'],
  ].map(([assetId, file, mediaType, license, credit]) => ({ id: assetId, path: file, mediaType,
    sha256: hashBytes(resourceBytes(file)),
    permission: { localUse: true, publication: true, redistribution: true, license, credit } }));
  return parseProject({ schemaVersion: 1, id, title, createdAt: now, updatedAt: now, fps: 30, projection: 'mercator',
    outputVariants: { portrait: { width: 1080, height: 1920 }, landscape: { width: 1920, height: 1080 } },
    assets, sources: [], features: [], featureRevisions: [], layers: [],
    scenes: [{ id: randomUUID(), kind: 'map', title: 'Opening', durationFrames: 300, focusSteps: [],
      cameraTrack: [{ frame: 0, center: [-96.8005, 32.7805], zoom: 12, bearing: 0, pitch: 0, easing: 'linear' }], annotations: [] }],
  });
}

/** SQLite transactions preserve immutable revisions and reject stale or ambiguous retries. */
export class SqliteProjectRepository {
  readonly db: DatabaseSync;
  constructor(directory: string) {
    mkdirSync(directory, { recursive: true });
    const filename = path.join(directory, 'studio.sqlite');
    try { if (lstatSync(filename).isSymbolicLink()) throw new Error('Database links are not allowed'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    this.db = new DatabaseSync(filename);
    const version = Number(this.db.prepare('PRAGMA user_version').get()?.user_version ?? 0);
    if (version > 1) { this.db.close(); throw new Error('This database needs a newer Studio version.'); }
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, title TEXT NOT NULL, head TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS revisions(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), document TEXT NOT NULL, sha256 TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS mutations(scope TEXT NOT NULL, mutation_id TEXT NOT NULL, input_hash TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(scope,mutation_id));
      CREATE TABLE IF NOT EXISTS assets(sha256 TEXT PRIMARY KEY, media_type TEXT NOT NULL, bytes BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, record TEXT NOT NULL);
      PRAGMA user_version=1;`);
    // A process exit cannot leave a previous running job apparently active forever.
    for (const row of this.db.prepare('SELECT id,record FROM jobs').all()) {
      const record = JSON.parse(String(row.record));
      if (['queued','running'].includes(record.status)) this.putJob({ ...record, status: 'failed', error: 'The local service stopped. Start a new export from the saved revision.' });
    }
    const seed = blankProject('Resources');
    for (const asset of seed.assets) this.putAsset(resourceBytes(asset.path), asset.mediaType);
  }
  ready(): boolean { return this.db.prepare('SELECT 1 AS ok').get()?.ok === 1; }
  close(): void { this.db.close(); }
  list(): ProjectSummary[] {
    return this.db.prepare('SELECT id,title,head AS headRevisionId,updated_at AS updatedAt FROM projects ORDER BY updated_at DESC,id').all() as ProjectSummary[];
  }
  get(projectId: string, revisionId?: string): RevisionEnvelope | undefined {
    opaqueId(projectId); if (revisionId) opaqueId(revisionId);
    const row = revisionId
      ? this.db.prepare('SELECT * FROM revisions WHERE project_id=? AND id=?').get(projectId, revisionId)
      : this.db.prepare('SELECT revisions.* FROM revisions JOIN projects ON projects.head=revisions.id WHERE projects.id=?').get(projectId);
    if (!row) return undefined;
    if (hashBytes(String(row.document)) !== row.sha256) throw new Error('Revision checksum mismatch');
    return { projectId, revisionId: String(row.id), document: parseProject(JSON.parse(String(row.document))) };
  }
  private transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = operation(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  private retry(scope: string, mutationId: string, input: unknown, operation: () => RevisionEnvelope): RevisionEnvelope {
    opaqueId(mutationId);
    const digest = hashBytes(canonicalJson(input));
    return this.transaction(() => {
      const existing = this.db.prepare('SELECT input_hash,response FROM mutations WHERE scope=? AND mutation_id=?').get(scope, mutationId);
      if (existing) {
        if (existing.input_hash !== digest) throw new HttpError(409, 'REVISION_CONFLICT', 'The retry identifier was reused for a different edit.');
        return JSON.parse(String(existing.response));
      }
      const result = operation();
      this.db.prepare('INSERT INTO mutations VALUES(?,?,?,?)').run(scope, mutationId, digest, canonicalJson(result));
      return result;
    });
  }
  private revision(document: ProjectDocument): RevisionEnvelope {
    for (const feature of document.featureRevisions) if (hashBytes(canonicalJson(feature.geometry)) !== feature.geometrySha256) throw new HttpError(422, 'INVALID_DOCUMENT', 'Geometry checksum mismatch.');
    const revisionId = randomUUID(), bytes = canonicalJson(parseProject(document));
    this.db.prepare('INSERT INTO revisions VALUES(?,?,?,?)').run(revisionId, document.id, bytes, hashBytes(bytes));
    this.db.prepare('UPDATE projects SET title=?,head=?,updated_at=? WHERE id=?').run(document.title, revisionId, document.updatedAt, document.id);
    return { projectId: document.id, revisionId, document: JSON.parse(bytes) };
  }
  create(input: CreateProject): RevisionEnvelope {
    return this.retry('create', input.clientMutationId, { title: input.title }, () => {
      const document = blankProject(input.title);
      this.db.prepare('INSERT INTO projects VALUES(?,?,?,?)').run(document.id, document.title, '', document.updatedAt);
      return this.revision(document);
    });
  }
  save(projectId: string, input: SaveProject): RevisionEnvelope {
    opaqueId(projectId); parseProject(input.document);
    if (input.document.id !== projectId) throw new HttpError(422, 'INVALID_DOCUMENT', 'Project identity mismatch');
    return this.retry(projectId, input.clientMutationId, input, () => {
      const current = this.get(projectId);
      if (!current) throw new HttpError(404, 'NOT_FOUND', 'Unknown project');
      if (current.revisionId !== input.expectedRevisionId) throw new HttpError(409, 'REVISION_CONFLICT', 'Another tab saved a newer version.');
      // Previously saved geometry, source records, and research inputs are immutable.
      for (const key of ['featureRevisions','sources'] as const) for (const record of current.document[key]) {
        const next = input.document[key].find(value => value.id === record.id);
        if (!next || canonicalJson(next) !== canonicalJson(record)) throw new HttpError(422, 'INVALID_DOCUMENT', 'Create a new revision instead of changing saved evidence.');
      }
      for (const prior of current.document.researchSnapshots ?? []) {
        const next = input.document.researchSnapshots?.find(s => s.id === prior.id);
        if (!next || canonicalJson(next.inputs) !== canonicalJson(prior.inputs) || canonicalJson(next.result) !== canonicalJson(prior.result) || canonicalJson(next.reviews.slice(0, prior.reviews.length)) !== canonicalJson(prior.reviews)) throw new HttpError(422, 'INVALID_DOCUMENT', 'Research evidence and review history must be retained.');
      }
      for (const snapshot of input.document.researchSnapshots ?? []) {
        const featureId = input.document.featureRevisions.find(r => r.id === snapshot.inputs.featureRevisionId)?.featureId;
        if (snapshot.status === 'approved' && input.document.features.find(f => f.id === featureId)?.currentRevisionId !== snapshot.inputs.featureRevisionId) snapshot.status = 'stale';
      }
      return this.revision({ ...input.document, createdAt: current.document.createdAt, updatedAt: new Date().toISOString() });
    });
  }
  import(document: ProjectDocument, assets: { bytes: Uint8Array; mediaType: string }[], mutationId: string): RevisionEnvelope {
    parseProject(document);
    return this.retry('import', mutationId, document, () => {
      const imported = { ...document, id: randomUUID(), updatedAt: new Date().toISOString() };
      for (const asset of assets) this.putAsset(asset.bytes, asset.mediaType);
      this.db.prepare('INSERT INTO projects VALUES(?,?,?,?)').run(imported.id, imported.title, '', imported.updatedAt);
      return this.revision(imported);
    });
  }
  putAsset(bytes: Uint8Array, mediaType: string): string {
    const sha256 = hashBytes(bytes);
    this.db.prepare('INSERT OR IGNORE INTO assets VALUES(?,?,?)').run(sha256, mediaType, bytes);
    return sha256;
  }
  getAsset(sha256: string): Uint8Array | undefined {
    if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid asset identity');
    const row = this.db.prepare('SELECT bytes FROM assets WHERE sha256=?').get(sha256);
    if (!row) return undefined;
    const bytes = row.bytes as Uint8Array;
    if (hashBytes(bytes) !== sha256) throw new Error('Asset checksum mismatch');
    return bytes;
  }
  putJob(job: { id: string; [key: string]: unknown }): void {
    this.db.prepare('INSERT INTO jobs VALUES(?,?) ON CONFLICT(id) DO UPDATE SET record=excluded.record').run(job.id, JSON.stringify(job));
  }
  getJob(id: string): Record<string, unknown> | undefined {
    const row = this.db.prepare('SELECT record FROM jobs WHERE id=?').get(opaqueId(id));
    return row ? JSON.parse(String(row.record)) : undefined;
  }
}
