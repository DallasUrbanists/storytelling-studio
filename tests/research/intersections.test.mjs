import test from 'node:test';
import assert from 'node:assert/strict';
import {
  geodesicAreaM2, intersectPolygonAreas, validateGeographicPolygon, polygonAreaMethod,
} from '../../packages/story-core/src/geometry.ts';

const rect = (west, south, east, north) => ({ type: 'Polygon', coordinates: [
  [[west, south], [east, south], [east, north], [west, north], [west, south]],
] });
const multi = (...polygons) => ({ type: 'MultiPolygon', coordinates: polygons.map(p => p.coordinates) });
const close = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * tolerance,
    `${actual} differs from ${expected}`);
};
// Independent spherical-zone formula for meridian/parallel rectangles.
const referenceArea = (west, south, east, north) => 6371008.8 ** 2 *
  ((east - west) * Math.PI / 180) *
  (Math.sin(north * Math.PI / 180) - Math.sin(south * Math.PI / 180));

test('no overlap and edge/point contacts have no area or intersection', () => {
  const source = rect(0, 0, 2, 2);
  for (const study of [rect(3, 0, 4, 2), rect(2, 0, 3, 2), rect(2, 2, 3, 3)]) {
    assert.deepEqual(intersectPolygonAreas(source, study), {
      overlap: 'none', sourceAreaM2: referenceArea(0, 0, 2, 2),
      intersectedAreaM2: 0, fraction: 0, intersection: null,
    });
  }
});

test('full overlap is relative to the source unit and preserves detached inputs', () => {
  const source = rect(0, 0, 2, 2);
  const before = structuredClone(source);
  for (const study of [source, rect(-1, -1, 3, 3)]) {
    const result = intersectPolygonAreas(source, study);
    assert.equal(result.overlap, 'full');
    assert.equal(result.fraction, 1);
    close(result.intersectedAreaM2, referenceArea(0, 0, 2, 2));
    result.intersection.coordinates[0][0][0] = 99;
    assert.deepEqual(source, before);
  }
});

test('half overlap clips the actual polygon and uses geodesic source area', () => {
  const result = intersectPolygonAreas(rect(0, 0, 2, 2), rect(1, -1, 3, 3));
  assert.equal(result.overlap, 'partial');
  assert.equal(result.fraction, 0.5);
  assert.deepEqual(result.intersection, rect(1, 0, 2, 2));
  close(result.intersectedAreaM2, referenceArea(1, 0, 2, 2));
  // Splitting latitude at 60 degrees is not a square-degree half-area split.
  const latitudeSplit = intersectPolygonAreas(rect(0, 50, 2, 70), rect(-1, 50, 3, 60));
  close(latitudeSplit.fraction, (Math.sin(Math.PI / 3) - Math.sin(50 * Math.PI / 180)) /
    (Math.sin(70 * Math.PI / 180) - Math.sin(50 * Math.PI / 180)));
  assert.ok(latitudeSplit.fraction > 0.57 && latitudeSplit.fraction < 0.58);
});

test('full coverage uses topology despite clipping changes to nearly collinear vertices', () => {
  for (let i = 0; i < 100; i++) {
    const x = -97 + i / 1000, y = 32 + i / 1000;
    const source = { type: 'Polygon', coordinates: [[
      [x, y], [x + 0.0065, y + 0.0135], [x + 0.013, y + 0.027],
      [x + 0.029, y + 0.007], [x, y],
    ]] };
    const result = intersectPolygonAreas(source, source);
    assert.equal(result.overlap, 'full');
    assert.equal(result.fraction, 1);
    assert.equal(result.intersectedAreaM2, result.sourceAreaM2);
  }
});

test('holes subtract from both numerator and denominator, independent of winding', () => {
  const source = rect(0, 0, 4, 4);
  source.coordinates.push(rect(1, 1, 3, 3).coordinates[0]);
  const expected = referenceArea(0, 0, 4, 4) - referenceArea(1, 1, 3, 3);
  close(geodesicAreaM2(source), expected);
  assert.equal(intersectPolygonAreas(source, rect(1.2, 1.2, 2.8, 2.8)).overlap, 'none');
  const half = intersectPolygonAreas(source, rect(2, -1, 5, 5));
  close(half.fraction, 0.5);
  const studyWithHole = intersectPolygonAreas(rect(0, 0, 4, 4), source);
  close(studyWithHole.fraction, expected / referenceArea(0, 0, 4, 4));
  const reversed = structuredClone(source);
  reversed.coordinates.forEach(ring => ring.reverse());
  close(geodesicAreaM2(reversed), expected);
  close(intersectPolygonAreas(reversed, rect(2, -1, 5, 5)).fraction, 0.5);
});

test('multipart units sum disjoint components and can lie inside another component hole', () => {
  const source = multi(rect(0, 0, 1, 2), rect(3, 0, 4, 2));
  const half = intersectPolygonAreas(source, rect(-1, -1, 2, 3));
  close(half.fraction, 0.5);
  assert.equal(half.intersection.type, 'Polygon');
  const full = intersectPolygonAreas(source, rect(-1, -1, 5, 3));
  assert.equal(full.overlap, 'full');
  assert.equal(full.intersection.type, 'MultiPolygon');
  const donut = rect(0, 0, 6, 6);
  donut.coordinates.push(rect(1, 1, 5, 5).coordinates[0]);
  close(geodesicAreaM2(multi(donut, rect(2, 2, 3, 3))),
    referenceArea(0, 0, 6, 6) - referenceArea(1, 1, 5, 5) + referenceArea(2, 2, 3, 3));
});

test('known spherical reference values distinguish meters, degrees, and Mercator', () => {
  close(geodesicAreaM2(rect(0, 0, 1, 1)), 12363718145.180046);
  close(geodesicAreaM2(rect(-97, 32, -96, 33)), referenceArea(-97, 32, -96, 33));
  close(geodesicAreaM2(rect(0, 60, 1, 61)), 6088417933.464412);
  assert.ok(geodesicAreaM2(rect(0, 60, 1, 61)) < geodesicAreaM2(rect(0, 0, 1, 1)) / 2);
  assert.equal(polygonAreaMethod.turfVersion, '7.4.0');
});

test('concave clipping returns separated intersection components without counting the gap', () => {
  const source = { type: 'Polygon', coordinates: [[
    [0, 0], [4, 0], [4, 1], [1, 1], [1, 3], [4, 3], [4, 4], [0, 4], [0, 0],
  ]] };
  const result = intersectPolygonAreas(source, rect(2, -1, 3, 5));
  assert.equal(result.overlap, 'partial');
  assert.deepEqual(result.intersection, multi(rect(2, 0, 3, 1), rect(2, 3, 3, 4)));
  close(result.intersectedAreaM2, referenceArea(2, 0, 3, 1) + referenceArea(2, 3, 3, 4));
  const multipartStudy = multi(rect(2, 0, 3, 1), rect(2, 3, 3, 4));
  close(intersectPolygonAreas(source, multipartStudy).fraction, result.fraction);
});

test('out-of-range partial fractions fail instead of being clamped', () => {
  // Removing a collinear vertex changes Turf's spherical approximation on a
  // diagonal. Almost-full clipping exposes that discrepancy as a ratio > 1.
  const source = { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [2, 2], [0, 2], [0, 0]]] };
  assert.throws(() => intersectPolygonAreas(source, rect(0, -1, 1.999999999999, 3)), /out-of-range/);
  const underflow = rect(0, 0, 1e-180, 1e-180);
  assert.throws(() => geodesicAreaM2(underflow), /Invalid geographic polygon/);
});

test('numerically zero holes are rejected even inside a positive-area exterior', () => {
  const hole = rect(0.1, 32.04, 0.10000000000001, 32.04 + 7.105427357601002e-15);
  assert.throws(() => geodesicAreaM2(hole), /zero geodesic area/);
  const source = rect(0, 31, 1, 34);
  source.coordinates.push(hole.coordinates[0]);
  assert.throws(() => geodesicAreaM2(source), /zero geodesic area/);
});

test('invalid rings fail without closing, snapping, or repairing the source boundary', () => {
  const invalid = [
    { type: 'Polygon', coordinates: [] }, { type: 'MultiPolygon', coordinates: [] },
    { type: 'Polygon', coordinates: [[]] },
    { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 1]]] },
    { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 1], [2, 2]]] },
    { type: 'Polygon', coordinates: [[[0, 0], [2, 2], [0, 2], [2, 0], [0, 0]]] },
    { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [1, 0], [1, 1], [0, 0]]] },
    { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [2, 0], [0, 0]]] },
    { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 0], [0, 1], [0, 0]]] },
    { type: 'Polygon', coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] },
    // Nonconsecutive repeated vertex: a self-touching ring.
    { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [1, 1], [2, 2], [0, 2], [1, 1], [0, 0]]] },
  ];
  for (const geometry of invalid) {
    const saved = structuredClone(geometry);
    assert.throws(() => intersectPolygonAreas(geometry, rect(-1, -1, 5, 5)), /Invalid geographic polygon/);
    assert.throws(() => intersectPolygonAreas(rect(-1, -1, 5, 5), geometry), /Invalid geographic polygon/);
    assert.deepEqual(geometry, saved);
  }
});

test('misplaced, crossing, touching, overlapping, or nested holes are rejected', () => {
  const outside = rect(0, 0, 4, 4);
  for (const holes of [
    [rect(5, 5, 6, 6)], [rect(3, 1, 5, 2)], [rect(0, 1, 2, 2)],
    [rect(1, 1, 3, 3), rect(2, 2, 3.5, 3.5)],
    [rect(1, 1, 3, 3), rect(1.5, 1.5, 2, 2)],
    [rect(1, 1, 2, 2), rect(2, 1, 3, 2)],
  ]) {
    const geometry = { ...outside, coordinates: [...outside.coordinates, ...holes.map(h => h.coordinates[0])] };
    assert.throws(() => geodesicAreaM2(geometry), /hole/);
  }
});

test('multipart overlap, containment, edge/point touching, and zero-area parts are rejected', () => {
  for (const other of [rect(1, 1, 3, 3), rect(0.5, 0.5, 1, 1), rect(2, 0, 3, 2), rect(2, 2, 3, 3)]) {
    assert.throws(() => geodesicAreaM2(multi(rect(0, 0, 2, 2), other)), /multipart/);
  }
  const zero = { type: 'Polygon', coordinates: [[[3, 0], [4, 0], [5, 0], [3, 0]]] };
  assert.throws(() => geodesicAreaM2(multi(rect(0, 0, 2, 2), zero)), /zero-area/);
});

test('only finite two-dimensional longitude/latitude coordinates are accepted', () => {
  for (const position of [[NaN, 0], [0, Infinity], [-Infinity, 0], [181, 0], [0, 91],
    [-96, 90], [-96, -90], [500000, 3600000], ['1', 0], [0], [0, 0, 1], new Array(2)]) {
    const geometry = rect(0, 0, 1, 1);
    geometry.coordinates[0][1] = position;
    assert.throws(() => geodesicAreaM2(geometry), /positions/);
  }
  assert.throws(() => geodesicAreaM2(rect(32, -97, 33, -96)), /positions/);
  assert.throws(() => geodesicAreaM2({ ...rect(0, 0, 1, 1), crs: { name: 'EPSG:3857' } }), /CRS/);
  for (const geometry of [null, {}, { type: 'Point', coordinates: [0, 0] }, { type: 'Feature', geometry: rect(0, 0, 1, 1) }]) {
    assert.throws(() => geodesicAreaM2(geometry), /expected/);
  }
  assert.throws(() => geodesicAreaM2(rect(-179, 0, 179, 1)), /longitude span/);
});

test('validation bounds work and returns independent copies', () => {
  const geometry = rect(0, 0, 1, 1);
  const validated = validateGeographicPolygon(geometry);
  validated.coordinates[0][0][0] = 2;
  assert.equal(geometry.coordinates[0][0][0], 0);
  const large = { type: 'Polygon', coordinates: [Array.from({ length: 2001 }, () => [0, 0])] };
  assert.throws(() => validateGeographicPolygon(large), /position limit/);
  assert.throws(() => validateGeographicPolygon({ type: 'Polygon', coordinates: Array(129).fill(geometry.coordinates[0]) }), /ring limit/);
});

