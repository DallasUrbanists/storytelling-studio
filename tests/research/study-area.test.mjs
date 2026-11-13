import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { methodHash, reopenResearchRequest, selectStudyArea, saveResearchRequest, loadResearchRequest } from '../../apps/local-service/src/routes/research.ts';

const area = { kind: 'synthetic', featureRevisionId: 'area-1', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } };
const method = { id: 'synthetic-method', version: 1, parameters: { weight: 1 } };
const hash = methodHash(method);
const select = (a = area, prior) => selectStudyArea(a, 'project-1', 'Synthetic fixture', method, hash, prior);

test('records exact canonical geometry and method hashes and reopens the request', () => {
  const request = select();
  const expected = text => createHash('sha256').update(text).digest('hex');
  assert.equal(request.geometrySha256, expected('{"coordinates":[[[0,0],[1,0],[1,1],[0,0]]],"type":"Polygon"}'));
  assert.equal(request.methodSha256, expected('{"id":"synthetic-method","parameters":{"weight":1},"version":1}'));
  request.derivedInputs.push({ value: 3 });
  assert.deepEqual(reopenResearchRequest(JSON.parse(JSON.stringify(request)), method, hash), request);
  area.geometry.coordinates[0][1][0] = 2;
  assert.equal(request.area.geometry.coordinates[0][1][0], 1);
  area.geometry.coordinates[0][1][0] = 1;
});
test('changing area identity or geometry clears derived inputs', () => {
  const prior = select(); prior.derivedInputs.push({ value: 3 });
  assert.deepEqual(select({ ...area, featureRevisionId: 'area-2' }, prior).derivedInputs, []);
  const changed = structuredClone(area); changed.geometry.coordinates[0][1][0] = 2;
  assert.deepEqual(select(changed, prior).derivedInputs, []);
  assert.deepEqual(select(area, prior).derivedInputs, prior.derivedInputs);
  assert.deepEqual(selectStudyArea(area, 'project-2', 'Synthetic fixture', method, hash, prior).derivedInputs, []);
  const changedMethod = { ...method, version: 2 };
  assert.deepEqual(selectStudyArea(area, 'project-1', 'Synthetic fixture', changedMethod, methodHash(changedMethod), prior).derivedInputs, []);
});
test('missing or stale methods and tampered saved requests fail closed', () => {
  assert.throws(() => selectStudyArea(area, 'p', 'reason', null, hash));
  assert.throws(() => selectStudyArea(area, 'p', 'reason', method, ''));
  const saved = select();
  assert.throws(() => reopenResearchRequest(saved, { ...method, version: 2 }, hash));
  saved.area.geometry.coordinates[0][1][0] = 3;
  assert.throws(() => reopenResearchRequest(saved, method, hash));
  assert.throws(() => select({ ...area, kind: 'walkshed' }));
});
test('rejects values that cannot be preserved exactly in JSON', () => {
  const sparse = structuredClone(area);
  delete sparse.geometry.coordinates[0][1];
  assert.throws(() => select(sparse));
  assert.throws(() => methodHash({ ...method, parameters: { value: new Date() } }));
  assert.throws(() => methodHash({ ...method, parameters: { value: undefined } }));
});
test('saved requests reopen without overwriting an earlier revision', async () => {
  const directory = await mkdtemp('tests/research/study-area-');
  const path = `${directory}/request.json`;
  try {
    const request = select();
    request.derivedInputs.push({ nested: [3, { value: null }] });
    await saveResearchRequest(path, request, method, hash);
    assert.deepEqual(await loadResearchRequest(path, method, hash), request);
    await assert.rejects(saveResearchRequest(path, request, method, hash));
    await assert.rejects(loadResearchRequest(path, { ...method, version: 2 }, hash));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('rejects non-JSON derived inputs before writing a revision', async () => {
  const directory = await mkdtemp('tests/research/study-area-');
  const path = `${directory}/request.json`;
  try {
    for (const value of [NaN, Infinity, -Infinity, undefined, new Date()]) {
      const request = select();
      request.derivedInputs.push({ nested: [{ value }] });
      assert.throws(() => reopenResearchRequest(request, method, hash));
      await assert.rejects(saveResearchRequest(path, request, method, hash));
      await assert.rejects(readFile(path), { code: 'ENOENT' });
    }
    const request = select();
    request.derivedInputs.length = 1;
    await assert.rejects(saveResearchRequest(path, request, method, hash));
    await assert.rejects(readFile(path), { code: 'ENOENT' });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

