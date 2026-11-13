<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { studio, edit } from '../stores/project-store';
import { uploadAsset } from '../services/local-api';
const props = defineProps<{ revisionId: string }>();
const existing = computed(() => studio.document!.walksheds?.find(w => w.featureRevisionId === props.revisionId));
const graph = ref<File>(), network = ref<File>(), error = ref(''), busy = ref(false), rights = ref(false), confirmed = ref(false);
const form = reactive({ tool: '', version: '', date: '', speed: 1.34, origins: '[]', barriers: '', assumptions: '', limitations: '', reviewer: '', reviewNotes: '' });
async function attach() {
  busy.value = true; error.value = '';
  try {
    if (!graph.value || !network.value || !rights.value) throw new Error('Supply both the reachable network and source network files, with local use and redistribution permission.');
    const reachable = await uploadAsset(graph.value,'application/json'), source = await uploadAsset(network.value,'application/json');
    const graphId = crypto.randomUUID(), sourceId = crypto.randomUUID();
    edit(p => {
      for (const [id, asset, name] of [[graphId,reachable,'Reachable pedestrian network'],[sourceId,source,'Source pedestrian network']] as const) p.assets.push({ id, path: 'assets/' + asset.sha256 + '.json', sha256: asset.sha256, mediaType: 'application/json', permission: { localUse: true, publication: true, redistribution: true, license: 'Permission confirmed by importing author; see evidence packet', credit: name } });
      const record = { featureRevisionId: props.revisionId, durationSeconds: 600 as const, method: 'pedestrian-network' as const, tool: form.tool, toolVersion: form.version, networkDate: form.date, networkSha256: source.sha256, speedMetersPerSecond: form.speed, origins: JSON.parse(form.origins), reachableNetworkAssetId: graphId, sourceAssetIds: [sourceId], barriers: form.barriers, assumptions: form.assumptions, limitations: form.limitations };
      p.walksheds ??= []; const index = p.walksheds.findIndex(w => w.featureRevisionId === props.revisionId); if (index < 0) p.walksheds.push(record); else p.walksheds[index] = record;
      for (const layer of p.layers.filter(l => l.featureRevisionId === props.revisionId)) layer.group = 'walkshed';
    });
  } catch(e) { error.value = String(e); } finally { busy.value = false; }
}
function review() { try { if (!confirmed.value || !form.reviewer.trim() || !form.reviewNotes.trim()) throw new Error('Record a reviewer and notes about origins, crossings, and barriers.'); edit(p => { const w = p.walksheds!.find(w => w.featureRevisionId === props.revisionId)!; w.technicalReview = { reviewer: form.reviewer, reviewedAt: new Date().toISOString(), notes: form.reviewNotes }; }); } catch(e) { error.value = String(e); } }
</script>
<template><div class="section-stack"><p class="hint">A 10-minute walkshed must come from a pedestrian network, not a circular buffer. Import its polygon first, then attach the retained network evidence.</p>
<div v-if="existing" class="notice">{{ existing.tool }} {{ existing.toolVersion }} · {{ existing.durationSeconds }} seconds · {{ existing.technicalReview ? 'Technical review recorded' : 'Technical review needed' }}</div>
<div class="form-grid"><q-input v-model="form.tool" dense outlined label="Routing tool" /><q-input v-model="form.version" dense outlined label="Tool version" /><q-input v-model="form.date" type="date" dense outlined label="Network date" stack-label /><q-input v-model.number="form.speed" type="number" step=".01" dense outlined label="Walking speed (m/s)" /></div>
<q-input v-model="form.origins" outlined dense label="Origin coordinates [longitude, latitude][]" /><q-input v-model="form.barriers" dense outlined type="textarea" rows="2" label="Barriers, crossings, and access rules" /><q-input v-model="form.assumptions" dense outlined label="Routing assumptions" /><q-input v-model="form.limitations" dense outlined label="Limitations" />
<label>Reachable network JSON<input type="file" accept=".json,.geojson" @change="graph = ($event.target as HTMLInputElement).files?.[0]" /></label><label>Source network JSON<input type="file" accept=".json,.geojson" @change="network = ($event.target as HTMLInputElement).files?.[0]" /></label><q-checkbox v-model="rights" label="I verified local use, publication, and redistribution rights for these network files" /><q-btn outline :loading="busy" label="Attach evidence packet" @click="attach" />
<template v-if="existing"><q-input v-model="form.reviewer" dense outlined label="Technical reviewer" /><q-input v-model="form.reviewNotes" type="textarea" rows="2" dense outlined label="Origin and barrier review notes" /><q-checkbox v-model="confirmed" label="I checked the actual network, reachable paths, and polygon" /><q-btn outline label="Record technical review" @click="review" /></template><p v-if="error" class="error">{{ error }}</p></div></template>
