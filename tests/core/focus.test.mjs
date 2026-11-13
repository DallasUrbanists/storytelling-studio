import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { FocusValidationError, parseProject } from '../../packages/project-schema/src/index.ts';
import { evaluateFrame } from '../../packages/story-core/src/index.ts';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/synthetic-story/project.json', import.meta.url), 'utf8'));
const variants = ['portrait', 'landscape'];
const revisionIds = ['point-revision', 'line-revision', 'area-revision'];
const camera = index => ({ center: [index * 10, 0], zoom: index + 4, bearing: index * 20, pitch: 0 });
const step = index => ({
  id: `step-${index}`,
  featureRevisionId: revisionIds[index % revisionIds.length],
  startFrame: index * 60,
  endFrameExclusive: (index + 1) * 60,
  extent: [index * 10 - 1, -1, index * 10 + 1, 1],
  camera: camera(index),
  transition: index === 0 ? { kind: 'cut' } : { kind: 'linear', durationFrames: 10 },
});
function documentWith(steps = Array.from({ length: 5 }, (_, index) => step(index))) {
  const document = structuredClone(fixture);
  delete document.scenes[0].focusFeatureRevisionId;
  document.scenes[0].focusSteps = steps;
  return document;
}

test('five steps have explicit expected camera and focus at every frame in both variants', () => {
  const document = parseProject(documentWith());
  const input = JSON.stringify(document);
  for (const variant of variants) {
    const snapshots = new Map();
    for (let frame = 0; frame < 300; frame++) {
      const index = Math.floor(frame / 60);
      const elapsed = frame % 60;
      const progress = index === 0 ? 1 : Math.min(1, elapsed / 10);
      const state = evaluateFrame(document, variant, frame);
      const targetIndex = index === 0 ? 0 : index - 1 + progress;
      assert.ok(Math.abs(state.camera.center[0] - targetIndex * 10) < 1e-12);
      assert.equal(state.camera.center[1], 0);
      assert.ok(Math.abs(state.camera.zoom - (targetIndex + 4)) < 1e-12);
      assert.ok(Math.abs(state.camera.bearing - targetIndex * 20) < 1e-12);
      assert.equal(state.focus.stepId, `step-${index}`);
      assert.equal(state.focus.featureRevisionId, revisionIds[index % 3]);
      assert.deepEqual(state.focus.extent, step(index).extent);
      assert.equal(state.focus.transition.progress, progress);
      assert.deepEqual(state.focus.geometry, document.featureRevisions.find(r => r.id === state.focus.featureRevisionId).geometry);
      snapshots.set(frame, JSON.stringify(state));
    }
    // Every frame includes each start, last active frame, transition end and scene endpoint.
    for (const frame of [...Array.from({ length: 300 }, (_, i) => 299 - i), 299, 0, 149, 1, 299, 60, 60]) {
      assert.equal(JSON.stringify(evaluateFrame(document, variant, frame)), snapshots.get(frame));
    }
  }
  assert.equal(JSON.stringify(document), input);
});

test('empty sequence, single step and gaps use explicit null focus and scene camera time', () => {
  const baseline = parseProject(structuredClone(fixture));
  for (const steps of [[], [{ ...step(0), startFrame: 30, endFrameExclusive: 60 }], [
    { ...step(0), startFrame: 30, endFrameExclusive: 60 },
    { ...step(1), startFrame: 90, endFrameExclusive: 150, transition: { kind: 'cut' } },
  ]]) {
    const document = parseProject(documentWith(steps));
    for (const variant of variants) for (const frame of [299, 0, 29, 30, 59, 60, 89, 90, 149, 150, 299]) {
      const active = steps.find(s => frame >= s.startFrame && frame < s.endFrameExclusive);
      const state = evaluateFrame(document, variant, frame);
      if (active) {
        assert.equal(state.focus.stepId, active.id);
        assert.deepEqual(state.camera, active.camera);
      } else {
        assert.equal(state.focus, null);
        assert.deepEqual(state.camera, evaluateFrame(baseline, variant, frame).camera);
      }
    }
  }
});

test('retiming a reorder preserves IDs and repeated feature references without a count limit', () => {
  const steps = Array.from({ length: 12 }, (_, index) => ({
    ...step(index), startFrame: index * 25, endFrameExclusive: (index + 1) * 25,
    transition: { kind: 'cut' },
  }));
  const order = [11, 2, 0, 8, 3, 10, 5, 1, 9, 6, 4, 7];
  const reordered = order.map((index, slot) => ({ ...steps[index], startFrame: slot * 25, endFrameExclusive: (slot + 1) * 25 }));
  const document = parseProject(documentWith(reordered));
  assert.deepEqual(parseProject(JSON.parse(JSON.stringify(document))), document);
  for (const [slot, index] of order.entries()) for (const variant of variants) {
    for (const frame of [slot * 25 + 24, slot * 25]) {
      const state = evaluateFrame(document, variant, frame);
      assert.equal(state.focus.stepId, steps[index].id);
      assert.equal(state.focus.featureRevisionId, steps[index].featureRevisionId);
      assert.deepEqual(state.camera, steps[index].camera);
    }
  }
});

test('variant targets resolve for both endpoints before transition evaluation and stay immutable', () => {
  const input = documentWith();
  const steps = input.scenes[0].focusSteps;
  steps[0].variantOverrides = { portrait: { camera: { ...camera(0), zoom: 10, center: [179, 0], bearing: 350 } } };
  steps[1].variantOverrides = { portrait: {
    camera: { ...camera(1), zoom: 20, center: [-179, 0], bearing: 10 },
    extent: [-180, -2, -178, 2],
  } };
  const document = parseProject(input);
  const atStart = evaluateFrame(document, 'portrait', 60);
  assert.deepEqual(atStart.camera, steps[0].variantOverrides.portrait.camera);
  const middle = evaluateFrame(document, 'portrait', 65);
  assert.deepEqual(middle.camera, { center: [180, 0], zoom: 15, bearing: 0, pitch: 0 });
  assert.deepEqual(middle.focus.extent, [-180, -2, -178, 2]);
  assert.equal(middle.focus.transition.fromStepId, 'step-0');
  assert.deepEqual(evaluateFrame(document, 'portrait', 70).camera, steps[1].variantOverrides.portrait.camera);
  assert.equal(evaluateFrame(document, 'landscape', 65).camera.zoom, 4.5);
  assert.throws(() => { middle.focus.extent[0] = 0; }, TypeError);
  assert.throws(() => { middle.camera.center[0] = 0; }, TypeError);
  assert.equal(Object.isFrozen(steps[1].variantOverrides.portrait.extent), false);
  steps[1].variantOverrides.portrait.extent[0] = -179.5;
  steps[1].variantOverrides.portrait.camera.center[0] = -178;
  assert.equal(middle.focus.extent[0], -180);
  assert.equal(middle.camera.center[0], 180);
});

test('focus timing resets at scene boundaries and never inherits a previous scene camera', () => {
  const document = documentWith();
  const second = structuredClone(document.scenes[0]);
  second.id = 'second';
  second.focusSteps = [{ ...step(0), camera: camera(5) }];
  document.scenes.push(second);
  const parsed = parseProject(document);
  for (const frame of [599, 300, 359, 360, 299, 300]) {
    const state = evaluateFrame(parsed, 'portrait', frame);
    if (frame >= 300 && frame < 360) assert.deepEqual(state.camera, camera(5));
    if (frame >= 360) assert.equal(state.focus, null);
  }
});

const invalid = (name, mutate, code) => test(`focus validation: ${name}`, () => {
  const document = documentWith();
  mutate(document.scenes[0].focusSteps, document.scenes[0]);
  assert.throws(() => parseProject(document), error => {
    assert.ok(error instanceof FocusValidationError);
    assert.equal(error.code, code);
    assert.match(error.path, /^scene\.focusSteps/);
    return true;
  });
});
invalid('duplicate IDs', steps => { steps[1].id = steps[0].id; }, 'duplicate-step-id');
invalid('malformed ID', steps => { steps[0].id = '../step'; }, 'invalid-step-id');
invalid('overlap', steps => { steps[1].startFrame = 59; }, 'invalid-interval');
invalid('reorder without retiming', steps => { for (const step of steps) step.transition = { kind: 'cut' }; steps.reverse(); }, 'invalid-interval');
for (const [start, end] of [[-1, 60], [0, 0], [60, 0], [0.5, 60], [0, 301], [NaN, 60], [0, Infinity]]) {
  invalid(`interval ${start},${end}`, steps => { Object.assign(steps[0], { startFrame: start, endFrameExclusive: end }); }, 'invalid-interval');
}
invalid('missing revision', steps => { steps[4].featureRevisionId = 'missing'; }, 'missing-reference');
invalid('ambiguous legacy and sequence focus', (_, scene) => { scene.focusFeatureRevisionId = 'area-revision'; }, 'ambiguous-focus');
invalid('nonarray steps', (_, scene) => { scene.focusSteps = null; }, 'invalid-interval');
for (const extent of [[2, 0, 1, 1], [0, 2, 1, 1], [-181, 0, 0, 1], [0, 0, 181, 1], [0, -86, 1, 0], [0, 0, 1, 86], [0, NaN, 1, 1], [0, 0, 1], null]) {
  invalid(`extent ${extent}`, steps => { steps[0].extent = extent; }, 'invalid-extent');
}
for (const transition of [{ kind: 'ease' }, { kind: 'linear', durationFrames: 0 }, { kind: 'linear', durationFrames: 60 }, { kind: 'linear', durationFrames: 0.5 }, null]) {
  invalid(`transition ${JSON.stringify(transition)}`, steps => { steps[1].transition = transition; }, 'invalid-transition');
}
invalid('first step cannot interpolate from hidden state', steps => { steps[0].transition = { kind: 'linear', durationFrames: 1 }; }, 'invalid-transition');
invalid('linear transition across a gap', steps => { steps[1].startFrame = 61; }, 'invalid-transition');
invalid('variant cannot override time', steps => { steps[0].variantOverrides = { portrait: { startFrame: 1 } }; }, 'unsupported-field');
invalid('variant cannot override factual reference', steps => { steps[0].variantOverrides = { portrait: { featureRevisionId: 'line-revision' } }; }, 'unsupported-field');
invalid('unknown output variant', steps => { steps[0].variantOverrides = { square: {} }; }, 'unsupported-field');
invalid('null override', steps => { steps[0].variantOverrides = { portrait: null }; }, 'invalid-override');
invalid('bad override extent', steps => { steps[0].variantOverrides = { landscape: { extent: [0, 0, -1, 1] } }; }, 'invalid-extent');
invalid('incomplete override camera', steps => { steps[0].variantOverrides = { portrait: { camera: { zoom: 10 } } }; }, 'invalid-camera');
invalid('sparse extent', steps => { steps[0].extent = new Array(4); }, 'invalid-extent');
invalid('sparse camera center', steps => { steps[0].camera.center = new Array(2); }, 'invalid-camera');
invalid('unsupported camera field', steps => { steps[0].camera.roll = 1; }, 'unsupported-field');
invalid('unsupported transition field', steps => { steps[0].transition.durationFrames = 0; }, 'unsupported-field');
for (const patch of [{ pitch: 1 }, { center: [0, 90] }, { zoom: Infinity }, { bearing: NaN }]) {
  invalid(`camera ${JSON.stringify(patch)}`, steps => { Object.assign(steps[0].camera, patch); }, 'invalid-camera');
}

test('point extents and one-frame cut steps are valid', () => {
  const document = parseProject(documentWith([{ ...step(0), extent: [0, 0, 0, 0], endFrameExclusive: 1 }]));
  assert.equal(evaluateFrame(document, 'portrait', 0).focus.stepId, 'step-0');
  assert.equal(evaluateFrame(document, 'portrait', 1).focus, null);
});

