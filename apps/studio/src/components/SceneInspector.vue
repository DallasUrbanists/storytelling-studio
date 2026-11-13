<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { studio, edit } from '../stores/project-store';
import { fitGeometry, retimeProject, geometryPositions } from '../../../../packages/story-core/src/authoring';
import type { ProjectDocument, CameraKeyframe } from '../../../../packages/project-schema/src/index';
type Scene = ProjectDocument['scenes'][number];
const scene = computed(() => studio.document!.scenes.find(s => s.id === studio.selectedSceneId)!);
const features = computed(() => studio.document!.features.map(f => ({ label: f.name, value: f.currentRevisionId })));
const camera = computed(() => scene.value.variantOverrides?.[studio.variant]?.cameraTrack ?? scene.value.cameraTrack);
const draft = ref(''), showAdvanced = ref(false), focusRevision = ref('');
function change(fn: (scene: Scene, project: ProjectDocument) => void) { try { edit(p => { fn(p.scenes.find(s => s.id === studio.selectedSceneId)!, p); }); } catch (e) { studio.error = String(e); } }
function duration(value: string | number | null) {
  change((s, p) => { const frames = Math.round(Number(value) * 30); if (frames < 2 || frames > 108000) throw new Error('Use a duration from two frames through one hour.');
    s.durationFrames = frames;
    for (const track of [s.cameraTrack, ...Object.values(s.variantOverrides ?? {}).map(v => v.cameraTrack)]) { const kept = track.filter(k => k.frame < frames); track.splice(0, track.length, ...kept); }
    for (const a of s.annotations) { a.endFrameExclusive = Math.min(a.endFrameExclusive, frames); a.startFrame = Math.min(a.startFrame, frames - 1); a.fadeOutStartFrame = Math.max(a.startFrame, Math.min(a.fadeOutStartFrame, frames)); a.fadeInEndFrame = Math.min(a.fadeInEndFrame, a.fadeOutStartFrame); }
    if (s.roadway) { s.roadway.endFrame = Math.min(s.roadway.endFrame, frames - 1); s.roadway.startFrame = Math.min(s.roadway.startFrame, s.roadway.endFrame - 1); }
    if (s.focusSteps?.some(step => step.endFrameExclusive > frames)) throw new Error('Shorten the focus steps before reducing this scene.');
    Object.assign(p, retimeProject(p));
  });
}
function cameraEdit(index: number, field: string, value: unknown) {
  change(s => { s.variantOverrides ??= {}; s.variantOverrides[studio.variant] ??= { cameraTrack: JSON.parse(JSON.stringify(s.cameraTrack)) }; const key = s.variantOverrides[studio.variant]!.cameraTrack[index];
    if (field === 'longitude') key.center[0] = Number(value); else if (field === 'latitude') key.center[1] = Number(value); else if (field === 'easing') key.easing = value as CameraKeyframe['easing']; else (key as unknown as Record<string, unknown>)[field] = Number(value);
  });
}
function fit() { change((s, p) => { const selected = p.features.find(f => f.id === studio.selectedFeatureId); if (!selected) throw new Error('Select a feature to fit.'); const geometry = p.featureRevisions.find(r => r.id === selected.currentRevisionId)!.geometry; s.variantOverrides ??= {}; s.variantOverrides[studio.variant] = { cameraTrack: [fitGeometry(geometry, p.outputVariants[studio.variant])] }; }); }
function addKey() { change(s => { s.variantOverrides ??= {}; s.variantOverrides[studio.variant] ??= { cameraTrack: JSON.parse(JSON.stringify(s.cameraTrack)) }; const track = s.variantOverrides[studio.variant]!.cameraTrack; const frame = s.durationFrames - 1; if (track.some(k => k.frame === frame)) throw new Error('An endpoint keyframe already exists.'); track.push({ ...JSON.parse(JSON.stringify(track.at(-1))), frame }); }); }
function addLabel() { change(s => { const id = crypto.randomUUID(); s.annotations.push({ id, text: 'Place name', anchor: [...camera.value[0].center], leaderLine: { offset: [80, -80] }, startFrame: 0, fadeInEndFrame: Math.min(15, s.durationFrames - 1), fadeOutStartFrame: Math.max(Math.min(15, s.durationFrames - 1), s.durationFrames - 15), endFrameExclusive: s.durationFrames, fontSize: 48 }); }); }
function addFocus() { change((s, p) => {
  const revision = p.featureRevisions.find(r => r.id === focusRevision.value); if (!revision) throw new Error('Choose a focus feature.');
  if (!s.focusSteps) { delete s.focusFeatureRevisionId; s.focusSteps = []; }
  const start = s.focusSteps.at(-1)?.endFrameExclusive ?? 0, end = Math.min(s.durationFrames, start + 60); if (start >= end) throw new Error('Lengthen the scene before adding another focus step.');
  const positions = geometryPositions(revision.geometry), xs = positions.map(p => p[0]), ys = positions.map(p => p[1]);
  const padding = .00001, extent: [number,number,number,number] = [Math.min(...xs)-padding, Math.min(...ys)-padding, Math.max(...xs)+padding, Math.max(...ys)+padding];
  const { frame: _, easing: __, ...base } = fitGeometry(revision.geometry, p.outputVariants.landscape);
  const { frame: ___, easing: ____, ...portrait } = fitGeometry(revision.geometry, p.outputVariants.portrait);
  s.focusSteps.push({ id: crypto.randomUUID(), featureRevisionId: revision.id, startFrame: start, endFrameExclusive: end, extent, camera: base, transition: s.focusSteps.length ? { kind: 'linear', durationFrames: Math.min(20, end-start) } : { kind: 'cut' }, variantOverrides: { portrait: { camera: portrait } } });
}); }
watch(showAdvanced, value => { if (value) draft.value = JSON.stringify(scene.value, null, 2); });
function applyAdvanced() { change((s, p) => { const next = JSON.parse(draft.value); if (next.id !== s.id) throw new Error('Keep the scene identity unchanged.'); p.scenes[p.scenes.indexOf(s)] = next; Object.assign(p, retimeProject(p)); }); }
</script>
<template><div v-if="scene" class="inspector-body">
<div class="eyebrow">Scene settings</div><q-input :model-value="scene.title" outlined dense label="Scene name" @update:model-value="v => change(s => s.title = String(v))" />
<q-input :model-value="scene.durationFrames / 30" type="number" step="0.1" min="0.1" max="3600" outlined dense label="Duration (seconds)" @change="e => duration(e.target.value)" />
<q-input :model-value="scene.caption" outlined dense type="textarea" rows="2" maxlength="240" label="On-screen caption" @update:model-value="v => change(s => s.caption = String(v))" />
<q-input :model-value="scene.credit" outlined dense type="textarea" rows="2" maxlength="400" label="On-screen source credit" @update:model-value="v => change(s => s.credit = String(v))" />
<q-expansion-item label="Camera & framing" default-opened><div class="section-stack"><p class="hint">{{ studio.variant }} framing · saved separately for each format</p><div class="button-row"><q-btn outline size="sm" label="Fit selected" @click="fit" /><q-btn outline size="sm" label="Add end keyframe" @click="addKey" /></div>
<div v-for="(key, index) in camera" :key="index" class="mini-card"><b>Keyframe {{ index + 1 }}</b><div class="form-grid">
<q-input :model-value="key.frame" dense type="number" label="Frame" @change="e => cameraEdit(index, 'frame', e.target.value)" />
<q-input :model-value="key.zoom" dense type="number" step="0.1" label="Zoom" @change="e => cameraEdit(index, 'zoom', e.target.value)" />
<q-input :model-value="key.center[0]" dense type="number" step=".001" label="Longitude" @change="e => cameraEdit(index, 'longitude', e.target.value)" />
<q-input :model-value="key.center[1]" dense type="number" step=".001" label="Latitude" @change="e => cameraEdit(index, 'latitude', e.target.value)" />
<q-input :model-value="key.bearing" dense type="number" label="Bearing" @change="e => cameraEdit(index, 'bearing', e.target.value)" /><q-select :model-value="key.easing" :options="['linear','ease-in-out']" dense label="Easing" @update:model-value="v => cameraEdit(index, 'easing', v)" />
</div></div></div></q-expansion-item>
<q-expansion-item label="Focus sequence"><div class="section-stack"><p class="hint">Add a city, corridor, neighborhood, then site. Steps retain the exact geometry revision.</p><q-select v-model="focusRevision" dense outlined :options="features" emit-value map-options label="Focus feature" /><q-btn outline size="sm" label="Append two-second focus" @click="addFocus" /><div v-for="(step, i) in scene.focusSteps" :key="step.id" class="mini-card">{{ i + 1 }} · {{ features.find(f => f.value === step.featureRevisionId)?.label }} · {{ step.startFrame }}–{{ step.endFrameExclusive }}<q-btn flat size="sm" label="Remove" @click="change(s => s.focusSteps!.splice(i, 1))" /></div><p class="hint">Exact step timing and transition settings are available in scene data below.</p></div></q-expansion-item>
<q-expansion-item label="Labels & leader lines"><div class="section-stack"><q-btn outline size="sm" label="Add label" @click="addLabel" /><div v-for="(a, i) in scene.annotations" :key="a.id" class="mini-card"><q-input :model-value="a.text" dense label="Label" @update:model-value="v => change(s => s.annotations[i].text = String(v))" /><div class="form-grid"><q-input v-for="(axis, j) in ['Longitude','Latitude']" :key="axis" :model-value="a.anchor[j]" dense type="number" step=".001" :label="axis" @change="e => change(s => s.annotations[i].anchor[j] = Number(e.target.value))" /><q-input :model-value="a.fontSize ?? 48" dense type="number" min="16" max="128" label="Font size" @change="e => change(s => s.annotations[i].fontSize = Number(e.target.value))" /><q-input v-for="(axis, j) in ['Offset X','Offset Y']" :key="axis" :model-value="a.variantOffsets?.[studio.variant]?.[j] ?? a.leaderLine?.offset[j] ?? 0" dense type="number" :label="axis" @change="e => change(s => { const item = s.annotations[i]; item.variantOffsets ??= {}; item.variantOffsets[studio.variant] ??= [...(item.leaderLine?.offset ?? [0,0])]; item.variantOffsets[studio.variant]![j] = Number(e.target.value); })" /></div><div class="form-grid"><q-input v-for="field in ['startFrame','fadeInEndFrame','fadeOutStartFrame','endFrameExclusive']" :key="field" :model-value="a[field]" type="number" dense :label="({startFrame:'Enter frame',fadeInEndFrame:'Fully visible',fadeOutStartFrame:'Fade out frame',endFrameExclusive:'Exit frame'})[field]" @change="e=>change(s=>s.annotations[i][field]=Number(e.target.value))" /></div><q-btn flat size="sm" color="negative" label="Remove label" @click="change(s => s.annotations.splice(i, 1))" /></div></div></q-expansion-item>
<q-expansion-item label="Area emphasis"><div class="section-stack"><q-select :model-value="scene.outsideDimming?.featureRevisionId" :options="features.filter(f => studio.document!.features.find(x => x.currentRevisionId === f.value)?.kind === 'area')" emit-value map-options clearable dense outlined label="Dim outside area" @update:model-value="v => change(s => { if (v) s.outsideDimming = { featureRevisionId: v, opacity: .6 }; else delete s.outsideDimming; })" /><q-slider v-if="scene.outsideDimming" :model-value="scene.outsideDimming.opacity" :min="0" :max="1" :step=".05" label @update:model-value="v => change(s => s.outsideDimming!.opacity = Number(v))" /></div></q-expansion-item>
<q-expansion-item v-model="showAdvanced" label="Exact scene data"><div class="section-stack"><p class="hint">Edit timing, focus extents, fades, and per-format overrides. Invalid changes are rejected.</p><q-input v-model="draft" type="textarea" rows="14" input-class="code-input" outlined /><q-btn outline label="Apply scene data" @click="applyAdvanced" /></div></q-expansion-item>
</div></template>
