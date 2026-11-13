import test from 'node:test';
import assert from 'node:assert/strict';
import {
  solveRoadwayWidths, ROADWAY_WIDTH_TOLERANCE_METERS,
} from '../../packages/story-core/src/roadway.ts';

const dimension = (value, unit = 'm') => ({
  status: 'assumed', value, unit, meters: value * (unit === 'ft' ? 0.3048 : 1),
  rationale: 'Synthetic arithmetic fixture; no engineering recommendation',
});
const band = (id, value, locked = false, location = 'between-curbs') => ({
  id, kind: location === 'outside-curbs' ? 'sidewalk' : 'through-lane',
  direction: location === 'outside-curbs' ? 'none' : 'forward',
  width: dimension(value), locked, location,
});
const section = () => ({
  role: 'proposed', proposalDescription: 'Synthetic concept',
  curbToCurb: dimension(6), envelope: { kind: 'illustrated', width: dimension(10) },
  bands: [band('left-walk', 2, true, 'outside-curbs'), band('fixed', 3, true),
    band('editable', 3), band('right-walk', 2, false, 'outside-curbs')],
});
const hasCode = (result, code, constraint) => result.diagnostics.some(d =>
  d.code === code && (constraint === undefined || d.constraint === constraint));

test('exact fit separates pavement and outside bands, retaining every dimension', () => {
  const input = section();
  const result = solveRoadwayWidths(input);
  assert.equal(result.status, 'feasible');
  assert.equal(result.toleranceMeters, 0.01);
  assert.deepEqual(result.pavement, { availableMeters: 6, allocatedMeters: 6,
    lockedMeters: 3, editableMeters: 3, residualMeters: 0 });
  assert.deepEqual(result.envelope, { availableMeters: 10, allocatedMeters: 10,
    lockedMeters: 5, editableMeters: 5, residualMeters: 0 });
  assert.deepEqual(result.bands, input.bands);
  assert.equal(result.editsApplied, false);
});

test('spare width is unassigned, without an inferred distribution', () => {
  const input = section();
  input.curbToCurb = dimension(7);
  input.envelope.width = dimension(11);
  const result = solveRoadwayWidths(input);
  assert.equal(result.status, 'infeasible');
  assert.equal(result.pavement.residualMeters, 1);
  assert.equal(result.envelope.residualMeters, 1);
  assert.ok(hasCode(result, 'unassigned', 'pavement'));
  assert.deepEqual(result.bands, input.bands);
});

test('explicit editable width can fill spare space while preserving locks and evidence', () => {
  const input = section();
  input.bands[2].width = dimension(2);
  const before = structuredClone(input);
  const edit = { bandId: 'editable', width: dimension(3) };
  const result = solveRoadwayWidths(input, [edit]);
  assert.equal(result.status, 'feasible');
  assert.equal(result.editsApplied, true);
  assert.deepEqual(result.bands[1], before.bands[1]);
  assert.deepEqual(result.bands[2].width, edit.width);
  assert.deepEqual(input, before);
  result.bands[2].width.meters = 100;
  assert.equal(edit.width.meters, 3);
  assert.equal(input.bands[2].width.meters, 2);
});

test('overfull locked pavement identifies the fixed bands and negative residual', () => {
  const input = section();
  input.curbToCurb = dimension(2);
  const result = solveRoadwayWidths(input);
  assert.equal(result.status, 'infeasible');
  const conflict = result.diagnostics.find(d => d.code === 'locked-overallocation');
  assert.deepEqual(conflict.bandIds, ['fixed']);
  assert.equal(conflict.residualMeters, -1);
  assert.equal(result.pavement.residualMeters, -4);
  assert.deepEqual(result.bands, input.bands);
});

test('editable over-allocation also fails without compression', () => {
  const input = section();
  input.bands[2].width = dimension(4);
  const result = solveRoadwayWidths(input);
  assert.equal(result.status, 'infeasible');
  assert.ok(hasCode(result, 'overallocated', 'pavement'));
  assert.equal(hasCode(result, 'locked-overallocation'), false);
  assert.equal(result.bands[2].width.meters, 4);
});

test('any locked change rejects the whole edit batch, even below balance tolerance', () => {
  const input = section();
  const result = solveRoadwayWidths(input, [
    { bandId: 'editable', width: dimension(2) },
    { bandId: 'fixed', width: dimension(3.000001) },
  ]);
  assert.equal(result.status, 'infeasible');
  assert.equal(result.editsApplied, false);
  assert.ok(hasCode(result, 'locked-width'));
  assert.deepEqual(result.bands, input.bands);
  assert.equal(result.pavement.residualMeters, 0);
});

test('equivalent original units do not replace a locked saved dimension', () => {
  const input = section();
  input.bands[1].width = dimension(10, 'ft');
  input.bands[2].width = dimension(2.952);
  const result = solveRoadwayWidths(input, [{ bandId: 'fixed', width: dimension(3.048) }]);
  assert.equal(result.status, 'feasible');
  assert.deepEqual(result.bands[1].width, input.bands[1].width);
  assert.equal(result.bands[1].width.unit, 'ft');
});

for (const value of [0, -1, NaN, Infinity, -Infinity]) {
  test(`invalid persisted width ${value} is explicit and never treated as removal`, () => {
    const input = section();
    input.bands[2].width = dimension(value);
    const result = solveRoadwayWidths(input);
    assert.equal(result.status, 'infeasible');
    assert.ok(hasCode(result, 'invalid-width', 'band'));
    assert.equal(result.pavement.allocatedMeters, null);
    assert.equal(result.pavement.residualMeters, null);
  });
  test(`invalid edit width ${value} cannot overwrite saved data`, () => {
    const input = section();
    const result = solveRoadwayWidths(input, [{ bandId: 'editable', width: dimension(value) }]);
    assert.equal(result.status, 'infeasible');
    assert.ok(hasCode(result, 'invalid-width', 'edit'));
    assert.equal(result.editsApplied, false);
    assert.deepEqual(result.bands, input.bands);
  });
}

test('invalid or unknown available dimensions prevent feasibility', () => {
  for (const available of [dimension(0), dimension(-1), dimension(Infinity), { status: 'unknown' }]) {
    const input = section();
    input.curbToCurb = available;
    const result = solveRoadwayWidths(input);
    assert.equal(result.status, 'infeasible');
    assert.equal(result.pavement.availableMeters, null);
    assert.ok(result.diagnostics.some(d => d.constraint === 'pavement'));
  }
});

test('unknown bands are infeasible and are never filled by inference', () => {
  const input = section();
  input.bands[2].width = { status: 'unknown' };
  const result = solveRoadwayWidths(input);
  assert.equal(result.status, 'infeasible');
  assert.ok(hasCode(result, 'unknown-width', 'band'));
  assert.equal(result.pavement.lockedMeters, 3);
  assert.equal(result.pavement.editableMeters, null);
  assert.equal(solveRoadwayWidths(input, [{ bandId: 'editable', width: dimension(3) }]).status,
    'feasible');
  input.bands[2].locked = true;
  assert.ok(hasCode(solveRoadwayWidths(input, [{ bandId: 'editable', width: dimension(3) }]),
    'locked-width'));
});

test('unknown optional envelope is omitted without hiding unknown outside widths', () => {
  const input = section();
  input.envelope = { kind: 'unknown', width: { status: 'unknown' } };
  const result = solveRoadwayWidths(input);
  assert.equal(result.status, 'feasible');
  assert.equal(result.envelope, null);
  input.bands[0].width = { status: 'unknown' };
  assert.equal(solveRoadwayWidths(input).status, 'infeasible');
});

test('total envelope disagreement is independent of pavement balance', () => {
  const input = section();
  input.envelope.width = dimension(4);
  const result = solveRoadwayWidths(input);
  assert.equal(result.status, 'infeasible');
  assert.equal(result.pavement.residualMeters, 0);
  assert.equal(result.envelope.residualMeters, -6);
  assert.ok(hasCode(result, 'overallocated', 'envelope'));
  assert.ok(hasCode(result, 'locked-overallocation', 'envelope'));
});

test('mixed units use saved meters with the exact international foot conversion', () => {
  const input = section();
  input.bands[1].width = dimension(10, 'ft');
  input.bands[2].width = dimension(10, 'ft');
  input.curbToCurb = dimension(20, 'ft');
  input.envelope.width = dimension(10.096);
  const result = solveRoadwayWidths(input);
  assert.equal(result.status, 'feasible');
  assert.equal(result.pavement.allocatedMeters, 6.096);
  const inconsistent = dimension(10, 'ft');
  inconsistent.meters = 10;
  assert.ok(hasCode(solveRoadwayWidths(input, [{ bandId: 'editable', width: inconsistent }]),
    'invalid-width'));
});

test('display rounding cannot accumulate into calculation rounding', () => {
  const input = section();
  input.bands = Array.from({ length: 100 }, (_, n) => band(`band-${n}`, 0.0149, n % 2 === 0));
  input.curbToCurb = dimension(1.49);
  input.envelope.width = dimension(1.49);
  const result = solveRoadwayWidths(input);
  assert.equal(result.status, 'feasible');
  assert.ok(Math.abs(result.pavement.residualMeters) < 1e-14);
  assert.ok(result.bands.every(b => b.width.meters === 0.0149));
});

test('inclusive 0.01 m tolerance handles binary roundoff but rejects real excess', () => {
  for (const residual of [-0.010001, -0.01, -0.009999, 0, 0.009999, 0.01, 0.010001]) {
    const input = section();
    input.curbToCurb = dimension(6 + residual);
    input.envelope = { kind: 'unknown', width: { status: 'unknown' } };
    const result = solveRoadwayWidths(input);
    assert.equal(result.status, Math.abs(residual) <= ROADWAY_WIDTH_TOLERANCE_METERS ?
      'feasible' : 'infeasible', `residual ${residual}`);
    assert.equal(result.pavement.residualMeters, input.curbToCurb.meters - 6);
    assert.deepEqual(result.bands, input.bands);
  }
});

test('unsupported sum overflow and numerical resolution are explicit failures', () => {
  for (const value of [Number.MAX_VALUE, 1e12]) {
    const input = section();
    input.bands = [band('a', value), band('b', value, true)];
    input.curbToCurb = dimension(value);
    input.envelope = { kind: 'unknown', width: { status: 'unknown' } };
    const result = solveRoadwayWidths(input);
    assert.equal(result.status, 'infeasible');
    assert.ok(hasCode(result, 'numeric-range'));
  }
});

test('duplicate and unknown edit targets reject the batch', () => {
  for (const edits of [
    [{ bandId: 'absent', width: dimension(2) }],
    [{ bandId: 'editable', width: dimension(2) }, { bandId: 'editable', width: dimension(3) }],
  ]) {
    const input = section();
    const result = solveRoadwayWidths(input, edits);
    assert.equal(result.status, 'infeasible');
    assert.equal(result.editsApplied, false);
    assert.deepEqual(result.bands, input.bands);
  }
});

test('results are independent of call history and detached from provenance arrays', () => {
  const input = section();
  input.bands[1].width = { status: 'estimated', value: 3, unit: 'm', meters: 3,
    sourceIds: ['fictional-source'], date: '2026-11-13', location: 'fictional',
    method: 'synthetic', uncertainty: 'not a real measurement' };
  const first = solveRoadwayWidths(input);
  solveRoadwayWidths(input, [{ bandId: 'editable', width: dimension(4) }]);
  assert.deepEqual(solveRoadwayWidths(input), first);
  first.bands[1].width.sourceIds.push('detached');
  assert.deepEqual(input.bands[1].width.sourceIds, ['fictional-source']);
});

test('a deterministic mixed-unit sweep conserves both envelopes and all locks', () => {
  for (let n = 1; n <= 80; n++) {
    const input = section();
    input.bands = Array.from({ length: n }, (_, k) => {
      const b = band(`band-${k}`, 1, k % 3 === 0);
      b.width = dimension((k + 1) / 13, k % 2 === 0 ? 'ft' : 'm');
      return b;
    });
    const pavementMeters = input.bands.reduce((total, b) => total + b.width.meters, 0);
    input.curbToCurb = dimension(pavementMeters);
    input.envelope.width = dimension(pavementMeters + 4);
    input.bands.unshift(band('left-walk', 2, true, 'outside-curbs'));
    input.bands.push(band('right-walk', 2, false, 'outside-curbs'));
    const result = solveRoadwayWidths(input);
    assert.equal(result.status, 'feasible', `band count ${n}`);
    assert.ok(Math.abs(result.pavement.residualMeters) <= ROADWAY_WIDTH_TOLERANCE_METERS);
    assert.ok(Math.abs(result.envelope.residualMeters) <= ROADWAY_WIDTH_TOLERANCE_METERS);
    assert.deepEqual(result.bands, input.bands);
    assert.ok(result.bands.every(b => b.width.meters > 0));
  }
});
