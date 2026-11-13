import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseProject } from '../../packages/project-schema/src/index.ts';
import { evaluateFrame } from '../../packages/story-core/src/index.ts';
import { cameraExtentForGeometry, fitFocusStep } from '../../packages/story-core/src/camera.ts';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/synthetic-story/project.json', import.meta.url), 'utf8'));

test('saved fitted targets survive project round trip and shuffled frame evaluation', () => {
  const document = structuredClone(fixture);
  const scene = document.scenes[0];
  const sourceBefore = JSON.stringify(document.featureRevisions);
  const revisions = ['point-revision', 'line-revision', 'area-revision'];
  delete scene.focusFeatureRevisionId;
  scene.focusSteps = revisions.map((id, index) => {
    const geometry = document.featureRevisions.find(revision => revision.id === id).geometry;
    return fitFocusStep({
      id: `fit-${index}`, featureRevisionId: id,
      startFrame: index * 100, endFrameExclusive: (index + 1) * 100,
      extent: cameraExtentForGeometry(geometry),
      camera: { center: [0, 0], zoom: 10, bearing: 0, pitch: 0 },
      transition: index === 0 ? { kind: 'cut' } : { kind: 'linear', durationFrames: 10 },
      ...(index === 1 ? { variantOverrides: { portrait: {
        camera: { center: [0, 0], zoom: 13, bearing: 20, pitch: 0 },
      } } } : {}),
    }, document.outputVariants, { portrait: { padding: 80 }, landscape: { padding: 120 } });
  });
  const saved = parseProject(JSON.parse(JSON.stringify(document)));
  const savedBefore = JSON.stringify(saved);
  const snapshots = new Map();
  for (const variant of Object.keys(document.outputVariants)) {
    for (const frame of [0, 99, 100, 105, 110, 199, 200, 205, 210, 299]) {
      const state = evaluateFrame(saved, variant, frame);
      snapshots.set(`${variant}-${frame}`, JSON.stringify(state));
      const index = Math.floor(frame / 100);
      const step = saved.scenes[0].focusSteps[index];
      const geometry = saved.featureRevisions.find(revision => revision.id === revisions[index]).geometry;
      assert.deepEqual(state.focus.geometry, geometry);
      assert.deepEqual(state.focus.extent, step.variantOverrides[variant].extent);
      const elapsed = frame - index * 100;
      if (index === 0 || elapsed >= 10) assert.deepEqual(state.camera, step.variantOverrides[variant].camera);
      else if (elapsed === 0) assert.deepEqual(state.camera, saved.scenes[0].focusSteps[index - 1].variantOverrides[variant].camera);
    }
  }
  for (const variant of ['landscape', 'portrait', 'landscape']) {
    for (const frame of [299, 210, 205, 200, 199, 110, 105, 100, 99, 0, 100, 0]) {
      assert.equal(JSON.stringify(evaluateFrame(saved, variant, frame)), snapshots.get(`${variant}-${frame}`));
    }
  }
  assert.equal(JSON.stringify(saved), savedBefore);
  assert.equal(JSON.stringify(saved.featureRevisions), sourceBefore);
});
