<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { evaluateFrame } from '../../../../packages/story-core/src/index';
import { mount } from '../../../../packages/map-adapter/src/mount';
import type { ProjectDocument } from '../../../../packages/project-schema/src/index';
const props = defineProps<{ project: ProjectDocument; variant: 'portrait' | 'landscape'; frame: number }>();
const host = ref<HTMLElement>(), area = ref<HTMLElement>(), scale = ref(.3), status = ref('Loading preview'), failed = ref(false);
const viewport = computed(() => props.project.outputVariants[props.variant]);
let surface: ReturnType<typeof mount> | undefined, key = '', sequence = 0, observer: ResizeObserver;
setWorkerUrl(workerUrl);
function resize() { if (area.value) scale.value = Math.min((area.value.clientWidth - 48) / viewport.value.width, (area.value.clientHeight - 48) / viewport.value.height); }
async function seek() {
  if (!host.value) return;
  const request = ++sequence; failed.value = false;
  try {
    const state = evaluateFrame(JSON.parse(JSON.stringify(props.project)), props.variant, props.frame);
    const style = props.project.assets.find(a => a.id === 'fixture-style'), font = props.project.assets.find(a => a.id === 'fixture-font');
    if (!style || !font) throw new Error('Restore the project’s local map style and font.');
    const identity = props.variant + style.sha256 + font.sha256;
    if (!surface || identity !== key) { surface?.dispose(); surface = mount(host.value, { style: { id: style.id, url: '/api/assets/' + style.sha256 }, font: { id: font.id, url: '/api/assets/' + font.sha256 } }, state.viewport); key = identity; }
    await surface.applyFrame(state, String(request));
    if (request === sequence) status.value = 'Frame ' + props.frame + ' · ready';
  } catch (error) { if (request === sequence) { failed.value = true; status.value = String(error); } }
  resize();
}
onMounted(() => { observer = new ResizeObserver(resize); observer.observe(area.value!); void seek(); });
watch(() => [props.project, props.variant, props.frame], seek, { deep: true });
onBeforeUnmount(() => { sequence++; observer?.disconnect(); surface?.dispose(); });
</script>
<template>
  <div ref="area" class="preview-area">
    <div class="preview-frame" :style="{ width: viewport.width * scale + 'px', height: viewport.height * scale + 'px' }">
      <div ref="host" :style="{ transform: `scale(${scale})`, transformOrigin: 'top left', width: viewport.width + 'px', height: viewport.height + 'px' }" />
    </div>
    <p class="preview-status" :class="{ failure: failed }" role="status">{{ status }}</p>
  </div>
</template>
<style scoped>
.preview-area { height: 100%; min-height: 300px; position: relative; display: flex; align-items: center; justify-content: center; background: #e7eceb; overflow: hidden; }
.preview-frame { background: #f5f3ed; box-shadow: 0 12px 36px #18383125; }
.preview-status { position: absolute; bottom: 0; left: 16px; max-width: calc(100% - 32px); font-size: 11px; color: #4f6863; padding: 4px; background: #e7ecebe8; }
.failure { color: #9d3030; font-size: 13px; }
</style>
