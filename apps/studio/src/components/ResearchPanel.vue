<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { studio, edit, saveProject, addScene } from '../stores/project-store';
import { api, uploadAsset } from '../services/local-api';
import type { ProjectDocument } from '../../../../packages/project-schema/src/index';
import type { ResearchSnapshot } from '../../../../packages/project-schema/src/project';
import type { PopulationResult } from '../../../../packages/story-core/src/population';
const area = computed(() => { const f = studio.document!.features.find(f => f.id === studio.selectedFeatureId); return f?.kind === 'area' ? studio.document!.featureRevisions.find(r => r.id === f.currentRevisionId) : undefined; });
const tableFile = ref<File>(), boundaryFile = ref<File>(), confirmed = ref(false), error = ref(''), busy = ref(false), job = ref<{ id: string; status: string; result?: PopulationResult; error?: string }>();
const reviewer = ref(''), reviewed = ref(false), snapshotId = ref('');
const sources = reactive({ table: '', boundary: '' });
const snapshots = computed(() => studio.document!.researchSnapshots?.filter(s => s.inputs.featureRevisionId === area.value?.id) ?? []);
const snapshot = computed(() => snapshots.value.find(s => s.id === snapshotId.value) ?? snapshots.value.at(-1));
const projectId = studio.document!.id;
const pendingKey = 'gstory-research-' + projectId;
let timer: ReturnType<typeof setTimeout>, alive = true;
function sameProject() { if (studio.document?.id !== projectId) throw new Error('Reopen the original project to resume this analysis.'); }
async function retain(file: File, kind: 'table'|'boundary') {
  if (file.size > 32 * 1024 * 1024) throw new Error('Use a local extract below 32 MiB.');
  const retained = await uploadAsset(file, 'application/json'), id = crypto.randomUUID(), sourceId = crypto.randomUUID();
  sameProject();
  edit(p => { p.assets.push({ id, path: 'assets/' + retained.sha256 + '.json', mediaType: 'application/json', sha256: retained.sha256, permission: { localUse: true, publication: true, redistribution: true, license: 'US federal government public-domain data', credit: 'U.S. Census Bureau' } });
    p.sources.push({ id: sourceId, title: kind === 'table' ? 'ACS 2024 five-year total population' : 'TIGER/Line 2024 block groups', sourceKind: 'dataset', publisher: 'U.S. Census Bureau', version: kind === 'table' ? 'ACS5-2024' : 'TIGER-2024', referencePeriod: kind === 'table' ? '2020-2024' : '2024', boundaryVintage: '2024', contentSha256: retained.sha256, universe: kind === 'table' ? 'Total population' : 'Block group geography', rights: { localUse: 'allowed', publication: 'allowed', redistribution: 'allowed' }, interpretation: 'official', retrievedAt: new Date().toISOString(), url: kind === 'table' ? 'https://api.census.gov/data/2024/acs/acs5/groups/B01003.html' : 'https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html', notes: 'The author confirmed this file matches the named dataset and vintage.' });
  }); return { assetId: id, sourceId };
}
async function run() {
  error.value = ''; busy.value = true;
  try {
    if (!area.value || !tableFile.value || !boundaryFile.value || !confirmed.value) throw new Error('Select an area, choose both data files, and confirm their dataset and vintage.');
    const featureRevisionId = area.value.id;
    const table = await retain(tableFile.value, 'table'), boundary = await retain(boundaryFile.value, 'boundary');
    sameProject();
    sources.table = table.sourceId; sources.boundary = boundary.sourceId;
    await saveProject();
    const response = await api<{ id: string }>('/research', 'POST', { projectId: studio.document!.id, revisionId: studio.revisionId, featureRevisionId, tableAssetId: table.assetId, boundaryAssetId: boundary.assetId });
    job.value = { id: response.id, status: 'running' };
    localStorage.setItem(pendingKey, JSON.stringify({ id: response.id, sources: { ...sources } }));
    poll();
  } catch (e) { error.value = String(e); busy.value = false; }
}
async function poll() {
  if (!alive || !job.value || studio.document?.id !== projectId) return;
  try {
    job.value = await api('/jobs/' + job.value.id);
    if (!alive || studio.document?.id !== projectId) return;
    if (job.value!.status === 'completed') {
      const result = job.value!.result!, id = 'research-' + job.value!.id, revisionId = (job.value as unknown as { featureRevisionId: string }).featureRevisionId;
      if (!studio.document!.researchSnapshots?.some(s => s.id === id)) edit(p => { const revision = p.featureRevisions.find(r => r.id === revisionId)!;
        const inputSources = [sources.table,sources.boundary].map(id => p.sources.find(s => s.id === id)!).map(s => { if (s.sourceKind !== 'dataset') throw new Error('Source metadata is missing.'); return { sourceId: s.id, contentSha256: s.contentSha256, version: s.version, referencePeriod: s.referencePeriod, boundaryVintage: s.boundaryVintage }; });
        const item: ResearchSnapshot = { id, status: result.complete ? 'draft' : 'unavailable', inputs: { featureRevisionId: revision.id, geometrySha256: revision.geometrySha256, sourceInputs: inputSources, methodId: 'area-weighted-count', methodVersion: 1, parameters: { variable: 'B01003_001E', marginOfErrorVariable: 'B01003_001M', period: '2020-2024', boundaryVintage: '2024', geodesicArea: true } }, result: { kind: result.complete ? 'estimate' : 'unavailable', value: JSON.parse(JSON.stringify(result)), universe: 'Total population', note: result.uncertainty }, reviews: [] };
        p.researchSnapshots ??= []; p.researchSnapshots.push(item);
      });
      await saveProject();
      localStorage.removeItem(pendingKey); snapshotId.value = id; busy.value = false; return;
    }
    if (['failed','cancelled'].includes(job.value!.status)) { error.value = job.value!.error ?? 'Analysis cancelled.'; localStorage.removeItem(pendingKey); busy.value = false; return; }
    timer = setTimeout(poll, 600);
  } catch(e) { error.value = String(e); busy.value = false; }
}
function review(approve: boolean) {
  try { if (!snapshot.value || !reviewer.value.trim() || !reviewed.value) throw new Error('Enter your name and confirm you checked the inputs and limitations.');
    edit(p => { const s = p.researchSnapshots!.find(s => s.id === snapshot.value!.id)!; if (s.status === 'unavailable' || s.status === 'stale') throw new Error('Recompute a complete estimate before approval.'); s.reviews.push({ reviewer: reviewer.value.trim(), reviewedAt: new Date().toISOString(), decision: approve ? 'approved' : 'rejected', inputs: JSON.parse(JSON.stringify(s.inputs)), result: JSON.parse(JSON.stringify(s.result)) }); s.status = approve ? 'approved' : 'draft'; });
    reviewed.value = false;
  } catch(e) { error.value = String(e); }
}
function useInScene() { try { if (!snapshot.value || !area.value || snapshot.value.status !== 'approved') throw new Error('Approve this snapshot before including its estimate in a film.'); addScene(area.value.geometry, area.value.id); edit(p => { const s = p.scenes.find(s => s.id === studio.selectedSceneId)!; s.title = 'Population estimate'; s.researchSnapshotId = snapshot.value!.id; s.credit = 'U.S. Census Bureau · ACS 2020–2024 five-year B01003 · TIGER/Line 2024'; }); } catch(e) { error.value = String(e); } }
const result = computed(() => snapshot.value?.result.value as unknown as PopulationResult | undefined);
onMounted(() => {
  try { const pending = localStorage.getItem(pendingKey); if (pending) { const saved = JSON.parse(pending); sources.table = saved.sources.table; sources.boundary = saved.sources.boundary; job.value = { id: saved.id, status: 'loading' }; busy.value = true; void poll(); } } catch (e) { error.value = String(e); }
});
onBeforeUnmount(() => { alive = false; clearTimeout(timer); });
</script>
<template><div class="research-workspace"><div class="eyebrow">Research workspace</div><h2>Population, with its assumptions attached</h2><p>Estimate the population of a saved study area by allocating block-group counts using geodesic overlap. Missing data remain missing. This method does not allocate median income.</p>
<div v-if="!area" class="notice">Select or draw an area in Explore to begin.</div><template v-else>
<div class="research-grid"><section class="panel"><h3>1. Retain the source inputs</h3><p class="hint">Use a <a href="https://api.census.gov/data/2024/acs/acs5/groups/B01003.html" target="_blank" rel="noreferrer">2024 ACS five-year B01003 table</a> as Census API JSON or normalized rows, and matching 2024 TIGER block groups as WGS84 GeoJSON. Include every block group touching the area.</p>
<label>Population table (.json)<input type="file" accept=".json" @change="tableFile = ($event.target as HTMLInputElement).files?.[0]" /></label><label>Block-group boundaries (.geojson)<input type="file" accept=".json,.geojson" @change="boundaryFile = ($event.target as HTMLInputElement).files?.[0]" /></label><q-checkbox v-model="confirmed" label="I verified these are the named Census datasets, period, and boundary vintage" /><q-btn color="primary" :loading="busy" label="Save inputs & calculate" @click="run" /><q-btn v-if="busy && job" flat label="Cancel analysis" @click="api('/jobs/' + job.id + '/cancel', 'POST', {})" /><p v-if="job" role="status">{{ job.status }}</p></section>
<section class="panel"><h3>2. Review the frozen result</h3><template v-if="snapshot && result"><q-select v-model="snapshotId" outlined dense :options="snapshots.map(s => ({ label: s.id.slice(0,8) + ' · ' + s.status, value: s.id }))" emit-value map-options :display-value="snapshot.status" label="Research snapshot" /><div class="research-number">{{ result.displayPopulation === null ? 'Unavailable' : result.displayPopulation?.toLocaleString() }}</div><p>Estimated residents · ACS 2020–2024 five-year</p><dl><dt>Study area</dt><dd>{{ (result.areaM2 / 1e6).toFixed(3) }} km²</dd><dt>Source coverage</dt><dd>{{ (result.coverage * 100).toFixed(3) }}%</dd><dt>Density</dt><dd>{{ result.densityPerKm2 === null ? 'Unavailable' : Math.round(result.densityPerKm2).toLocaleString() }} residents/km²</dd></dl><div class="notice warn">{{ result.uncertainty }}</div><p v-if="result.missingGeoids.length">Missing: {{ result.missingGeoids.join(', ') }}</p>
<q-expansion-item label="Allocation ledger"><table class="data-table"><thead><tr><th>GEOID</th><th>Fraction</th><th>Source count</th><th>MOE</th><th>Contribution</th></tr></thead><tbody><tr v-for="unit in result.contributions" :key="unit.geoid"><td>{{ unit.geoid }}</td><td>{{ unit.fraction.toFixed(5) }}</td><td>{{ unit.sourcePopulation ?? 'missing' }}</td><td>{{ unit.marginOfError ?? 'missing' }}</td><td>{{ unit.contribution?.toFixed(2) ?? 'missing' }}</td></tr></tbody></table></q-expansion-item>
<q-input v-model="reviewer" outlined dense label="Reviewer name" /><q-checkbox v-model="reviewed" label="I checked the source period, coverage, boundary, and allocation assumptions" /><div class="button-row"><q-btn outline label="Approve estimate" :disable="!result.complete" @click="review(true)" /><q-btn flat label="Reject" @click="review(false)" /><q-btn color="primary" label="Add research scene" :disable="snapshot.status !== 'approved'" @click="useInScene" /></div></template><p v-else class="hint">The result and per-block-group ledger will appear here. You approve the factual claim explicitly before publication.</p></section></div></template><p v-if="error" role="alert" class="error">{{ error }}</p></div></template>
