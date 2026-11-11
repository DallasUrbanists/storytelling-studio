import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseProject } from '../../packages/project-schema/src/index.ts';
import { evaluateFrame } from '../../packages/story-core/src/index.ts';
import { tracePath } from '../../packages/story-core/src/geometry.ts';

const fixture = JSON.parse(readFileSync(
  new URL('../fixtures/synthetic-story/project.json', import.meta.url),
  'utf8',
));
const project = parseProject(fixture);
const variantIds = ['portrait', 'landscape'];
const requiredFrames = [0, 1, 149, 150, 299];

function projectWith(edit) {
  const document = structuredClone(fixture);
  edit(document);
  return parseProject(document);
}

function cameraValues({ center, zoom, bearing, pitch }) {
  return { center, zoom, bearing, pitch };
}

function layerAt(frame, id, document = project) {
  return evaluateFrame(document, 'portrait', frame).layers.find(layer => layer.id === id);
}

function opacityAt(frame, document = project) {
  return evaluateFrame(document, 'portrait', frame).annotations[0].opacity;
}

test('both variants reproduce fixture frames through reverse and shuffled seeks', () => {
  for (const variantId of variantIds) {
    const expected = new Map(requiredFrames.map(frame => [
      frame, evaluateFrame(project, variantId, frame),
    ]));
    const seeks = [
      ...requiredFrames.toReversed(), 299, 0, 149, 1, 299, 150, 150,
    ];
    for (const frame of seeks) {
      const result = evaluateFrame(project, variantId, frame);
      assert.deepEqual(result, expected.get(frame));
      assert.equal(JSON.stringify(result), JSON.stringify(expected.get(frame)));
      assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    }
  }
});

test('the first and last frames use the saved camera in each fixed viewport', () => {
  const track = project.scenes[0].cameraTrack;
  for (const [variantId, width, height] of [
    ['portrait', 1080, 1920],
    ['landscape', 1920, 1080],
  ]) {
    for (const [frame, keyframe] of [[0, track[0]], [299, track[1]]]) {
      const state = evaluateFrame(project, variantId, frame);
      assert.equal(state.frame, frame);
      assert.equal(state.sceneId, 'scene-fictional');
      assert.equal(state.variantId, variantId);
      assert.deepEqual(state.viewport, { width, height, pixelRatio: 1 });
      assert.deepEqual(state.camera, cameraValues(keyframe));
      assert.equal(state.focus.featureRevisionId, 'area-revision');
    }
  }
});

test('frame evaluation rejects invalid frame and variant values', () => {
  for (const frame of [-1, 300, 301, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1']) {
    assert.throws(() => evaluateFrame(project, 'portrait', frame), RangeError);
  }
  for (const variantId of ['square', 'toString', undefined]) {
    assert.throws(() => evaluateFrame(project, variantId, 0), RangeError);
  }
});

test('the frame snapshot is immutable and independent of project storage', () => {
  const input = projectWith(() => {});
  const state = evaluateFrame(input, 'portrait', 149);
  const serializedInput = JSON.stringify(input);
  assert.throws(() => { state.camera.center[0] = 123; }, TypeError);
  assert.throws(() => { state.layers[0].visible = false; }, TypeError);
  assert.throws(() => { state.layers[1].trace.coordinates.push([0, 0]); }, TypeError);
  assert.throws(() => { state.focus.geometry.coordinates[0][0][0] = 123; }, TypeError);
  assert.throws(() => { state.annotations[0].anchor[0] = 123; }, TypeError);
  assert.equal(JSON.stringify(input), serializedInput);
  assert.equal(Object.isFrozen(input.featureRevisions[2].geometry), false);
  input.featureRevisions[2].geometry.coordinates[0][0][0] = 0.001;
  assert.equal(state.focus.geometry.coordinates[0][0][0], 0);
});

test('the camera interpolates Mercator coordinates and holds the last saved keyframe', () => {
  const input = projectWith(document => {
    const track = document.scenes[0].cameraTrack;
    Object.assign(track[0], { center: [179, 0], zoom: 8, bearing: 350 });
    Object.assign(track[1], { frame: 100, center: [-179, 60], zoom: 16, bearing: 10 });
  });
  const middle = evaluateFrame(input, 'landscape', 50).camera;
  assert.equal(middle.center[0], 180);
  assert.ok(Math.abs(middle.center[1] - 35.264389682754654) < 1e-12);
  assert.equal(middle.zoom, 12);
  assert.equal(middle.bearing, 0);
  const last = cameraValues(input.scenes[0].cameraTrack[1]);
  assert.deepEqual(evaluateFrame(input, 'landscape', 100).camera, last);
  assert.deepEqual(evaluateFrame(input, 'landscape', 299).camera, last);
});

test('an exact half turn takes the positive bearing direction', () => {
  const input = projectWith(document => {
    Object.assign(document.scenes[0].cameraTrack[1], { frame: 100, bearing: -180 });
  });
  assert.equal(evaluateFrame(input, 'portrait', 50).camera.bearing, 90);
  assert.equal(evaluateFrame(input, 'portrait', 100).camera.bearing, -180);
});

test('scenes use local camera and label time while layer visibility uses project time', () => {
  const input = projectWith(document => {
    const scene = structuredClone(document.scenes[0]);
    scene.id = 'second-scene';
    scene.cameraTrack[0].zoom = 10;
    document.scenes.push(scene);
    const [point, line, area] = document.layers;
    line.order = area.order;
    point.startFrame = 300;
    point.endFrameExclusive = 600;
  });
  const previous = evaluateFrame(input, 'portrait', 299);
  const first = evaluateFrame(input, 'portrait', 300);
  assert.deepEqual(first.layers.map(layer => layer.id), ['point-layer', 'area-layer', 'line-layer']);
  assert.deepEqual(previous.layers.map(layer => layer.visible), [false, true, true]);
  assert.deepEqual(first.layers.map(layer => layer.visible), [true, false, false]);
  assert.equal(first.sceneId, 'second-scene');
  assert.equal(first.camera.zoom, 10);
  assert.equal(opacityAt(300, input), 0);
  assert.equal(opacityAt(360, input), 1);
  assert.throws(() => evaluateFrame(input, 'portrait', 600), RangeError);
});

test('the fixture line and polygon traces have empty, partial, and complete states', () => {
  for (const [id, mode] of [['line-layer', 'line'], ['area-layer', 'outer-ring']]) {
    for (const frame of [29, 30]) {
      assert.deepEqual(layerAt(frame, id).trace, { mode, progress: 0, coordinates: [] });
    }
    const partial = layerAt(150, id).trace;
    assert.equal(partial.progress, 0.8);
    assert.ok(partial.coordinates.length >= 2);
    for (const frame of [180, 299]) {
      const layer = layerAt(frame, id);
      const path = id === 'line-layer'
        ? layer.geometry.coordinates
        : layer.geometry.coordinates[0];
      assert.deepEqual(layer.trace, { mode, progress: 1, coordinates: path });
    }
  }
});

test('traces use geographic segment lengths and handle repeated or zero-length positions', () => {
  const uneven = [[0, 0], [1, 0], [1, 0], [5, 0]];
  const partial = tracePath(uneven, 0.5);
  assert.deepEqual(partial.slice(0, -1), uneven.slice(0, 3));
  assert.ok(Math.abs(partial.at(-1)[0] - 2.5) < 1e-12);
  assert.equal(partial.at(-1)[1], 0);
  assert.deepEqual(tracePath([[0, 0], [1, 0], [2, 0]], 0.5), [[0, 0], [1, 0]]);
  const zeroLength = [[1, 1], [1, 1]];
  assert.deepEqual(tracePath(zeroLength, 0.5), []);
  assert.deepEqual(tracePath(zeroLength, 1), zeroLength);
  assert.throws(() => projectWith(document => {
    document.featureRevisions[1].geometry.coordinates = zeroLength;
  }), /geometry has no distinct positions/);
});

test('the partial trace follows geographic distance along the rendered Mercator segment', () => {
  assert.deepEqual(tracePath([[0, 0], [0, 80]], 0.5), [[0, 0], [0, 40]]);

  const path = [[0, 0], [30, 80]];
  const partial = tracePath(path, 0.5);
  const projectedLatitude = latitude =>
    Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
  const expectedLongitude = 30 * projectedLatitude(40) / projectedLatitude(80);
  assert.ok(Math.abs(partial[1][0] - expectedLongitude) < 1e-12);
  assert.equal(partial[1][1], 40);

  const multiSegment = tracePath([[0, 0], [0, 80], [120, 80]], 0.5);
  assert.equal(multiSegment.length, 2);
  assert.equal(multiSegment[1][0], 0);
  const expectedLatitude = (80 + 120 * Math.cos(80 * Math.PI / 180)) / 2;
  assert.ok(Math.abs(multiSegment[1][1] - expectedLatitude) < 1e-12);

  const almostParallel = tracePath([[0, 80], [30, 80.00000000000001]], 0.5);
  assert.ok(Math.abs(almostParallel[1][0] - 15) < 1e-12);
});

test('polygon fills retain interior rings and the trace follows only the exterior', () => {
  const hole = [[0.005, 0.005], [0.005, 0.015], [0.015, 0.015], [0.005, 0.005]];
  const input = projectWith(document => {
    document.featureRevisions[2].geometry.coordinates.push(hole);
  });
  const polygon = input.featureRevisions[2].geometry;
  const partial = layerAt(149, 'area-layer', input);
  const complete = layerAt(180, 'area-layer', input);
  assert.deepEqual(partial.geometry, polygon);
  assert.deepEqual(complete.geometry, polygon);
  assert.deepEqual(partial.trace.coordinates, tracePath(polygon.coordinates[0], 119 / 150));
  assert.deepEqual(complete.trace.coordinates, polygon.coordinates[0]);
});

test('label opacity obeys half-open visibility and both fade boundaries', () => {
  for (const [frame, opacity] of [
    [29, 0], [30, 0], [31, 1 / 30], [45, 0.5], [59, 29 / 30], [60, 1],
    [239, 1], [240, 1], [241, 29 / 30], [255, 0.5], [269, 1 / 30], [270, 0],
  ]) {
    assert.equal(opacityAt(frame), opacity);
  }
});

test('zero-duration label fades are explicit steps', () => {
  const input = projectWith(document => {
    const label = document.scenes[0].annotations[0];
    label.fadeInEndFrame = label.startFrame;
    label.fadeOutStartFrame = label.endFrameExclusive;
  });
  for (const [frame, opacity] of [[29, 0], [30, 1], [269, 1], [270, 0]]) {
    assert.equal(opacityAt(frame, input), opacity);
  }
});
