import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseProject } from '../../packages/project-schema/src/validation.ts';
import { evaluateRoadwayStation, validateRoadwaySegments } from '../../packages/story-core/src/roadway.ts';

const base = JSON.parse(readFileSync(new URL('../fixtures/synthetic-story/project.json', import.meta.url), 'utf8'));
const dimension = meters => ({ status: 'documented', value: meters, unit: 'm', meters,
  sourceIds: ['fictional-drawing'], date: '2026-01-01', location: 'Synthetic block',
  method: 'Invented arithmetic test', uncertainty: 'No real-world claim' });
const band = (id, width, kind = 'through-lane', location = 'between-curbs') => ({
  id, kind, location, direction: kind === 'sidewalk' ? 'none' : 'forward',
  width: dimension(width), locked: false,
});
const section = (role, wide = false) => ({
  role, curbToCurb: dimension(wide ? 9 : 6),
  envelope: { kind: 'illustrated', width: dimension(wide ? 13 : 10) },
  bands: [band('left-walk', 2, 'sidewalk', 'outside-curbs'),
    band('lane-a', 3), band('lane-b', 3), ...(wide ? [band('bike', 3, 'bike-lane')] : []),
    band('right-walk', 2, 'sidewalk', 'outside-curbs')],
  ...(role === 'proposed' ? { proposalDescription: 'Synthetic author concept' } : {}),
});
const fixture = () => ({
  id: 'road', title: 'Synthetic varying road', corridorFeatureRevisionId: 'line-revision',
  stationOrigin: 'Saved line start', stationDirection: 'Toward saved line end',
  stationExtentMeters: 100, sourceIds: ['fictional-drawing'],
  layouts: ['existing', 'proposed'].flatMap(role => [
    { id: `${role}-narrow`, section: section(role) },
    { id: `${role}-wide`, section: section(role, true) },
  ]),
  segments: [
    { id: 'first', name: 'Narrow block', startMeters: 0, endMeters: 40,
      existing: { layoutId: 'existing-narrow' }, proposed: { layoutId: 'proposed-narrow' } },
    { id: 'second', name: 'Wider bicycle block', startMeters: 40, endMeters: 100,
      existing: { layoutId: 'existing-wide' }, proposed: { layoutId: 'proposed-wide' } },
  ],
});
const parseRoad = road => parseProject({ ...structuredClone(base), roadways: [road] }).roadways[0];
const has = (result, code) => result.diagnostics.some(d => d.code === code);
const transitionFixture = () => {
  const road = fixture();
  road.segments = [{ ...road.segments[0], endMeters: 100,
    name: 'Named width transfer', transition: {
      existingLayoutId: 'existing-end', proposedLayoutId: 'proposed-end',
    } }];
  for (const role of ['existing', 'proposed']) {
    const end = section(role);
    end.bands[1].width = dimension(2);
    end.bands[2].width = dimension(4);
    end.bands[1].id = 'end-lane-a';
    end.bands[2].id = 'end-lane-b';
    road.layouts.push({ id: `${role}-end`, section: end });
  }
  return road;
};

test('adjacent distinct layouts conserve independent documented envelopes in both roles', () => {
  const road = parseRoad(fixture());
  assert.deepEqual(validateRoadwaySegments(road), { status: 'valid', diagnostics: [], gaps: [] });
  for (const role of ['existing', 'proposed']) {
    const a = evaluateRoadwayStation(road, 20, role);
    const b = evaluateRoadwayStation(road, 70, role);
    assert.equal(a.status, 'specified'); assert.equal(b.status, 'specified');
    assert.deepEqual([a.curbToCurbMeters, b.curbToCurbMeters], [6, 9]);
    assert.deepEqual([a.envelopeMeters, b.envelopeMeters], [10, 13]);
    assert.deepEqual([a.bands.length, b.bands.length], [4, 5]);
    for (const result of [a, b]) {
      assert.equal(result.bands.reduce((n, band) => n + band.widthMeters, 0), result.envelopeMeters);
      assert.equal(result.bands.filter(b => b.location === 'between-curbs')
        .reduce((n, band) => n + band.widthMeters, 0), result.curbToCurbMeters);
      assert.equal(result.startSection.curbToCurb.status, 'documented');
      assert.deepEqual(result.startSection.curbToCurb.sourceIds, ['fictional-drawing']);
    }
  }
});

test('start, shared boundary, and final endpoint have exact single ownership', () => {
  const road = fixture();
  for (const [station, segment, atStart] of [[0, 'first', true], [40 - 1e-10, 'first', false],
    [40, 'second', true], [40 + 1e-10, 'second', false], [100, 'second', false]]) {
    const result = evaluateRoadwayStation(road, station, 'existing');
    assert.equal(result.segmentId, segment); assert.equal(result.atSegmentStart, atStart);
  }
  for (const station of [-1, 100 + 1e-10, NaN, Infinity, -Infinity]) {
    assert.equal(evaluateRoadwayStation(road, station, 'existing').status, 'outside');
  }
});

test('leading, interior, trailing, and completely empty ranges remain unspecified', () => {
  const road = fixture();
  road.segments[0].startMeters = 10;
  road.segments[0].endMeters = 30;
  road.segments[1].startMeters = 50;
  road.segments[1].endMeters = 90;
  const gaps = [{ startMeters: 0, endMeters: 10 }, { startMeters: 30, endMeters: 50 },
    { startMeters: 90, endMeters: 100 }];
  assert.deepEqual(validateRoadwaySegments(parseRoad(road)).gaps, gaps);
  for (const [station, gapIndex] of [[0, 0], [9, 0], [30, 1], [49, 1], [90, 2], [100, 2]]) {
    const result = evaluateRoadwayStation(road, station, 'existing');
    assert.equal(result.status, 'unspecified'); assert.deepEqual(result.gap, gaps[gapIndex]);
  }
  for (const station of [10, 50]) assert.equal(evaluateRoadwayStation(road, station, 'existing').status, 'specified');
  road.segments = [];
  assert.equal(evaluateRoadwayStation(parseRoad(road), 100, 'existing').status, 'unspecified');
});

const rangeCases = [
  ['overlap', r => { r.segments[1].startMeters = 39; }, 'overlap-or-order'],
  ['unordered', r => { r.segments.reverse(); }, 'overlap-or-order'],
  ['reversed', r => { r.segments[0].startMeters = 41; }, 'invalid-range'],
  ['zero length', r => { r.segments[0].endMeters = 0; }, 'invalid-range'],
  ['negative', r => { r.segments[0].startMeters = -1; }, 'invalid-range'],
  ['past extent', r => { r.segments[1].endMeters = 101; }, 'invalid-range'],
  ['nonfinite', r => { r.segments[0].endMeters = Infinity; }, 'invalid-range'],
  ['invalid extent', r => { r.stationExtentMeters = NaN; }, 'invalid-extent'],
  ['duplicate segment', r => { r.segments[1].id = 'first'; }, 'duplicate-id'],
  ['duplicate layout', r => { r.layouts.push(structuredClone(r.layouts[0])); }, 'duplicate-id'],
  ['missing layout', r => { r.segments[0].existing.layoutId = 'missing'; }, 'missing-layout'],
  ['wrong role', r => { r.segments[0].existing.layoutId = 'proposed-narrow'; }, 'layout-role'],
];
for (const [name, mutate, code] of rangeCases) test(`parser and evaluator reject ${name}`, () => {
  const road = fixture(); mutate(road);
  assert.throws(() => parseRoad(road), /Invalid project/);
  assert.ok(has(validateRoadwaySegments(road), code));
  assert.equal(evaluateRoadwayStation(road, 20, 'existing').status, 'invalid');
});

test('inline layouts remain compatible and retain dimensions through JSON round trip', () => {
  const road = fixture(); delete road.layouts;
  for (const segment of road.segments) for (const role of ['existing', 'proposed']) {
    segment[role] = section(role, segment.id === 'second');
  }
  const saved = parseRoad(JSON.parse(JSON.stringify(road)));
  assert.deepEqual(saved, road);
  assert.equal(evaluateRoadwayStation(saved, 40, 'proposed').startLayoutId, null);
  assert.equal(evaluateRoadwayStation(saved, 40, 'proposed').curbToCurbMeters, 9);
});

test('references round trip and reject hybrid inline data, unknown fields and invalid library evidence', () => {
  const road = fixture();
  assert.deepEqual(parseRoad(JSON.parse(JSON.stringify(road))), road);
  road.segments[0].existing = { ...section('existing'), layoutId: 'existing-narrow' };
  assert.throws(() => parseRoad(road), /unsupported field/);
  const other = fixture(); other.layouts[0].section.bands[0].width.sourceIds = ['missing'];
  assert.throws(() => parseRoad(other), /missing reference/);
  const unused = fixture(); unused.layouts[0].extra = true;
  assert.throws(() => parseRoad(unused), /unsupported field/);
});

test('per-segment constraints retain band, role, endpoint and signed residual', () => {
  const road = fixture();
  road.layouts.find(l => l.id === 'proposed-wide').section.bands[1].width = dimension(4);
  assert.doesNotThrow(() => parseRoad(road)); // Drafts may persist infeasible dimensions.
  const result = validateRoadwaySegments(road);
  assert.equal(result.diagnostics.length, 1);
  const diagnostic = result.diagnostics[0];
  assert.deepEqual([diagnostic.segmentId, diagnostic.role, diagnostic.endpoint], ['second', 'proposed', 'start']);
  assert.ok(diagnostic.widthDiagnostics.some(d => d.code === 'overallocated' &&
    d.constraint === 'pavement' && d.residualMeters === -1 && d.bandIds.includes('lane-a')));
  assert.equal(evaluateRoadwayStation(road, 10, 'existing').status, 'invalid');
});

for (const [name, mutate, code] of [
  ['unknown curb', s => { s.curbToCurb = { status: 'unknown' }; }, 'unknown-width'],
  ['unknown band', s => { s.bands[1].width = { status: 'unknown' }; }, 'unknown-width'],
  ['unassigned pavement', s => { s.curbToCurb = dimension(7); }, 'unassigned'],
  ['envelope mismatch', s => { s.envelope.width = dimension(11); }, 'unassigned'],
  ['locked overallocation', s => { s.bands[1].locked = true; s.bands[1].width = dimension(7); }, 'locked-overallocation'],
]) test(`segment width failure: ${name}`, () => {
  const road = fixture(); mutate(road.layouts[0].section);
  assert.ok(validateRoadwaySegments(road).diagnostics.some(d =>
    d.segmentId === 'first' && d.widthDiagnostics?.some(w => w.code === code)));
});

test('optional unknown envelopes stay unknown instead of becoming a corridor total', () => {
  const road = fixture();
  for (const layout of road.layouts) layout.section.envelope = { kind: 'unknown', width: { status: 'unknown' } };
  assert.equal(evaluateRoadwayStation(parseRoad(road), 40, 'existing').envelopeMeters, null);
});

test('named longitudinal transition evaluates exact endpoints, conservation, and detached evidence', () => {
  const road = parseRoad(transitionFixture());
  assert.equal(validateRoadwaySegments(road).status, 'valid');
  const original = structuredClone(road);
  for (const role of ['existing', 'proposed']) for (const station of [100, 0, 50, 20, 99, 1, 75, 50]) {
    const result = evaluateRoadwayStation(road, station, role);
    const p = station / 100;
    assert.equal(result.status, 'specified'); assert.equal(result.progress, p);
    assert.equal(result.transition, true); assert.equal(result.segmentName, 'Named width transfer');
    assert.equal(result.startLayoutId, `${role}-narrow`); assert.equal(result.endLayoutId, `${role}-end`);
    assert.equal(result.bands[1].endBandId, 'end-lane-a');
    assert.ok(Math.abs(result.bands[1].widthMeters - (3 - p)) < 1e-12);
    assert.ok(Math.abs(result.bands[2].widthMeters - (3 + p)) < 1e-12);
    assert.ok(Math.abs(result.bands.reduce((n, b) => n + b.widthMeters, 0) - 10) < 1e-12);
    assert.ok(result.bands.every(b => Number.isFinite(b.widthMeters) && b.widthMeters > 0));
    assert.equal(result.startSection.bands[1].width.meters, 3);
    assert.equal(result.endSection.bands[1].width.meters, 2);
    result.startSection.bands[1].width.sourceIds.push('mutated'); result.bands[0].widthMeters = 99;
  }
  assert.deepEqual(road, original);
  assert.deepEqual(evaluateRoadwayStation(road, 50, 'existing'), evaluateRoadwayStation(road, 50, 'existing'));
});

for (const [name, mutate, code] of [
  ['topology', s => { s.bands[1].kind = 'bike-lane'; }, 'transition-topology'],
  ['direction', s => { s.bands[1].direction = 'reverse'; }, 'transition-topology'],
  ['curb placement', s => { s.bands[0].location = 'between-curbs'; }, 'transition-topology'],
  ['band count', s => { s.bands.pop(); }, 'transition-topology'],
  ['envelope', s => { s.envelope.width = dimension(12); }, 'transition-envelope'],
  ['envelope classification', s => { s.envelope.kind = 'right-of-way'; }, 'transition-envelope'],
  ['curb width', s => { s.curbToCurb = dimension(7); }, 'transition-envelope'],
  ['locked end width', s => { s.bands[1].locked = true; }, 'transition-lock'],
]) test(`incompatible longitudinal transition rejects ${name}`, () => {
  const road = transitionFixture(); mutate(road.layouts.find(l => l.id === 'existing-end').section);
  assert.ok(has(validateRoadwaySegments(road), code));
  assert.equal(evaluateRoadwayStation(road, 50, 'proposed').status, 'invalid');
});

test('transition locks protect either endpoint and allow matching locked widths', () => {
  const road = transitionFixture(); road.layouts[0].section.bands[1].locked = true;
  assert.ok(has(validateRoadwaySegments(road), 'transition-lock'));
  road.layouts[0].section.bands[1].locked = false;
  road.layouts[0].section.bands[0].locked = true;
  assert.equal(evaluateRoadwayStation(road, 50, 'existing').bands[0].locked, true);
});

test('transition references require both matching roles, with no silent fallback', () => {
  for (const value of ['missing', 'proposed-end', undefined]) {
    const road = transitionFixture(); road.segments[0].transition.existingLayoutId = value;
    assert.throws(() => parseRoad(road), /Invalid project/);
    assert.equal(evaluateRoadwayStation(road, 50, 'existing').status, 'invalid');
  }
});

test('a following segment owns the transition end boundary and can explicitly break topology', () => {
  const road = transitionFixture(); road.segments[0].endMeters = 50;
  road.segments.push({ ...fixture().segments[1], startMeters: 50 });
  assert.equal(evaluateRoadwayStation(parseRoad(road), 49, 'existing').transition, true);
  const result = evaluateRoadwayStation(road, 50, 'existing');
  assert.equal(result.segmentId, 'second'); assert.equal(result.transition, false);
  assert.equal(result.curbToCurbMeters, 9); assert.equal(result.atSegmentStart, true);
});

