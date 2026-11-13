import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { hashFrameState } from '../../apps/renderer/src/diagnostics.ts';
import { storyMetadata } from '../../apps/renderer/src/render-input.ts';
import { parseProject } from '../../packages/project-schema/src/index.ts';
import { evaluateFrame } from '../../packages/story-core/src/index.ts';

const fixture = JSON.parse(readFileSync(
  new URL('../fixtures/synthetic-story/project.json', import.meta.url), 'utf8',
));
const input = {
  project: fixture,
  resources: {
    style: { id: 'fixture-style', url: '/assets/bridge-style.json' },
    font: { id: 'fixture-font', url: '/assets/Inter-Regular.woff2' },
  },
  workerUrl: '/maplibre-gl-worker.mjs',
};

test('serialized render input determines both composition profiles without mutation', () => {
  const serialized = JSON.stringify(input);
  const cloned = JSON.parse(serialized);
  assert.deepEqual(storyMetadata(cloned, 'portrait'), {
    width: 1080, height: 1920, fps: 30, durationInFrames: 300,
  });
  assert.deepEqual(storyMetadata(cloned, 'landscape'), {
    width: 1920, height: 1080, fps: 30, durationInFrames: 300,
  });
  assert.equal(JSON.stringify(cloned), serialized);
  const invalid = structuredClone(cloned);
  invalid.project.scenes[0].durationFrames = 1.5;
  assert.throws(() => storyMetadata(invalid, 'portrait'));
});

test('diagnostic hashes identify evaluated frames independently of object key order', async () => {
  const project = parseProject(fixture);
  function reorder(value) {
    if (Array.isArray(value)) return value.map(reorder);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reorder(v)]));
    }
    return value;
  }
  const hashes = new Set();
  for (const variant of ['portrait', 'landscape']) {
    for (const frame of [299, 0, 149]) {
      const state = evaluateFrame(project, variant, frame);
      const hash = await hashFrameState(state);
      assert.match(hash, /^[a-f0-9]{64}$/);
      assert.equal(hash, await hashFrameState(reorder(state)));
      hashes.add(hash);
    }
  }
  assert.equal(hashes.size, 6);
});
