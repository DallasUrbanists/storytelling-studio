import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseProject } from '../../packages/project-schema/src/validation.ts';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/synthetic-story/project.json', import.meta.url), 'utf8'));
const hash = 'a'.repeat(64);
function project() {
  const p = structuredClone(fixture);
  p.sources.push({ id: 'table', title: 'Synthetic table', sourceKind: 'dataset', publisher: 'Synthetic', version: '1', referencePeriod: 'example', boundaryVintage: null, contentSha256: hash, universe: 'people', rights: { localUse: 'unknown', publication: 'unknown', redistribution: 'unknown' } });
  const inputs = { featureRevisionId: p.featureRevisions[0].id, geometrySha256: p.featureRevisions[0].geometrySha256, sourceInputs: [{ sourceId: 'table', contentSha256: hash, version: '1', referencePeriod: 'example', boundaryVintage: null }], methodId: 'example', methodVersion: 1, parameters: { weight: 1 } };
  const result = { kind: 'estimate', value: 12, universe: 'people', note: 'Synthetic estimate' };
  p.researchSnapshots = [{ id: 'snapshot', inputs, result, status: 'approved', reviews: [{ reviewer: 'Reviewer', reviewedAt: '2026-11-13T00:00:00Z', decision: 'approved', inputs: structuredClone(inputs), result: structuredClone(result) }] }];
  return p;
}
const rejects = (name, mutate) => test(name, () => { const p = project(); mutate(p); assert.throws(() => parseProject(p), /Invalid project/); });
test('approval preserves an estimate and unknown rights', () => { const p = parseProject(project()); assert.equal(p.researchSnapshots[0].result.kind, 'estimate'); assert.equal(p.sources.at(-1).rights.publication, 'unknown'); });
rejects('missing source', p => { p.researchSnapshots[0].inputs.sourceInputs[0].sourceId = 'missing'; });
rejects('missing vintage for approval', p => { p.sources.at(-1).referencePeriod = null; p.researchSnapshots[0].inputs.sourceInputs[0].referencePeriod = null; });
rejects('changed parameters do not retain approval', p => { p.researchSnapshots[0].inputs.parameters.weight = 2; });
rejects('changed source hash does not retain approval', p => { p.sources.at(-1).contentSha256 = 'b'.repeat(64); p.researchSnapshots[0].inputs.sourceInputs[0].contentSha256 = 'b'.repeat(64); });
rejects('changed result does not retain approval', p => { p.researchSnapshots[0].result.value = 13; });
rejects('missing reviewer', p => { p.researchSnapshots[0].reviews = []; });
test('unresolved and stale records remain readable', () => { const p = project(); const s = p.researchSnapshots[0]; p.sources.at(-1).referencePeriod = null; s.inputs.sourceInputs[0].referencePeriod = null; s.status = 'stale'; assert.doesNotThrow(() => parseProject(p)); s.status = 'unavailable'; s.result = { kind: 'unavailable', value: null, universe: null, note: 'No data' }; assert.doesNotThrow(() => parseProject(p)); });
test('every review validates its input and result shapes regardless of snapshot status or decision', () => {
  const mutations = [
    r => { r.inputs = { featureRevisionId: 'missing' }; },
    r => { r.inputs.geometrySha256 = 'bad'; },
    r => { delete r.inputs.methodVersion; },
    r => { r.inputs.sourceInputs[0].version = 5; },
    r => { r.inputs.sourceInputs.push(structuredClone(r.inputs.sourceInputs[0])); },
    r => { r.inputs.extra = true; },
    r => { r.result = { kind: 'made-up' }; },
    r => { delete r.result.value; },
    r => { r.result.kind = 'unavailable'; },
    r => { r.result.extra = true; },
  ];
  for (const status of ['draft', 'stale', 'approved', 'unavailable']) {
    for (const decision of ['approved', 'rejected', 'reviewed']) {
      for (const mutate of mutations) {
        const p = project(); const snapshot = p.researchSnapshots[0];
        snapshot.status = status;
        if (status === 'unavailable') snapshot.result = { kind: 'unavailable', value: null, universe: null, note: 'No data' };
        const invalid = structuredClone(snapshot.reviews[0]); invalid.decision = decision; mutate(invalid);
        snapshot.reviews.push(invalid);
        assert.throws(() => parseProject(p), /Invalid project/, `${status} ${decision}`);
      }
    }
  }
});
test('historical review copies may differ from current records', () => {
  const p = project(); const snapshot = p.researchSnapshots[0]; snapshot.status = 'stale';
  const review = snapshot.reviews[0];
  review.inputs.featureRevisionId = 'old-revision'; review.inputs.geometrySha256 = 'b'.repeat(64);
  review.inputs.sourceInputs[0].sourceId = 'old-source'; review.inputs.sourceInputs[0].version = 'old';
  review.inputs.parameters.weight = 2; review.result.value = 13;
  assert.doesNotThrow(() => parseProject(p));
  snapshot.status = 'approved'; assert.throws(() => parseProject(p), /Invalid project/);
});
