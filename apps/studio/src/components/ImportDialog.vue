<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { importGeometry, studio, reviseSource } from '../stores/project-store';
import type { ProjectDocument } from '../../../../packages/project-schema/src/index';
const props = defineProps<{ replaceId?: string; sourceId?: string }>();
const emit = defineEmits(['done']);
const file = ref<File>(), busy = ref(false), error = ref('');
const form = reactive({ title: '', publisher: '', url: '', version: '', period: '', vintage: '', notes: '', interpretation: 'official' as 'official' | 'editorial' | 'synthetic', local: false, publication: false, redistribution: false });
async function submit() {
  if ((!props.sourceId && !file.value) || !form.title.trim() || !form.publisher.trim() || !form.local) { error.value = 'Choose a GeoJSON file, name its source and publisher, and confirm local-use permission.'; return; }
  busy.value = true; error.value = '';
  try {
    const source: ProjectDocument['sources'][number] = { id: crypto.randomUUID(), title: form.title, sourceKind: 'dataset', publisher: form.publisher, version: form.version || null, referencePeriod: form.period || null, boundaryVintage: form.vintage || null, contentSha256: null, universe: null,
      rights: { localUse: 'allowed', publication: form.publication ? 'allowed' : 'unknown', redistribution: form.redistribution ? 'allowed' : 'unknown' }, interpretation: form.interpretation, retrievedAt: new Date().toISOString(), ...(form.url ? { url: form.url } : {}), ...(form.notes ? { notes: form.notes } : {}) };
    if (props.sourceId) { const old = studio.document!.sources.find(s => s.id === props.sourceId)!; if (old.sourceKind === 'dataset') { source.contentSha256 = old.contentSha256; source.universe = old.universe; if (old.retrievedAt) source.retrievedAt = old.retrievedAt; else delete source.retrievedAt; if (old.serviceDate) source.serviceDate = old.serviceDate; } reviseSource(props.sourceId, source); }
    else await importGeometry(file.value!, source, props.replaceId); emit('done');
  } catch (problem) { error.value = String(problem); } finally { busy.value = false; }
}
onMounted(() => { const old = studio.document!.sources.find(s => s.id === props.sourceId); if (old?.sourceKind === 'dataset') Object.assign(form, { title: old.title, publisher: old.publisher, url: old.url ?? '', version: old.version ?? '', period: old.referencePeriod ?? '', vintage: old.boundaryVintage ?? '', notes: old.notes ?? '', interpretation: old.interpretation ?? 'official', local: old.rights.localUse === 'allowed', publication: old.rights.publication === 'allowed', redistribution: old.rights.redistribution === 'allowed' }); });
</script>
<template><q-card class="dialog-card"><q-card-section><div class="eyebrow">Source library</div><h2>{{ sourceId ? 'Revise source evidence' : replaceId ? 'Replace geometry' : 'Import geography' }}</h2><p v-if="sourceId">This creates a new source record and geometry references throughout the current story. Previous revisions remain intact; affected research and walksheds require review again.</p><p v-else>Keep original coordinates and source evidence together. Replacing geometry creates a new revision; existing scenes retain their saved revision.</p></q-card-section>
<q-card-section class="form-grid"><label v-if="!sourceId" class="full">GeoJSON file<input type="file" accept=".geojson,.json,application/geo+json" @change="file = ($event.target as HTMLInputElement).files?.[0]" /></label>
<q-input v-model="form.title" outlined dense label="Source title" /><q-input v-model="form.publisher" outlined dense label="Publisher / author" />
<q-input v-model="form.url" class="full" outlined dense label="Source URL" /><q-input v-model="form.version" outlined dense label="Dataset version" /><q-input v-model="form.period" outlined dense label="Reference period / service date" />
<q-input v-model="form.vintage" outlined dense label="Boundary vintage" /><q-select v-model="form.interpretation" outlined dense label="Interpretation" :options="['official','editorial','synthetic']" />
<q-input v-model="form.notes" class="full" outlined dense type="textarea" rows="2" label="License, credit, and interpretation notes" />
<div class="full"><q-checkbox v-model="form.local" label="I have permission for local use" /><q-checkbox v-model="form.publication" label="Video publication is permitted" /><q-checkbox v-model="form.redistribution" label="Redistributing the source file is permitted" /></div>
<p v-if="error" role="alert" class="error full">{{ error }}</p></q-card-section><q-card-actions align="right"><q-btn flat label="Cancel" v-close-popup /><q-btn color="primary" :loading="busy" :disable="!studio.document"  :label="sourceId ? 'Apply to the story' : 'Import into project'" @click="submit" /></q-card-actions></q-card></template>
