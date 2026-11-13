import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseProject } from '../../packages/project-schema/src/validation.ts';
const directory = new URL('../fixtures/synthetic-story/', import.meta.url);
const fixture = JSON.parse(readFileSync(new URL('project.json', directory), 'utf8'));
const clone = () => structuredClone(fixture);
const rejects = (name, mutate) => test(name, () => { const value = clone(); mutate(value); assert.throws(() => parseProject(value), /Invalid project/); });
test('synthetic bridge fixture and local bytes', () => {
  const p = parseProject(fixture); assert.equal(p.fps, 30); assert.equal(p.scenes.reduce((n, s) => n + s.durationFrames, 0), 300);
  assert.deepEqual(Object.keys(p.outputVariants).sort(), ['landscape', 'portrait']);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const canonical = x => JSON.stringify(x, function (k, v) { return v && !Array.isArray(v) && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v; });
  for (const asset of p.assets) assert.equal(hash(readFileSync(new URL(asset.path, directory))), asset.sha256);
  for (const revision of p.featureRevisions) assert.equal(hash(canonical(revision.geometry)), revision.geometrySha256);
});
rejects('unsupported schema version', p => { p.schemaVersion = 2; });
rejects('malformed ID', p => { p.features[0].id = '../bad'; });
rejects('duplicate ID', p => { p.features[1].id = p.features[0].id; });
rejects('nonfinite number', p => { p.scenes[0].cameraTrack[0].zoom = Infinity; });
rejects('missing revision reference', p => { p.layers[0].featureRevisionId = 'missing'; });
rejects('missing source reference', p => { p.featureRevisions[0].sourceIds = ['missing']; });
rejects('revision ownership', p => { p.features[0].currentRevisionId = p.features[1].currentRevisionId; });
rejects('fractional scene duration', p => { p.scenes[0].durationFrames = 299.5; });
rejects('camera beyond scene', p => { p.scenes[0].cameraTrack[1].frame = 300; });
rejects('negative layer start', p => { p.layers[0].startFrame = -1; });
rejects('layer end beyond project', p => { p.layers[0].endFrameExclusive = 301; });
rejects('fractional annotation frame', p => { p.scenes[0].annotations[0].fadeInEndFrame = 60.5; });
rejects('trace outside layer', p => { p.layers[1].trace.endFrameExclusive = 301; });
rejects('unclosed polygon', p => { p.featureRevisions[2].geometry.coordinates[0].pop(); });
rejects('absolute asset path', p => { p.assets[0].path = 'C:/private.txt'; });

rejects('unsupported scene variant override', p => { p.scenes[0].variantOverrides = { portrait: { labels: ['missing'] } }; });
rejects('unsupported annotation variant override', p => { p.scenes[0].annotations[0].variantOverrides = { portrait: { offset: [1, 2] } }; });
rejects('unknown feature field', p => { p.features[0].variantOverrides = {}; });
rejects('unknown geometry field', p => { p.featureRevisions[0].geometry.crs = 'unsupported'; });
rejects('unknown root field', p => { p.requiredCapabilities = ['unsupported']; });

test('optional dimming and leader fields retain the older bridge contract', () => {
  const p = clone();
  delete p.scenes[0].outsideDimming;
  delete p.scenes[0].annotations[1].leaderLine;
  assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p))), p);
});
test('dim opacity endpoints and signed screen offsets are valid', () => {
  for (const opacity of [0, 1]) {
    const p = clone();
    p.scenes[0].outsideDimming.opacity = opacity;
    p.scenes[0].annotations[1].leaderLine.offset = [-100, 70];
    assert.deepEqual(parseProject(p), p);
  }
});
for (const opacity of [-0.1, 1.1, NaN, Infinity, '0.5', null]) {
  rejects(`invalid dim opacity ${opacity}`, p => { p.scenes[0].outsideDimming.opacity = opacity; });
}
for (const featureRevisionId of ['missing', 'point-revision', 'line-revision']) {
  rejects(`dim requires a polygon revision: ${featureRevisionId}`, p => {
    p.scenes[0].outsideDimming.featureRevisionId = featureRevisionId;
  });
}
rejects('unsupported dim field', p => { p.scenes[0].outsideDimming.color = 'red'; });
for (const offset of [[], [1], [10, 20, 30], [NaN, 10], [10, Infinity], ['10', 20], [0, 0], [0, 7], null]) {
  rejects(`invalid leader offset ${offset}`, p => { p.scenes[0].annotations[1].leaderLine.offset = offset; });
}
rejects('unsupported leader field', p => { p.scenes[0].annotations[1].leaderLine.width = 5; });
rejects('null dim', p => { p.scenes[0].outsideDimming = null; });
rejects('null leader', p => { p.scenes[0].annotations[1].leaderLine = null; });
