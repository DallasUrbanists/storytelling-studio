import test from 'node:test';
import assert from 'node:assert/strict';
import { solveRoadwayWidths } from '../../packages/story-core/src/roadway.ts';
import { roadwayDrawing } from '../../packages/map-adapter/src/svg-overlay.ts';

const dimension = value => ({ status: 'assumed', value, unit: 'm', meters: value, rationale: 'Synthetic' });
const section = widths => ({ role: 'proposed', curbToCurb: dimension(widths.reduce((a, b) => a + b, 0)),
  envelope: { kind: 'unknown', width: { status: 'unknown' } },
  bands: widths.map((width, i) => ({ id: `band-${i}`, kind: ['through-lane', 'center-turn-lane', 'bike-lane', 'buffer', 'sidewalk'][i % 5], direction: 'forward', location: 'between-curbs', width: dimension(width), locked: false, label: 'A very long synthetic label '.repeat(20) })) });

test('narrow and wide bands preserve solver dimensions and variant scale', () => {
  for (const widths of [[0.001, 3, 1, 0.1, 2], [20, 30, 40, 50, 60]]) {
    const result = solveRoadwayWidths(section(widths));
    assert.equal(result.status, 'feasible');
    const portrait = roadwayDrawing(result, 'portrait');
    assert.deepEqual(portrait, roadwayDrawing(result, 'landscape'));
    assert.equal(portrait.bands.length, widths.length);
    portrait.bands.forEach((band, i) => {
      assert.ok(Math.abs(band.width / portrait.scale - widths[i]) < 1e-10);
      if (i) assert.equal(band.x, portrait.bands[i - 1].x + portrait.bands[i - 1].width);
      assert.equal(band.band.label, result.bands[i].label);
    });
  }
});

test('infeasible allocations retain actual widths; unknown bands cannot produce a drawing', () => {
  const input = section([3, 4]);
  input.curbToCurb = dimension(6);
  const result = solveRoadwayWidths(input);
  assert.equal(result.status, 'infeasible');
  assert.equal(result.pavement.residualMeters, -1);
  assert.equal(roadwayDrawing(result, 'portrait').totalMeters, 7);
  input.bands[0].width = { status: 'unknown' };
  assert.equal(roadwayDrawing(solveRoadwayWidths(input), 'landscape'), null);
});
