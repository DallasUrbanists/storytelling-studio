import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { ProjectDocument, RoadwayCrossSection } from '../../packages/project-schema/src/index.ts';
import { parseProject } from '../../packages/project-schema/src/validation.ts';
import { solveRoadwayWidths } from '../../packages/story-core/src/roadway.ts';
import { assumed, cases, mixedUnits, proposed } from '../fixtures/roadway/constraint-cases.ts';

const close = (actual: number | null, expected: number, label: string) => {
  assert.equal(typeof actual, 'number', label);
  assert.ok(Math.abs(actual! - expected) < 1e-12, `${label}: expected ${expected}, received ${actual}`);
};

for (const fixture of cases) {
  test(`independent arithmetic: ${fixture.name}`, () => {
    const section = structuredClone(fixture.section);
    const before = structuredClone(section);
    const result = solveRoadwayWidths(section);
    assert.equal(result.status, fixture.status);
    assert.equal(result.toleranceMeters, 0.01);
    assert.equal(result.editsApplied, false);
    for (const constraint of ['pavement', 'envelope'] as const) {
      const actual = result[constraint];
      assert.ok(actual);
      for (const key of Object.keys(fixture[constraint]) as (keyof typeof actual)[]) {
        close(actual[key], fixture[constraint][key], `${constraint}.${key}`);
      }
    }
    assert.equal(result.diagnostics.length, fixture.diagnostics.length);
    for (const expected of fixture.diagnostics) {
      const diagnostic = result.diagnostics.find(d => d.code === expected.code && d.constraint === expected.constraint);
      assert.ok(diagnostic, `${expected.constraint}: ${expected.code}`);
      assert.deepEqual(diagnostic.bandIds, expected.bandIds);
      close(diagnostic.residualMeters, expected.residualMeters, expected.code);
    }
    assert.deepEqual(result.bands, before.bands);
    assert.deepEqual(section, before);
  });
}

test('synthetic cases satisfy the project schema and retain assumed evidence', () => {
  const base = JSON.parse(readFileSync(new URL('../fixtures/synthetic-story/project.json', import.meta.url), 'utf8')) as ProjectDocument;
  for (const fixture of cases) {
    const project = structuredClone(base);
    project.roadways = [{
      id: 'synthetic-roadway', title: 'Synthetic illustrative corridor',
      corridorFeatureRevisionId: 'line-revision', stationOrigin: 'fictional start',
      stationDirection: 'toward fictional end', stationExtentMeters: 100, sourceIds: [],
      segments: [{ id: 'synthetic-segment', name: fixture.name, startMeters: 0, endMeters: 100,
        existing: { ...structuredClone(fixture.section), role: 'existing', proposalDescription: undefined },
        proposed: { ...structuredClone(fixture.section), role: 'proposed', proposalDescription: 'Synthetic concept only' } }],
    }];
    assert.doesNotThrow(() => parseProject(project), fixture.name);
    for (const band of fixture.section.bands) assert.equal(band.width.status, 'assumed');
  }
});

test('lock, reject, unlock, reallocate, relock and restore the entire original state', () => {
  let section = structuredClone(proposed);
  const original = structuredClone(section);
  const find = (id: string) => {
    const band = section.bands.find(b => b.id === id);
    assert.ok(band);
    return band;
  };
  const edit = (widths: [string, number][], status: 'feasible' | 'infeasible', residual: number, applied: boolean) => {
    const before = structuredClone(section);
    const result = solveRoadwayWidths(section, widths.map(([bandId, width]) => ({ bandId, width: assumed(width) })));
    assert.equal(result.status, status);
    assert.equal(result.editsApplied, applied);
    close(result.pavement.residualMeters, residual, 'mutation pavement');
    close(result.envelope!.residualMeters, residual, 'mutation envelope');
    close(result.pavement.availableMeters, 14.4, 'fixed curb width');
    close(result.envelope!.availableMeters, 19.2, 'fixed envelope');
    for (const locked of before.bands.filter(b => b.locked)) {
      assert.deepEqual(result.bands.find(b => b.id === locked.id), locked);
    }
    assert.deepEqual(section, before, 'solver must not mutate the caller');
    if (!applied) {
      assert.deepEqual(result.bands, before.bands, 'whole batch must be rejected');
      assert.ok(result.diagnostics.some(d => d.code === 'locked-width' && d.bandIds.includes('bike-l')));
    }
    section = { ...section, bands: result.bands };
    return result;
  };

  find('bike-l').locked = true;
  edit([['bike-l', 2], ['buffer-l', 0.7]], 'infeasible', 0, false);
  find('bike-l').locked = false;
  edit([['bike-l', 2]], 'infeasible', -0.2, true);
  const changedWidth = find('bike-l').width;
  assert.equal(changedWidth.status !== 'unknown' && changedWidth.meters, 2);
  edit([['buffer-l', 0.7]], 'feasible', 0, true);
  find('bike-l').locked = true;
  edit([['bike-l', 1.8], ['buffer-l', 0.9]], 'infeasible', 0, false);
  find('bike-l').locked = false;
  edit([['bike-l', 1.8], ['buffer-l', 0.9]], 'feasible', 0, true);
  assert.deepEqual(section, original);
  assert.deepEqual(solveRoadwayWidths(section), solveRoadwayWidths(original));
});

for (const scenario of [
  { target: 'turn', companion: 'lane-l', wider: 3.2, narrower: 2.8,
    original: 3, pavementAfterWidening: -0.2 },
  { target: 'walk-l', companion: 'walk-r', wider: 2.6, narrower: 2.2,
    original: 2.4, pavementAfterWidening: 0 },
]) {
  test(`locked ${scenario.target} unlocks, changes and restores without moving the curbs`, () => {
    let section = structuredClone(proposed);
    const original = structuredClone(section);
    const rejected = solveRoadwayWidths(section, [{ bandId: scenario.target, width: assumed(scenario.wider) }]);
    assert.equal(rejected.status, 'infeasible');
    assert.equal(rejected.editsApplied, false);
    assert.deepEqual(rejected.bands, original.bands);
    assert.deepEqual(rejected.diagnostics.map(d => [d.code, d.bandIds]), [['locked-width', [scenario.target]]]);
    section.bands.find(b => b.id === scenario.target)!.locked = false;
    section.bands.find(b => b.id === scenario.companion)!.locked = false;
    const wider = solveRoadwayWidths(section, [{ bandId: scenario.target, width: assumed(scenario.wider) }]);
    assert.equal(wider.status, 'infeasible');
    assert.equal(wider.editsApplied, true);
    close(wider.pavement.residualMeters, scenario.pavementAfterWidening, 'widened pavement');
    close(wider.envelope!.residualMeters, -0.2, 'widened envelope');
    section = { ...section, bands: wider.bands };
    const balanced = solveRoadwayWidths(section, [{ bandId: scenario.companion, width: assumed(scenario.narrower) }]);
    assert.equal(balanced.status, 'feasible');
    assert.equal(balanced.editsApplied, true);
    close(balanced.pavement.allocatedMeters, 14.4, 'reallocated pavement');
    close(balanced.envelope!.allocatedMeters, 19.2, 'reallocated envelope');
    section = { ...section, bands: balanced.bands };
    const restored = solveRoadwayWidths(section, [scenario.target, scenario.companion]
      .map(bandId => ({ bandId, width: assumed(scenario.original) })));
    assert.equal(restored.status, 'feasible');
    assert.equal(restored.editsApplied, true);
    section = { ...section, bands: restored.bands };
    for (const band of section.bands) band.locked = original.bands.find(b => b.id === band.id)!.locked;
    assert.deepEqual(section, original);
  });
}

test('unit changes preserve physical totals, original locked evidence and reversible saved state', () => {
  let section: RoadwayCrossSection = structuredClone(mixedUnits);
  const original = structuredClone(section);
  for (let cycle = 0; cycle < 5; cycle++) {
    for (const width of [assumed(6, 1.8288, 'ft'), assumed(1.8288)]) {
      const result = solveRoadwayWidths(section, [
        { bandId: 'bike-l', width }, { bandId: 'turn', width: assumed(3.048) },
      ]);
      assert.equal(result.status, 'feasible');
      assert.equal(result.editsApplied, true);
      close(result.pavement.allocatedMeters, 14.6304, 'mixed-unit pavement');
      close(result.envelope!.allocatedMeters, 19.5072, 'mixed-unit envelope');
      assert.deepEqual(result.bands.find(b => b.id === 'turn'), original.bands.find(b => b.id === 'turn'));
      section = { ...section, bands: result.bands };
    }
    assert.deepEqual(section, original);
  }
  const invalid = solveRoadwayWidths(section, [{ bandId: 'bike-l', width: assumed(6, 1.8, 'ft') }]);
  assert.equal(invalid.status, 'infeasible');
  assert.equal(invalid.editsApplied, false);
  assert.ok(invalid.diagnostics.some(d => d.code === 'invalid-width' && d.constraint === 'edit'));
  assert.deepEqual(invalid.bands, original.bands);
});

for (const [available, expectedStatus, residual] of [
  [14.39, 'feasible', -0.01], [14.41, 'feasible', 0.01],
  [14.3899, 'infeasible', -0.0101], [14.4101, 'infeasible', 0.0101],
] as const) {
  test(`independent inclusive tolerance boundary: ${available} m`, () => {
    const section = structuredClone(proposed);
    section.curbToCurb = assumed(available);
    const result = solveRoadwayWidths(section);
    assert.equal(result.status, expectedStatus);
    close(result.pavement.residualMeters, residual, 'tolerance residual');
    close(result.envelope!.residualMeters, 0, 'unchanged envelope');
    assert.deepEqual(result.bands, section.bands);
  });
}

