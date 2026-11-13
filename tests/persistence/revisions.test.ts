import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createService } from '../../apps/local-service/src/server.ts';
import { RecoveryRequiredError } from '../../apps/local-service/src/db/database.ts';
import { SqliteProjectRepository, StaleSaveConflict, restoreBackup } from '../../apps/local-service/src/db/project-repository.ts';

const checkout = fileURLToPath(new URL('../../', import.meta.url));
const cleanups = new WeakMap<TestContext, (() => unknown | Promise<unknown>)[]>();

function onCleanup(t: TestContext, operation: () => unknown | Promise<unknown>): void {
  if (!cleanups.has(t)) {
    const operations: (() => unknown | Promise<unknown>)[] = [];
    cleanups.set(t, operations);
    t.after(async () => { for (const cleanup of operations.reverse()) await cleanup(); });
  }
  cleanups.get(t)!.push(operation);
}

function roots(t: TestContext): string {
  const temporary = path.join(checkout, '.local', 'persistence-tests');
  mkdirSync(temporary, { recursive: true });
  const root = mkdtempSync(path.join(temporary, 'revision-'));
  onCleanup(t, () => rmSync(root, { recursive: true, force: true }));
  return root;
}

function repository(t: TestContext): SqliteProjectRepository {
  const result = new SqliteProjectRepository(path.join(roots(t), 'data'));
  onCleanup(t, () => result.close());
  return result;
}

test('create/update/reopen preserves immutable documents, metadata and retry receipts', t => {
  const repo = repository(t);
  assert.deepEqual(repo.database.settings, { journalMode: 'wal', synchronous: 2, foreignKeys: 1, busyTimeoutMs: 1000 });
  const initial = repo.create({ title: 'Synthetic project', clientMutationId: 'create-1' });
  assert.deepEqual(repo.create({ title: 'Synthetic project', clientMutationId: 'create-1' }), initial);
  assert.throws(() => repo.create({ title: 'Changed retry', clientMutationId: 'create-1' }), /reused/);
  const input = {
    expectedRevisionId: initial.revisionId, clientMutationId: 'save-1',
    document: { ...initial.document, title: 'Saved title' },
  };
  const updated = repo.save(initial.projectId, input);
  assert.notEqual(updated.revisionId, initial.revisionId);
  assert.deepEqual(repo.get(initial.projectId, initial.revisionId), initial);
  assert.deepEqual(repo.get(initial.projectId), updated);
  // Caller mutation cannot alter previously persisted bytes.
  updated.document.title = 'Only the caller changed';
  assert.equal(repo.get(initial.projectId)!.document.title, 'Saved title');
  assert.equal(repo.list()[0].title, 'Saved title');
  assert.equal(repo.get('unrelated-project', initial.revisionId), undefined);
  repo.close();
  assert.equal(repo.ready(), false);
  const reopened = new SqliteProjectRepository(repo.database.root);
  onCleanup(t, () => reopened.close());
  assert.deepEqual(reopened.get(initial.projectId), { ...updated, document: input.document });
  assert.equal(reopened.save(initial.projectId, input).revisionId, updated.revisionId);
  assert.equal(reopened.create({ title: 'Synthetic project', clientMutationId: 'create-1' }).revisionId, initial.revisionId);
});

test('two connections reject a stale save and retain retry results after newer saves', t => {
  const first = repository(t), second = new SqliteProjectRepository(first.database.root);
  onCleanup(t, () => second.close());
  const initial = first.create({ title: 'Two tabs', clientMutationId: 'create' });
  const input = { expectedRevisionId: initial.revisionId, clientMutationId: 'update', document: { ...initial.document, title: 'First tab' } };
  const updated = first.save(initial.projectId, input);
  assert.throws(() => second.save(initial.projectId, {
    ...input, clientMutationId: 'stale', document: { ...initial.document, title: 'Stale second tab' },
  }), error => error instanceof StaleSaveConflict && error.status === 409 && error.code === 'REVISION_CONFLICT'
    && error.actualRevisionId === updated.revisionId && error.expectedRevisionId === initial.revisionId);
  const latest = second.save(initial.projectId, { ...input, expectedRevisionId: updated.revisionId, clientMutationId: 'latest' });
  assert.equal(first.save(initial.projectId, input).revisionId, updated.revisionId);
  assert.equal(first.get(initial.projectId)!.revisionId, latest.revisionId);
  assert.throws(() => first.save(initial.projectId, { ...input, document: initial.document }), /reused/);
  assert.throws(() => first.save(initial.projectId, { ...input, expectedRevisionId: undefined! }), /identifier/);
  assert.equal(first.database.connection.prepare('SELECT count(*) AS count FROM project_revisions').get()!.count, 3);
});

test('a failure after head advancement rolls back the revision, asset links, head and receipt', t => {
  const repo = repository(t), initial = repo.create({ title: 'Rollback', clientMutationId: 'create' });
  const bytes = Buffer.from('Rollback asset'), digest = createHash('sha256').update(bytes).digest('hex');
  repo.putAsset(bytes, digest, 'text/plain');
  const db = repo.database.connection;
  db.exec(`CREATE TEMP TRIGGER fail_receipt BEFORE INSERT ON mutations
    WHEN NEW.client_mutation_id = 'fail' BEGIN SELECT RAISE(ABORT, 'Injected interruption'); END`);
  const input = { expectedRevisionId: initial.revisionId, clientMutationId: 'fail',
    document: { ...initial.document, assets: [{ id: 'note', path: 'note.txt', mediaType: 'text/plain', sha256: digest }] } };
  assert.throws(() => repo.save(initial.projectId, input), /Injected interruption/);
  assert.deepEqual(repo.get(initial.projectId), initial);
  assert.equal(db.prepare('SELECT count(*) AS count FROM project_revisions').get()!.count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM mutations').get()!.count, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM revision_assets').get()!.count, 0);
  db.exec('DROP TRIGGER fail_receipt');
  assert.notEqual(repo.save(initial.projectId, input).revisionId, initial.revisionId);
  assert.throws(() => db.prepare('UPDATE project_revisions SET ordinal = 99').run(), /Immutable/);
  assert.throws(() => db.prepare('DELETE FROM project_revisions').run(), /Immutable/);
});

test('process exit with uncommitted WAL writes restores the last complete revision', t => {
  const repo = repository(t), initial = repo.create({ title: 'Crash recovery', clientMutationId: 'create' });
  const filename = path.join(repo.database.root, 'library.sqlite');
  repo.close();
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { DatabaseSync } from 'node:sqlite';
    import { statSync } from 'node:fs';
    const db = new DatabaseSync(process.argv[1]);
    db.exec('PRAGMA foreign_keys = ON; PRAGMA synchronous = FULL; PRAGMA cache_size = 1; BEGIN IMMEDIATE');
    db.prepare('INSERT INTO project_revisions SELECT ?, project_id, 2, id, schema_version, document_json || ?, document_sha256, created_at FROM project_revisions WHERE id = ?')
      .run('interrupted-revision', ' '.repeat(65536), process.argv[3]);
    db.prepare('UPDATE projects SET head_revision_id = ? WHERE id = ?').run('interrupted-revision', process.argv[2]);
    // Force dirty pages into the WAL, then bypass connection close and COMMIT.
    db.exec('PRAGMA shrink_memory');
    if (statSync(process.argv[1] + '-wal').size <= 32) process.exit(24);
    process.exit(23);
  `, filename, initial.projectId, initial.revisionId], { encoding: 'utf8', timeout: 10_000 });
  assert.ifError(child.error);
  assert.equal(child.status, 23, child.stderr);
  const reopened = new SqliteProjectRepository(repo.database.root);
  onCleanup(t, () => reopened.close());
  assert.deepEqual(reopened.get(initial.projectId), initial);
  assert.equal(reopened.get(initial.projectId, 'interrupted-revision'), undefined);
  assert.equal(reopened.database.connection.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('asset bytes are verified, deduplicated and retained across revisions and restart', t => {
  const repo = repository(t), initial = repo.create({ title: 'Assets', clientMutationId: 'create' });
  const bytes = Buffer.from('Synthetic asset bytes\n'), digest = createHash('sha256').update(bytes).digest('hex');
  const document = { ...initial.document, assets: [{ id: 'note', path: 'note.txt', mediaType: 'text/plain', sha256: digest }] };
  const input = { expectedRevisionId: initial.revisionId, clientMutationId: 'asset-save', document };
  assert.throws(() => repo.save(initial.projectId, input), /unavailable/);
  assert.throws(() => repo.putAsset(bytes, '0'.repeat(64), 'text/plain'), /Invalid asset/);
  repo.putAsset(bytes, digest, 'text/plain');
  repo.putAsset(bytes, digest, 'text/plain');
  const saved = repo.save(initial.projectId, input);
  repo.save(initial.projectId, { expectedRevisionId: saved.revisionId, clientMutationId: 'remove-from-head', document: initial.document });
  assert.deepEqual(readFileSync(path.join(repo.database.root, 'assets', digest)), bytes);
  assert.equal(repo.database.connection.prepare('SELECT count(*) AS count FROM assets').get()!.count, 1);
  assert.equal(repo.database.connection.prepare('SELECT count(*) AS count FROM revision_assets').get()!.count, 1);
  assert.throws(() => repo.database.connection.exec('DELETE FROM revision_assets'), /Immutable/);
  repo.close();
  const reopened = new SqliteProjectRepository(repo.database.root);
  onCleanup(t, () => reopened.close());
  assert.deepEqual(reopened.get(initial.projectId, saved.revisionId), saved);
});

test('backups include committed WAL content, retain three snapshots and explicitly restore assets to a new root', async t => {
  const base = roots(t), source = path.join(base, 'source');
  const repo = new SqliteProjectRepository(source);
  onCleanup(t, () => repo.close());
  const initial = repo.create({ title: 'Backup', clientMutationId: 'create' });
  const bytes = Buffer.from('Retained in backup recovery'), digest = createHash('sha256').update(bytes).digest('hex');
  repo.putAsset(bytes, digest, 'text/plain');
  const saved = repo.save(initial.projectId, {
    expectedRevisionId: initial.revisionId, clientMutationId: 'save',
    document: { ...initial.document, assets: [{ id: 'backup-note', path: 'note.txt', mediaType: 'text/plain', sha256: digest }] },
  });
  let filename = '';
  for (let i = 0; i < 4; i++) filename = await repo.createBackup();
  assert.equal(readdirSync(path.join(source, 'backups')).filter(name => name.endsWith('.sqlite')).length, 3);
  const snapshot = new DatabaseSync(filename, { readOnly: true });
  assert.equal(snapshot.prepare('SELECT head_revision_id FROM projects').get()!.head_revision_id, saved.revisionId);
  snapshot.close();
  repo.save(initial.projectId, { expectedRevisionId: saved.revisionId, clientMutationId: 'after-backup', document: { ...saved.document, title: 'After backup' } });
  repo.close();
  // Keep the damaged original untouched; recovery reads the selected snapshot.
  writeFileSync(path.join(source, 'library.sqlite'), 'deliberately damaged SQLite');
  const damaged = readFileSync(path.join(source, 'library.sqlite'));
  assert.throws(() => new SqliteProjectRepository(source), RecoveryRequiredError);
  const restored = restoreBackup(source, path.basename(filename), path.join(base, 'restored'));
  onCleanup(t, () => restored.close());
  assert.deepEqual(restored.get(initial.projectId), saved);
  assert.deepEqual(readFileSync(path.join(restored.database.root, 'assets', digest)), bytes);
  assert.deepEqual(readFileSync(path.join(source, 'library.sqlite')), damaged);
  assert.throws(() => restoreBackup(source, path.basename(filename), restored.database.root), /new, absent/);
  assert.throws(() => restoreBackup(source, '../library.sqlite', path.join(base, 'invalid')), RecoveryRequiredError);
});

test('startup refuses unknown schemas, zero-length files, broken heads and tampered content without resetting', t => {
  const base = roots(t);
  for (const kind of ['unknown-schema', 'empty-file', 'broken-head', 'tampered-json', 'missing-asset']) {
    const root = path.join(base, kind), repo = new SqliteProjectRepository(root);
    const initial = repo.create({ title: 'Do not reset', clientMutationId: 'create' });
    if (kind === 'missing-asset') {
      const bytes = Buffer.from('Required asset'), digest = createHash('sha256').update(bytes).digest('hex');
      repo.putAsset(bytes, digest, 'text/plain');
      repo.save(initial.projectId, { expectedRevisionId: initial.revisionId, clientMutationId: 'asset',
        document: { ...initial.document, assets: [{ id: 'note', path: 'note.txt', mediaType: 'text/plain', sha256: digest }] } });
      repo.close();
      rmSync(path.join(root, 'assets', digest));
    } else {
      const db = repo.database.connection;
      if (kind === 'unknown-schema') db.exec('PRAGMA user_version = 99');
      if (kind === 'broken-head') {
        db.exec('PRAGMA foreign_keys = OFF');
        db.prepare('UPDATE projects SET head_revision_id = ?').run('absent-revision');
      }
      if (kind === 'tampered-json') {
        db.exec('DROP TRIGGER immutable_project_revisions_UPDATE');
        db.prepare('UPDATE project_revisions SET document_json = ?').run('{}');
      }
      repo.close();
      if (kind === 'empty-file') writeFileSync(path.join(root, 'library.sqlite'), '');
    }
    const filename = path.join(root, 'library.sqlite'), previous = readFileSync(filename);
    assert.throws(() => new SqliteProjectRepository(root), RecoveryRequiredError, kind);
    assert.deepEqual(readFileSync(filename), previous, kind);
  }
});

test('backup validation failure preserves snapshots and stops writes until verified reopen', async t => {
  const repo = repository(t), initial = repo.create({ title: 'Backup failure', clientMutationId: 'create' });
  const backup = await repo.createBackup();
  const db = repo.database.connection;
  db.exec('PRAGMA user_version = 99');
  await assert.rejects(repo.createBackup(), RecoveryRequiredError);
  assert.equal(existsSync(backup), true);
  assert.equal(repo.ready(), false);
  assert.throws(() => repo.save(initial.projectId, { expectedRevisionId: initial.revisionId, clientMutationId: 'blocked', document: initial.document }), /not ready/);
  // This injected version change is reversed by the test, never by recovery code.
  db.exec('PRAGMA user_version = 1');
  repo.close();
  const reopened = new SqliteProjectRepository(repo.database.root);
  onCleanup(t, () => reopened.close());
  assert.deepEqual(reopened.get(initial.projectId), initial);
});

test('the existing HTTP adapter returns saved revisions and a typed redacted conflict', async t => {
  const repo = repository(t), token = 'd'.repeat(64);
  const server = createService({ repository: repo, sessionToken: token });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  onCleanup(t, () => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (target: string, method = 'GET', body?: unknown) => fetch(origin + target, {
    method, headers: { authorization: `Bearer ${token}`, origin, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal((await request('/api/health')).status, 200);
  const created = await request('/api/projects', 'POST', { title: 'HTTP project', clientMutationId: 'create' });
  assert.equal(created.status, 201);
  const initial = await created.json();
  const input = { expectedRevisionId: initial.revisionId, clientMutationId: 'save', document: { ...initial.document, title: 'HTTP saved' } };
  const saved = await request(`/api/projects/${initial.projectId}`, 'PUT', input);
  assert.equal(saved.status, 200);
  const conflict = await request(`/api/projects/${initial.projectId}`, 'PUT', { ...input, clientMutationId: 'stale' });
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { code: 'REVISION_CONFLICT', message: 'The saved head has changed.', details: {}, retryable: false });
  const savedEnvelope = await saved.json();
  assert.deepEqual(await (await request(`/api/projects/${initial.projectId}`)).json(), savedEnvelope);
  await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
  repo.close();
  const reopened = new SqliteProjectRepository(repo.database.root);
  onCleanup(t, () => reopened.close());
  const restarted = createService({ repository: reopened, sessionToken: token });
  await new Promise<void>(resolve => restarted.listen(0, '127.0.0.1', resolve));
  onCleanup(t, () => new Promise<void>(resolve => { restarted.close(() => resolve()); restarted.closeAllConnections(); }));
  const response = await fetch(`http://127.0.0.1:${(restarted.address() as AddressInfo).port}/api/projects/${initial.projectId}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), savedEnvelope);
});
