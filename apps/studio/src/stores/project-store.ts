import { shallowReactive } from 'vue';
import { parseProject } from '../../../../packages/project-schema/src/index.ts';
import type { ProjectDocument, Geometry } from '../../../../packages/project-schema/src/index.ts';
import { canonicalJson } from '../../../../packages/project-schema/src/canonical.ts';
import { fitGeometry, readGeoJson, replaceFeature, retimeProject } from '../../../../packages/story-core/src/authoring.ts';
import { api, sha256, uploadAsset } from '../services/local-api';

type Envelope = { projectId: string; revisionId: string; document: ProjectDocument };
type Summary = { id: string; title: string; updatedAt: string; headRevisionId: string };
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const studio = shallowReactive({
  document: null as ProjectDocument | null, revisionId: '', saved: '', projects: [] as Summary[],
  selectedFeatureId: '', selectedSceneId: '', workspace: 'explore', variant: 'landscape' as 'portrait' | 'landscape', frame: 0,
  saveState: 'Open a project', error: '', busy: false, undo: [] as string[], redo: [] as string[],
});
export const projectCopy = (): ProjectDocument => copy(studio.document!);
export const dirty = (): boolean => !!studio.document && JSON.stringify(studio.document) !== studio.saved;
const draftKey = (id: string) => 'gstory-draft-' + id;
function backup(): void {
  if (!studio.document) return;
  try { localStorage.setItem(draftKey(studio.document.id), JSON.stringify({ expectedRevisionId: studio.revisionId, document: studio.document })); }
  catch { studio.error = 'Browser draft recovery is full. Save the project or download a draft copy.'; }
}
export function edit(change: (project: ProjectDocument) => void): void {
  if (!studio.document) return;
  const candidate = projectCopy(); change(candidate); parseProject(candidate);
  if (new TextEncoder().encode(JSON.stringify(candidate)).length > 1000000) throw new Error('This edit exceeds the 1 MB project-document budget. Keep source files as retained assets and import a smaller geometry extract.');
  studio.undo.push(JSON.stringify(studio.document)); if (studio.undo.length > 50) studio.undo.shift(); studio.redo = [];
  studio.document = candidate; studio.saveState = 'Unsaved changes'; studio.error = ''; backup();
}
export function undoEdit(redo = false): void {
  const from = redo ? studio.redo : studio.undo, to = redo ? studio.undo : studio.redo;
  const value = from.pop(); if (!value || !studio.document) return;
  to.push(JSON.stringify(studio.document)); studio.document = parseProject(JSON.parse(value)); studio.saveState = dirty() ? 'Unsaved changes' : 'Saved'; backup();
}
function accept(envelope: Envelope): void {
  studio.document = envelope.document; studio.revisionId = envelope.revisionId; studio.saved = JSON.stringify(envelope.document);
  studio.selectedSceneId = envelope.document.scenes[0].id; studio.selectedFeatureId = envelope.document.features[0]?.id ?? '';
  studio.frame = 0; studio.undo = []; studio.redo = []; studio.saveState = 'Saved'; studio.error = '';
}
export async function refreshProjects(): Promise<void> { studio.projects = await api<Summary[]>('/projects'); }
export async function openProject(id: string): Promise<void> { accept(await api<Envelope>('/projects/' + id)); }
export async function newProject(title: string): Promise<void> {
  accept(await api<Envelope>('/projects', 'POST', { title, clientMutationId: crypto.randomUUID() })); await refreshProjects();
}
export function recoverDraft(): boolean {
  if (!studio.document) return false;
  const stored = localStorage.getItem(draftKey(studio.document.id)); if (!stored) return false;
  const candidate = JSON.parse(stored);
  const document = parseProject(candidate.document);
  if (document.id !== studio.document.id) throw new Error('The recovery copy belongs to another project.');
  studio.document = document; studio.revisionId = candidate.expectedRevisionId;
  studio.saveState = 'Recovered unsaved changes'; return true;
}
let pendingSave: { json: string; id: string } | undefined;
export async function saveProject(): Promise<void> {
  if (!studio.document || studio.saveState === 'Saving') return;
  const document = parseProject(projectCopy()); const before = JSON.stringify(document);
  const input = JSON.stringify({ document, expectedRevisionId: studio.revisionId });
  if (pendingSave?.json !== input) pendingSave = { json: input, id: crypto.randomUUID() };
  studio.saveState = 'Saving'; studio.error = '';
  try {
    const saved = await api<Envelope>('/projects/' + document.id, 'PUT', { document, expectedRevisionId: studio.revisionId, clientMutationId: pendingSave.id });
    studio.revisionId = saved.revisionId;
    if (JSON.stringify(studio.document) === before) { studio.document = saved.document; studio.saved = JSON.stringify(saved.document); studio.saveState = 'Saved'; localStorage.removeItem(draftKey(document.id)); }
    else { studio.saved = JSON.stringify(saved.document); studio.saveState = 'Unsaved changes'; backup(); }
    pendingSave = undefined; await refreshProjects();
  } catch (error) {
    studio.saveState = (error as { status?: number }).status === 409 ? 'Version conflict' : 'Save failed'; backup(); throw error;
  }
}
export async function importGeometry(file: File, source: ProjectDocument['sources'][number], replaceId?: string): Promise<void> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Import a GeoJSON file below 20 MiB.');
  const text = await file.text(), records = readGeoJson(JSON.parse(text));
  const retained = await uploadAsset(file, 'application/json');
  if (source.sourceKind === 'dataset') source.contentSha256 = retained.sha256;
  if (replaceId && records.length !== 1) throw new Error('Replace geometry accepts exactly one feature.');
  const revisions = await Promise.all(records.map(async record => ({ ...record, id: crypto.randomUUID(), hash: await sha256(canonicalJson(record.geometry)) })));
  edit(project => {
    project.sources.push(copy(source));
    project.assets.push({ id: crypto.randomUUID(), path: 'assets/' + retained.sha256 + '.json', sha256: retained.sha256, mediaType: 'application/json',
      permission: { localUse: source.sourceKind === 'author-origin' || source.rights.localUse === 'allowed', publication: source.sourceKind === 'author-origin' || source.rights.publication === 'allowed', redistribution: source.sourceKind === 'author-origin' || source.rights.redistribution === 'allowed', license: source.notes || 'Permissions recorded by the author', credit: source.title } });
    for (const record of revisions) {
      const featureId = replaceId ?? crypto.randomUUID();
      const revision = { id: record.id, featureId, geometry: record.geometry, geometrySha256: record.hash, sourceIds: [source.id] };
      if (replaceId) Object.assign(project, replaceFeature(project, featureId, revision));
      else {
        const kind = record.geometry.type === 'Point' ? 'point' : record.geometry.type.includes('Line') ? 'line' : 'area';
        project.features.push({ id: featureId, name: record.name, kind, currentRevisionId: record.id }); project.featureRevisions.push(revision);
        const total = project.scenes.reduce((sum, scene) => sum + scene.durationFrames, 0);
        project.layers.push({ id: crypto.randomUUID(), featureRevisionId: record.id, order: project.layers.length, startFrame: 0, endFrameExclusive: total, group: 'context',
          sceneRange: { from: project.scenes[0].id, through: project.scenes.at(-1)!.id }, style: { stroke: '#1768a9', width: 6, fill: '#1768a9', fillOpacity: 0.18, opacity: 1 } });
      }
      studio.selectedFeatureId = featureId;
    }
  });
}
export function addScene(geometry?: Geometry, featureRevisionId?: string): void {
  const id = crypto.randomUUID();
  edit(project => {
    const camera = geometry ? fitGeometry(geometry, project.outputVariants.landscape) : { ...project.scenes[0].cameraTrack[0], frame: 0 };
    const scene: ProjectDocument['scenes'][number] = { id, kind: 'map', title: 'Focus scene', durationFrames: 150,
      ...(featureRevisionId ? { focusFeatureRevisionId: featureRevisionId } : { focusSteps: [] }), cameraTrack: [camera], annotations: [],
      ...(geometry ? { variantOverrides: { portrait: { cameraTrack: [fitGeometry(geometry, project.outputVariants.portrait)] } } } : {}) };
    const offset = project.scenes.reduce((n, item) => n + item.durationFrames, 0);
    project.scenes.push(scene);
    if (featureRevisionId) {
      const previous = project.layers.find(l => l.featureRevisionId === featureRevisionId);
      project.layers.push({ id: crypto.randomUUID(), featureRevisionId, order: project.layers.length, startFrame: offset, endFrameExclusive: offset + scene.durationFrames, sceneRange: { from: id, through: id }, ...(previous?.style ? { style: copy(previous.style) } : {}), ...(previous?.group ? { group: previous.group } : {}) });
    }
  }); studio.selectedSceneId = id; studio.workspace = 'animate'; studio.frame = studio.document!.scenes.slice(0, -1).reduce((n, s) => n + s.durationFrames, 0);
}
export function reorderScene(id: string, direction: number): void {
  edit(project => {
    const index = project.scenes.findIndex(scene => scene.id === id), next = index + direction;
    if (next < 0 || next >= project.scenes.length) return;
    [project.scenes[index], project.scenes[next]] = [project.scenes[next], project.scenes[index]];
    Object.assign(project, retimeProject(project));
  });
}

/** Adopt revised source metadata explicitly while retaining every previous evidence record. */
export function reviseSource(oldId: string, source: ProjectDocument['sources'][number]): void {
  edit(project => {
    const old=project.sources.find(s=>s.id===oldId); if(!old)throw new Error('Source is missing.');
    project.sources.push(copy(source));
    const changed=new Map<string,string>();
    for(const revision of [...project.featureRevisions])if(revision.sourceIds.includes(oldId)){
      const next={...copy(revision),id:crypto.randomUUID(),sourceIds:revision.sourceIds.map(id=>id===oldId?source.id:id)};
      changed.set(revision.id,next.id);project.featureRevisions.push(next);
    }
    for(const feature of project.features)feature.currentRevisionId=changed.get(feature.currentRevisionId)??feature.currentRevisionId;
    for(const layer of project.layers)layer.featureRevisionId=changed.get(layer.featureRevisionId)??layer.featureRevisionId;
    for(const scene of project.scenes){
      if(scene.focusFeatureRevisionId)scene.focusFeatureRevisionId=changed.get(scene.focusFeatureRevisionId)??scene.focusFeatureRevisionId;
      for(const step of scene.focusSteps??[])step.featureRevisionId=changed.get(step.featureRevisionId)??step.featureRevisionId;
      if(scene.outsideDimming)scene.outsideDimming.featureRevisionId=changed.get(scene.outsideDimming.featureRevisionId)??scene.outsideDimming.featureRevisionId;
    }
    for(const road of project.roadways??[]){
      road.corridorFeatureRevisionId=changed.get(road.corridorFeatureRevisionId)??road.corridorFeatureRevisionId;
      road.sourceIds=road.sourceIds.map(id=>id===oldId?source.id:id);
      const sections=[...road.segments.flatMap(s=>[s.existing,s.proposed]).filter(s=>!('layoutId' in s)),...(road.layouts??[]).map(l=>l.section)];
      for(const section of sections)if(!('layoutId' in section))for(const dim of [section.curbToCurb,section.envelope.width,...section.bands.map(b=>b.width)])if(dim.status==='estimated'||dim.status==='documented')dim.sourceIds=dim.sourceIds.map(id=>id===oldId?source.id:id);
    }
    for(const walk of project.walksheds??[])if(changed.has(walk.featureRevisionId)){walk.featureRevisionId=changed.get(walk.featureRevisionId)!;delete walk.technicalReview;}
    for(const snapshot of project.researchSnapshots??[])if(snapshot.status==='approved'&&(changed.has(snapshot.inputs.featureRevisionId)||snapshot.inputs.sourceInputs.some(s=>s.sourceId===oldId)))snapshot.status='stale';
    if(source.sourceKind==='dataset')for(const asset of project.assets.filter(a=>a.sha256===source.contentSha256))asset.permission={localUse:source.rights.localUse==='allowed',publication:source.rights.publication==='allowed',redistribution:source.rights.redistribution==='allowed',license:source.notes??'See source evidence',credit:source.title};
  });
}
