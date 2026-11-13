import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CameraFitError, cameraExtentForGeometry, cameraFitLimits, fitCameraToExtent, fitFocusStep,
} from '../../packages/story-core/src/camera.ts';
import { validateFocusSteps } from '../../packages/project-schema/src/focus.ts';

const viewports = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
};
const variants = Object.keys(viewports);
const near = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const hasCode = code => error => error instanceof CameraFitError && error.code === code;
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

// Independent spherical Mercator reference in MapLibre's 512-pixel zoom units.
// This oracle uses the log/tan identity rather than the fitter's asinh/tan form.
function project([longitude, latitude], camera, viewport) {
  const y = lat => -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / (2 * Math.PI);
  const worldSize = 512 * 2 ** camera.zoom;
  return [
    viewport.width / 2 + (longitude - camera.center[0]) * worldSize / 360,
    viewport.height / 2 + (y(latitude) - y(camera.center[1])) * worldSize,
  ];
}

function edges(viewport, options = {}) {
  const padding = typeof options.padding === 'number'
    ? { top: options.padding, right: options.padding, bottom: options.padding, left: options.padding }
    : options.padding ?? {};
  const inset = side => (options.safeArea?.[side] ?? 0) + (padding[side] ?? 0);
  return [inset('left'), inset('top'), viewport.width - inset('right'), viewport.height - inset('bottom')];
}

function contains(extent, camera, viewport, options = {}) {
  const [west, south, east, north] = extent;
  const [left, top, right, bottom] = edges(viewport, options);
  for (const position of [[west, south], [west, north], [east, south], [east, north]]) {
    const [x, y] = project(position, camera, viewport);
    assert.ok(x >= left - 1e-6 && x <= right + 1e-6, `x=${x}, safe=[${left},${right}]`);
    assert.ok(y >= top - 1e-6 && y <= bottom + 1e-6, `y=${y}, safe=[${top},${bottom}]`);
  }
}

const shapes = [
  ['point', { type: 'Point', coordinates: [-96.8, 32.8] }, [-96.8, 32.8, -96.8, 32.8]],
  ['horizontal line', { type: 'LineString', coordinates: [[-97, 32.8], [-96.5, 32.8]] }, [-97, 32.8, -96.5, 32.8]],
  ['vertical line', { type: 'LineString', coordinates: [[-96.8, 32.5], [-96.8, 33]] }, [-96.8, 32.5, -96.8, 33]],
  ['polygon with hole', { type: 'Polygon', coordinates: [
    [[-97, 32.5], [-96.5, 32.5], [-96.5, 33], [-97, 33], [-97, 32.5]],
    [[-96.9, 32.6], [-96.8, 32.6], [-96.8, 32.7], [-96.9, 32.7], [-96.9, 32.6]],
  ] }, [-97, 32.5, -96.5, 33]],
  ['narrow extent', { type: 'LineString', coordinates: [[-96.8, 32.5], [-96.7999999999, 33]] }, [-96.8, 32.5, -96.7999999999, 33]],
  ['collapsed line', { type: 'LineString', coordinates: [[1, 1], [1, 1]] }, [1, 1, 1, 1]],
  ['collapsed polygon bounds', { type: 'Polygon', coordinates: [[[1, 1], [1, 1], [1, 1], [1, 1]]] }, [1, 1, 1, 1]],
];
for (const [name, geometry, expected] of shapes) {
  test(`${name}: exact source bounds fit both outputs without coordinate changes`, () => {
    const before = JSON.stringify(geometry);
    freeze(geometry);
    const extent = cameraExtentForGeometry(geometry);
    assert.deepEqual(extent, expected);
    for (const variant of variants) {
      const options = { padding: 72 };
      const camera = fitCameraToExtent(extent, viewports[variant], options);
      contains(extent, camera, viewports[variant], options);
      assert.equal(camera.pitch, 0);
      assert.equal(camera.bearing, 0);
      assert.ok(Number.isFinite(camera.zoom));
      const repeated = fitCameraToExtent(extent, viewports[variant], options);
      assert.deepEqual(repeated, camera);
      assert.notEqual(repeated.center, camera.center);
    }
    assert.equal(JSON.stringify(geometry), before);
  });
}

test('aspect ratio selects the limiting axis independently for the same focus', () => {
  const extent = [-1, -1, 1, 1];
  const portrait = fitCameraToExtent(extent, viewports.portrait);
  const landscape = fitCameraToExtent(extent, viewports.landscape);
  const [pWest] = project([-1, 0], portrait, viewports.portrait);
  const [, lNorth] = project([0, 1], landscape, viewports.landscape);
  near(pWest, 0);
  near(lNorth, 0);
  assert.notEqual(portrait.zoom, landscape.zoom);
  for (const variant of variants) contains(extent, fitCameraToExtent(extent, viewports[variant]), viewports[variant]);
});

test('safe-area and author padding add, shifting the camera toward the padded edge', () => {
  const extent = [-97, 32, -96, 33];
  const options = freeze({
    safeArea: { top: 240, right: 60, bottom: 80, left: 120 },
    padding: { top: 40, right: 90, bottom: 20, left: 30 },
  });
  for (const viewport of Object.values(viewports)) {
    const camera = fitCameraToExtent(freeze(extent), viewport, options);
    contains(extent, camera, viewport, options);
    const [left, top, right, bottom] = edges(viewport, options);
    const [westX, northY] = project([-97, 33], camera, viewport);
    const [eastX, southY] = project([-96, 32], camera, viewport);
    near((westX + eastX) / 2, (left + right) / 2);
    near((northY + southY) / 2, (top + bottom) / 2);
    near(camera.center[0], -96.5);
    assert.ok(camera.center[1] > fitCameraToExtent(extent, viewport).center[1]);
    assert.ok(Math.min(Math.abs(westX - left), Math.abs(northY - top)) < 1e-6);
  }
});

test('unequal horizontal insets place the focus at the safe-area center', () => {
  const extent = [-1, -1, 1, 1];
  const options = { safeArea: { left: 350, right: 10 }, padding: 12 };
  const viewport = viewports.landscape;
  const camera = fitCameraToExtent(extent, viewport, options);
  contains(extent, camera, viewport, options);
  const [x] = project([0, 0], camera, viewport);
  near(x, (350 + 12 + viewport.width - 10 - 12) / 2);
  assert.ok(camera.center[0] < 0);
});

test('Mercator midpoint differs from the geographic latitude midpoint', () => {
  const extent = [10, 60, 11, 70];
  const viewport = viewports.landscape;
  const camera = fitCameraToExtent(extent, viewport, { padding: 40 });
  assert.ok(camera.center[1] > 65);
  contains(extent, camera, viewport, { padding: 40 });
  const [, top] = project([10, 70], camera, viewport);
  const [, bottom] = project([11, 60], camera, viewport);
  near((top + bottom) / 2, viewport.height / 2);
});

test('point and subpixel extents use the explicit zoom cap with no invented geometry', () => {
  for (const viewport of Object.values(viewports)) for (const maxZoom of [12, 18.5, 22]) {
    for (const extent of [[0, 0, 0, 0], [1, 1, 1 + 1e-12, 1 + 1e-12]]) {
      const camera = fitCameraToExtent(extent, viewport, { maxZoom });
      assert.equal(camera.zoom, maxZoom);
      contains(extent, camera, viewport);
    }
  }
  assert.equal(fitCameraToExtent([0, 0, 0, 0], viewports.portrait).zoom, cameraFitLimits.maxZoom);
});

test('repeatable fits contain bounds across hemispheres, aspect ratios and high latitudes', () => {
  for (const viewport of Object.values(viewports)) {
    for (const longitude of [-120, 0, 120]) for (const latitude of [-80, -45, 0, 45, 80]) {
      for (const span of [1e-8, 0.001, 0.1, 1]) {
        const extent = [longitude, latitude, longitude + span, latitude + span];
        const options = { padding: 36, safeArea: { top: 100, left: 80 } };
        const camera = fitCameraToExtent(extent, viewport, options);
        contains(extent, camera, viewport, options);
        assert.deepEqual(fitCameraToExtent(extent, viewport, options), camera);
      }
    }
  }
});

const step = () => ({
  id: 'focus-1', featureRevisionId: 'verified-1', startFrame: 0, endFrameExclusive: 30,
  extent: [-97, 32, -96, 33], camera: { center: [-96.5, 32.5], zoom: 8, bearing: 0, pitch: 0 },
  transition: { kind: 'cut' },
});

test('both cameras are saved as schema-compatible overrides; all other step data stays intact', () => {
  const input = freeze(step());
  const before = JSON.stringify(input);
  const fitted = fitFocusStep(input, viewports, { portrait: { padding: 80 }, landscape: { padding: 120 } });
  validateFocusSteps([fitted], new Set(['verified-1']), 30);
  const { variantOverrides, ...rest } = fitted;
  assert.deepEqual(rest, input);
  assert.notEqual(rest.extent, input.extent);
  for (const variant of variants) {
    assert.deepEqual(variantOverrides[variant].extent, input.extent);
    assert.notEqual(variantOverrides[variant].extent, fitted.extent);
    contains(input.extent, variantOverrides[variant].camera, viewports[variant], { padding: variant === 'portrait' ? 80 : 120 });
  }
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(fitFocusStep(fitted, viewports), fitted);
});

test('manual camera and variant extent overrides remain per step and detach from the source', () => {
  const input = step();
  input.variantOverrides = {
    portrait: { camera: { center: [-96, 32], zoom: 13, bearing: 30, pitch: 0 } },
    landscape: { extent: [-96.8, 32.2, -96.5, 32.6] },
  };
  freeze(input);
  const fitted = fitFocusStep(input, viewports);
  assert.deepEqual(fitted.variantOverrides.portrait.camera, input.variantOverrides.portrait.camera);
  contains(input.variantOverrides.landscape.extent, fitted.variantOverrides.landscape.camera, viewports.landscape);
  assert.deepEqual(fitted.extent, input.extent);
  fitted.variantOverrides.portrait.camera.center[0] = 0;
  fitted.variantOverrides.landscape.extent[0] = 0;
  assert.equal(input.variantOverrides.portrait.camera.center[0], -96);
  assert.equal(input.variantOverrides.landscape.extent[0], -96.8);
  const another = fitFocusStep(step(), viewports);
  assert.equal(another.variantOverrides.portrait.camera.bearing, 0);
});

test('removing a saved override explicitly requests refitting just that output', () => {
  const saved = fitFocusStep(step(), viewports);
  const landscape = structuredClone(saved.variantOverrides.landscape);
  delete saved.variantOverrides.portrait.camera;
  const refitted = fitFocusStep(saved, viewports, { portrait: { padding: 300 } });
  assert.deepEqual(refitted.variantOverrides.landscape, landscape);
  assert.notEqual(refitted.variantOverrides.portrait.camera.zoom, fitFocusStep(step(), viewports).variantOverrides.portrait.camera.zoom);
  contains(saved.extent, refitted.variantOverrides.portrait.camera, viewports.portrait, { padding: 300 });
});

for (const extent of [[], [0, 0, 1], [0, 0, 1, NaN], [0, 0, Infinity, 1], new Array(4), null]) {
  test(`malformed extent ${JSON.stringify(extent)} is rejected`, () => {
    assert.throws(() => fitCameraToExtent(extent, viewports.portrait), hasCode('invalid-extent'));
  });
}
for (const extent of [[179, 0, -179, 1], [-181, 0, 0, 1], [0, 0, 181, 1], [0, 2, 1, 1], [0, -86, 1, 0], [0, 0, 1, 86]]) {
  test(`unsupported extent ${extent} is rejected without clamping`, () => {
    assert.throws(() => fitCameraToExtent(extent, viewports.portrait), hasCode('unsupported-bounds'));
  });
}
for (const viewport of [{ width: 0, height: 1920 }, { width: 1080, height: -1 }, { width: 1.5, height: 2 }, { width: NaN, height: 2 }, { width: 2, height: Infinity }]) {
  test(`invalid viewport ${JSON.stringify(viewport)} is rejected`, () => {
    assert.throws(() => fitCameraToExtent([0, 0, 1, 1], viewport), hasCode('invalid-viewport'));
  });
}
for (const options of [
  { padding: -1 }, { padding: NaN }, { padding: Infinity }, { padding: { left: -1 } },
  { padding: { top: undefined } }, { padding: [1, 2] }, { safeArea: null }, { safeArea: { x: 10 } },
  { padding: 540 }, { safeArea: { top: 1000, bottom: 920 } },
  { padding: 300, safeArea: { left: 240, right: 240 } },
]) {
  test(`invalid or exhausted safe area ${JSON.stringify(options)} is rejected`, () => {
    assert.throws(() => fitCameraToExtent([0, 0, 1, 1], viewports.portrait, options), hasCode('invalid-padding'));
  });
}
for (const maxZoom of [NaN, Infinity, -3, 23]) {
  test(`unsupported maxZoom ${maxZoom} is rejected`, () => {
    assert.throws(() => fitCameraToExtent([0, 0, 1, 1], viewports.portrait, { maxZoom }), hasCode('invalid-max-zoom'));
  });
}
for (const geometry of [
  { type: 'LineString', coordinates: [] }, { type: 'LineString', coordinates: [[0, 0]] },
  { type: 'Point', coordinates: [NaN, 1] }, { type: 'Point', coordinates: [0, 0, 5] },
  { type: 'Polygon', coordinates: [] }, { type: 'Polygon', coordinates: [[]] },
  { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] },
  { type: 'MultiPoint', coordinates: [[0, 0]] }, null,
]) {
  test(`malformed or unsupported geometry ${JSON.stringify(geometry)} is rejected`, () => {
    assert.throws(() => cameraExtentForGeometry(geometry), hasCode('invalid-geometry'));
  });
}

test('antimeridian geometry requires explicit preprocessing', () => {
  assert.throws(() => cameraExtentForGeometry({ type: 'LineString', coordinates: [[179, 0], [-179, 0]] }), hasCode('unsupported-bounds'));
});

test('world-spanning and polar fits fail before MapLibre could constrain the camera', () => {
  for (const extent of [[-180, -85, 180, 85], [-10, 84, 10, 85]]) {
    assert.throws(() => fitCameraToExtent(extent, viewports.portrait), hasCode('unsupported-bounds'));
  }
  assert.throws(() => fitCameraToExtent([0, 0, 0, 0], viewports.portrait, { maxZoom: 0 }), hasCode('unsupported-bounds'));
});

test('invalid manual cameras and unsupported polar framing are rejected atomically', () => {
  for (const camera of [
    { center: [0, 0], zoom: 23, bearing: 0, pitch: 0 },
    { center: [0, 0], zoom: 10, bearing: NaN, pitch: 0 },
    { center: [0, 0], zoom: 10, bearing: 0, pitch: 30 },
  ]) {
    const input = freeze({ ...step(), variantOverrides: { portrait: { camera } } });
    assert.throws(() => fitFocusStep(input, viewports), hasCode('invalid-camera'));
  }
  const input = freeze({ ...step(), variantOverrides: { portrait: { camera: { center: [0, 85], zoom: 1, bearing: 0, pitch: 0 } } } });
  const before = JSON.stringify(input);
  assert.throws(() => fitFocusStep(input, viewports), hasCode('unsupported-bounds'));
  assert.equal(JSON.stringify(input), before);
});
