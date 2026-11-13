<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { Map, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { fitGeometry } from '../../../../packages/story-core/src/authoring';
import type { ProjectDocument, Geometry, Position } from '../../../../packages/project-schema/src/index';
const props = defineProps<{ project: ProjectDocument; selected: string }>();
const emit = defineEmits(['select', 'camera', 'draw']);
const host = ref<HTMLElement>(), message = ref('Pan and zoom to explore your imported geography.');
let map: Map | undefined, alive = true, drawMode = '', points: Position[] = [];
setWorkerUrl(workerUrl);
function update() {
  if (!map?.getSource('library')) return;
  const features = props.project.features.map(feature => ({ type: 'Feature' as const, properties: { id: feature.id, selected: feature.id === props.selected }, geometry: props.project.featureRevisions.find(r => r.id === feature.currentRevisionId)!.geometry }));
  (map.getSource('library') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
}
function fit(id: string) {
  const feature = props.project.features.find(f => f.id === id), revision = props.project.featureRevisions.find(r => r.id === feature?.currentRevisionId);
  if (revision && map) map.jumpTo(fitGeometry(revision.geometry, { width: Math.max(300, host.value!.clientWidth), height: Math.max(300, host.value!.clientHeight) }, 60));
}
function draw(mode: string) { drawMode = mode; points = []; updateDrawing(); if (map) map.getCanvas().style.cursor = mode ? 'crosshair' : ''; message.value = mode ? 'Click to place vertices. Finish drawing when the outline is ready; Escape cancels.' : 'Pan and zoom to explore.'; }
function updateDrawing() {
  const source = map?.getSource('draft') as GeoJSONSource | undefined; if (!source) return;
  const features: GeoJSON.Feature[] = points.map(coordinates => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates } }));
  if (points.length > 1) features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } });
  source.setData({ type: 'FeatureCollection', features });
}
function finish() {
  let geometry: Geometry;
  if (drawMode === 'Point' && points.length === 1) geometry = { type: 'Point', coordinates: points[0] };
  else if (drawMode === 'LineString' && points.length >= 2) geometry = { type: 'LineString', coordinates: points };
  else if (drawMode === 'Polygon' && points.length >= 3) geometry = { type: 'Polygon', coordinates: [[...points, points[0]]] };
  else { message.value = 'Place enough distinct vertices before finishing.'; return; }
  emit('draw', geometry); draw('');
}
function keydown(event: KeyboardEvent) { if (event.key === 'Escape') draw(''); }
defineExpose({ fit, draw, finish });
onMounted(async () => {
  try {
    const asset = props.project.assets.find(a => a.id === 'fixture-style');
    const response = await fetch('/api/assets/' + asset?.sha256); if (!response.ok) throw new Error('The saved map style is missing.');
    const style = await response.json(); if (!alive) return;
    map = new Map({ container: host.value!, style, center: props.project.scenes[0].cameraTrack[0].center, zoom: props.project.scenes[0].cameraTrack[0].zoom, attributionControl: false, dragRotate: false, pitchWithRotate: false, transformRequest: () => { throw new Error('This offline map requires inline source data.'); } });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map!.addSource('library', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map!.addLayer({ id: 'areas', source: 'library', type: 'fill', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#117968', 'fill-opacity': .2 } });
      map!.addLayer({ id: 'outlines', source: 'library', type: 'line', filter: ['!=', '$type', 'Point'], paint: { 'line-color': ['case', ['get', 'selected'], '#b06a28', '#177969'], 'line-width': ['case', ['get', 'selected'], 4, 2] } });
      map!.addLayer({ id: 'points', source: 'library', type: 'circle', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 7, 'circle-color': '#b06a28', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
      map!.addSource('draft', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map!.addLayer({ id: 'draft-lines', source: 'draft', type: 'line', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#b2743d', 'line-width': 3, 'line-dasharray': [2,2] } });
      map!.addLayer({ id: 'draft-points', source: 'draft', type: 'circle', filter: ['==', '$type', 'Point'], paint: { 'circle-color': '#b2743d', 'circle-radius': 5, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      update(); if (props.selected) fit(props.selected);
    });
    map.on('moveend', () => { const c = map!.getCenter(); emit('camera', { frame: 0, center: [c.lng, c.lat], zoom: map!.getZoom(), bearing: map!.getBearing(), pitch: 0, easing: 'ease-in-out' }); });
    map.on('click', event => {
      if (drawMode) { points.push([event.lngLat.lng, event.lngLat.lat]); updateDrawing(); message.value = points.length + ' vertices placed. Finish drawing to save the feature.'; if (drawMode === 'Point') finish(); return; }
      const feature = map!.queryRenderedFeatures(event.point, { layers: ['points','outlines','areas'] })[0]; if (feature) emit('select', feature.properties.id);
    });
    map.on('error', event => message.value = event.error.message);
    window.addEventListener('keydown', keydown);
  } catch (error) { message.value = String(error); }
});
watch(() => [props.project, props.selected], update, { deep: true });
onBeforeUnmount(() => { alive = false; map?.remove(); window.removeEventListener('keydown', keydown); });
</script>
<template><div class="explore-map"><div ref="host" class="map-host" /><p role="status">{{ message }}</p><span class="map-note">Local map · imported sources only</span></div></template>
<style scoped>.explore-map { height: 100%; position: relative; min-height: 300px; }.map-host { height: 100%; }.explore-map p { position: absolute; left: 16px; bottom: 12px; max-width: 70%; padding: 9px 12px; background: #fffffff0; border-radius: 8px; font-size: 12px; }.map-note { position: absolute; left: 16px; top: 16px; padding: 6px 10px; background: #fffffff0; border-radius: 6px; font-size: 11px; }</style>
