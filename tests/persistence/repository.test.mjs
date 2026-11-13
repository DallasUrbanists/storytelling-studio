import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SqliteProjectRepository } from '../../apps/local-service/src/db/project-repository.ts';
import { exportGstory, importGstory, packagePath, readZip } from '../../apps/local-service/src/packaging/gstory.ts';

test('committed projects survive restart; stale tabs and reused retry IDs cannot overwrite them', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'gstory-revisions-'));
  let repo = new SqliteProjectRepository(directory);
  const first = repo.create({ title: 'My story', clientMutationId: 'create-1' });
  assert.deepEqual(repo.create({ title: 'My story', clientMutationId: 'create-1' }), first);
  const document = structuredClone(first.document); document.title = 'Edited story';
  const input = { expectedRevisionId: first.revisionId, clientMutationId: 'save-1', document };
  const second = repo.save(first.projectId, input);
  assert.deepEqual(repo.save(first.projectId, input), second);
  assert.throws(() => repo.save(first.projectId, { ...input, clientMutationId: 'save-2' }), /newer version/);
  assert.throws(() => repo.save(first.projectId, { ...input, document: { ...document, title: 'Ambiguous retry' } }), /retry identifier/);
  repo.close(); repo = new SqliteProjectRepository(directory);
  assert.equal(repo.get(first.projectId).document.title, 'Edited story');
  assert.equal(repo.get(first.projectId, first.revisionId).document.title, 'My story');
  assert.equal(repo.get('wrong-project', first.revisionId), undefined); repo.close();
});

test('portable archive imports to a fresh database with a new identity and intact permitted bytes', () => {
  const source = new SqliteProjectRepository(mkdtempSync(path.join(tmpdir(), 'gstory-package-')));
  const saved = source.create({ title: 'Portable story', clientMutationId: 'create' });
  const bytes = exportGstory(saved.document, saved.revisionId, hash => source.getAsset(hash));
  const imported = importGstory(bytes);
  const destination = new SqliteProjectRepository(mkdtempSync(path.join(tmpdir(), 'gstory-destination-')));
  const result = destination.import(imported.document, imported.assets, 'import-1');
  assert.notEqual(result.projectId, saved.projectId);
  assert.deepEqual(result.document.scenes, saved.document.scenes);
  assert.equal(result.document.importedFrom.projectId, saved.projectId);
  for (const asset of result.document.assets) assert.deepEqual(destination.getAsset(asset.sha256), source.getAsset(asset.sha256));
  const corrupt = Buffer.from(bytes); corrupt[80] ^= 1; assert.throws(() => importGstory(corrupt));
  assert.equal(destination.list().length, 1);
  const again = exportGstory(result.document, result.revisionId, hash => destination.getAsset(hash));
  assert.deepEqual(importGstory(again).document.scenes, saved.document.scenes);
  source.close(); destination.close();
});

test('references retain unavailable assets; unsafe names and inconsistent directories fail before import', () => {
  for (const name of ['../project.json','C:/x','a\\b','/x','nul.txt','a./b','a:stream','a//b','e\u0301.txt']) assert.throws(() => packagePath(name));
  const repo = new SqliteProjectRepository(mkdtempSync(path.join(tmpdir(), 'gstory-missing-')));
  const saved = repo.create({ title: 'Reference story', clientMutationId: 'create' });
  saved.document.assets[0].permission.redistribution = false;
  assert.throws(() => exportGstory(saved.document, saved.revisionId, hash => repo.getAsset(hash)), /Portable export/);
  const archive = exportGstory(saved.document, saved.revisionId, hash => repo.getAsset(hash), 'references');
  const imported = importGstory(archive);
  assert.equal(imported.omittedAssets.length, 1);
  assert.equal(imported.document.assets.length, saved.document.assets.length);
  const bad = Buffer.from(archive); bad.writeUInt32LE(0xffffffff, bad.length - 10);
  assert.throws(() => readZip(bad)); repo.close();
});
