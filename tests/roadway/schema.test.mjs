import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseProject } from '../../packages/project-schema/src/validation.ts';

const base = JSON.parse(readFileSync(new URL('../fixtures/synthetic-story/project.json', import.meta.url), 'utf8'));
const unknown = () => ({ status: 'unknown' });
const assumed = () => ({ status: 'assumed', value: 10, unit: 'ft', meters: 3.048, rationale: 'Synthetic concept' });
const band = (id, kind, direction, location = 'between-curbs', width = unknown()) => ({ id, kind, direction, location, width, locked: false });
const section = (role, bands) => ({ role, curbToCurb: unknown(), envelope: { kind: 'unknown', width: unknown() }, bands, ...(role === 'proposed' ? { proposalDescription: 'Fictional author concept' } : {}) });
const fixture = () => {
  const p = structuredClone(base);
  p.roadways = [{ id: 'road', title: 'Synthetic corridor', corridorFeatureRevisionId: 'line-revision', stationOrigin: 'start', stationDirection: 'toward end', stationExtentMeters: 100, sourceIds: [], segments: [{ id: 'segment', name: 'Example', startMeters: 0, endMeters: 100,
    existing: section('existing', [band('walk-l', 'sidewalk', 'none', 'outside-curbs'), ...[1,2,3,4].map(n => band(`lane-${n}`, 'through-lane', n < 3 ? 'reverse' : 'forward')), band('walk-r', 'sidewalk', 'none', 'outside-curbs')]),
    proposed: section('proposed', [band('walk-l', 'sidewalk', 'none', 'outside-curbs'), band('bike-l', 'bike-lane', 'reverse', 'between-curbs', assumed()), band('buffer-l', 'buffer', 'none'), band('lane-l', 'through-lane', 'reverse'), band('turn', 'center-turn-lane', 'both'), band('lane-r', 'through-lane', 'forward'), band('buffer-r', 'buffer', 'none'), band('bike-r', 'bike-lane', 'forward'), band('walk-r', 'sidewalk', 'none', 'outside-curbs')]) }] }];
  return p;
};
const rejects = (name, mutate) => test(name, () => { const p = fixture(); mutate(p.roadways[0], p); assert.throws(() => parseProject(p), /Invalid project/); });
test('synthetic existing and proposed arrangements retain unknown and assumed widths', () => { const p = fixture(); assert.deepEqual(parseProject(p), p); });
test('documented and estimated widths retain evidence', () => { const p = fixture(); const s = p.roadways[0].segments[0]; const evidence = { value: 3, unit: 'm', meters: 3, sourceIds: ['fictional-drawing'], date: '2026-01-01', location: 'fictional', method: 'drawing', uncertainty: 'illustrative' }; s.existing.bands[1].width = { status: 'documented', ...evidence }; s.existing.bands[2].width = { status: 'estimated', ...evidence }; assert.doesNotThrow(() => parseProject(p)); });
for (const value of [-1, 0, Infinity, NaN]) rejects(`invalid width ${value}`, r => { r.segments[0].proposed.bands[1].width.value = value; });
rejects('inconsistent unit conversion', r => { r.segments[0].proposed.bands[1].width.meters = 10; });
rejects('unknown width cannot assert a value', r => { r.segments[0].existing.bands[1].width.value = 3; });
rejects('missing provenance', r => { r.segments[0].existing.bands[1].width = { status: 'documented', value: 3, unit: 'm', meters: 3, sourceIds: [], date: 'date', location: 'place', method: 'method', uncertainty: 'unknown' }; });
rejects('missing source reference', r => { r.sourceIds = ['missing']; });
rejects('overlapping segments', r => { const s = structuredClone(r.segments[0]); s.id = 'second'; s.startMeters = 90; r.segments.push(s); });
rejects('segment past extent', r => { r.segments[0].endMeters = 101; });
rejects('reversed segment', r => { r.segments[0].startMeters = 100; });
rejects('outside bands cannot interrupt pavement', r => { r.segments[0].proposed.bands[3].location = 'outside-curbs'; });
rejects('right of way needs documented evidence', r => { r.segments[0].existing.envelope = { kind: 'right-of-way', width: assumed() }; });
rejects('turn lane requires both directions', r => { r.segments[0].proposed.bands[4].direction = 'forward'; });

