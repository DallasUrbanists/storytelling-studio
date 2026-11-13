<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import fixture from '../../../../tests/fixtures/synthetic-story/project.json';
import styleUrl from '../../../../tests/fixtures/synthetic-story/assets/bridge-style.json?url';
import fontUrl from '../../../../tests/fixtures/synthetic-story/assets/Inter-Regular.woff2?url';
import { parseProject } from '@gstory/project-schema';
import { evaluateFrame } from '@gstory/story-core';
import { mount } from '@gstory/map-adapter';

const props = defineProps({ frame: { type: Number, required: true }, variant: { type: String, required: true } });
const host = ref(null);
const status = ref('Loading frame');
const project = parseProject(structuredClone(fixture));
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
freeze(project);
setWorkerUrl(workerUrl);
let surface;
let mountedVariant;
let sequence = 0;
let alive = true;
const diagnostic = { requestedFrame: null, variant: null, readiness: 'idle', stateHash: null, error: null };
window.__GSTORY_BRIDGE__ = diagnostic;

async function stateHash(state) {
  const canonical = JSON.stringify(state, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function seek() {
  const request = ++sequence;
  Object.assign(diagnostic, { requestedFrame: props.frame, variant: props.variant, readiness: 'pending', stateHash: null, error: null });
  status.value = 'Loading frame';
  try {
    const state = evaluateFrame(project, props.variant, props.frame);
    if (!surface || mountedVariant !== props.variant) {
      surface?.dispose();
      surface = mount(host.value, {
        style: { id: 'fixture-style', url: styleUrl },
        font: { id: 'fixture-font', url: fontUrl },
      }, state.viewport);
      mountedVariant = props.variant;
    }
    const currentSurface = surface;
    const [hash] = await Promise.all([stateHash(state), currentSurface.applyFrame(state, String(request))]);
    if (!alive || request !== sequence) return;
    Object.assign(diagnostic, { readiness: currentSurface.inspectReadiness().status, stateHash: hash });
    status.value = 'Frame ready';
  } catch (error) {
    if (!alive || request !== sequence) return;
    Object.assign(diagnostic, { readiness: 'failed', error: String(error) });
    status.value = `Frame error: ${String(error)}`;
  }
}
onMounted(seek);
watch(() => [props.frame, props.variant], seek);
onBeforeUnmount(() => {
  alive = false;
  sequence++;
  surface?.dispose();
  if (window.__GSTORY_BRIDGE__ === diagnostic) delete window.__GSTORY_BRIDGE__;
});
</script>

<template>
  <p role="status" aria-live="polite">{{ status }}</p>
  <div class="viewport" :class="variant"><div ref="host" class="surface" :style="{ visibility: status === 'Frame ready' ? 'visible' : 'hidden' }" /></div>
</template>

<style scoped>
.viewport { overflow: hidden; background: #eee; }
.viewport.landscape { width: 480px; height: 270px; }
.viewport.portrait { width: 270px; height: 480px; }
.surface { transform: scale(0.25); transform-origin: top left; }
</style>
