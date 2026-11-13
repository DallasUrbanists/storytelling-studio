import type { ProjectDocument } from './project.ts';

type RecordValue = Record<string, unknown>;
const fail = (message: string): never => { throw new Error(`Invalid project: ${message}`); };
const fields = (o: RecordValue, allowed: string[], path: string) => { for (const key of Object.keys(o)) if (!allowed.includes(key)) fail(`${path}: unsupported field ${key}`); };
const object = (v: unknown, path: string): RecordValue => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : fail(path);
const array = (v: unknown, path: string): unknown[] => Array.isArray(v) ? v : fail(path);
const string = (v: unknown, path: string): string => typeof v === 'string' && v.trim() ? v : fail(path);
const id = (v: unknown, path: string): string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(v) ? v : fail(path);
const number = (v: unknown, path: string): number => typeof v === 'number' && Number.isFinite(v) ? v : fail(path);
const integer = (v: unknown, path: string): number => Number.isSafeInteger(v) ? v as number : fail(path);
const digest = (v: unknown, path: string) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v) ? v : fail(path);
const position = (v: unknown, path: string): number[] => {
  const p = array(v, path); if (p.length !== 2) fail(path);
  const x = number(p[0], path), y = number(p[1], path);
  if (Math.abs(x) > 180 || Math.abs(y) > 85.05112878) fail(path);
  return [x, y];
};
const collection = (v: unknown, path: string): RecordValue[] => {
  const seen = new Set<string>();
  return array(v, path).map((item, index) => { const o = object(item, `${path}[${index}]`); const key = id(o.id, `${path}.id`); if (seen.has(key)) fail(`${path}: duplicate ID`); seen.add(key); return o; });
};
const ref = (v: unknown, items: RecordValue[], path: string): RecordValue => {
  const key = id(v, path); return items.find(item => item.id === key) ?? fail(`${path}: missing reference`);
};
const interval = (start: unknown, end: unknown, limit: number, path: string) => {
  const a = integer(start, path), b = integer(end, path); if (a < 0 || a >= b || b > limit) fail(path);
};
const geometry = (value: unknown) => {
  const g = object(value, 'geometry'); fields(g, ['type', 'coordinates'], 'geometry');
  if (g.type === 'Point') { position(g.coordinates, 'point'); return; }
  const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'Polygon' ? array(g.coordinates, 'polygon') : fail('geometry.type');
  if (!lines.length) fail('geometry coordinates');
  for (const line of lines) {
    const points = array(line, 'line').map(p => position(p, 'coordinate'));
    if (points.length < (g.type === 'Polygon' ? 4 : 2)) fail('geometry length');
    if (g.type === 'Polygon' && (points[0][0] !== points.at(-1)![0] || points[0][1] !== points.at(-1)![1])) fail('unclosed ring');
    if (!points.some(p => p[0] !== points[0][0] || p[1] !== points[0][1])) fail('geometry has no distinct positions');
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i][0] - points[i-1][0]) > 180) fail('antimeridian geometry');
  }
};

function validateOutsideDimming(value: unknown, revisions: RecordValue[]): void {
  if (value === undefined) return;
  const dim = object(value, 'outsideDimming');
  fields(dim, ['featureRevisionId', 'opacity'], 'outsideDimming');
  const revision = ref(dim.featureRevisionId, revisions, 'outsideDimming.featureRevisionId');
  if (object(revision.geometry, 'geometry').type !== 'Polygon') fail('outsideDimming polygon');
  const opacity = number(dim.opacity, 'outsideDimming.opacity');
  if (opacity < 0 || opacity > 1) fail('outsideDimming.opacity');
}

function validateLeaderLine(value: unknown): void {
  if (value === undefined) return;
  const leader = object(value, 'leaderLine');
  fields(leader, ['offset'], 'leaderLine');
  const offset = array(leader.offset, 'leaderLine.offset');
  if (offset.length !== 2) fail('leaderLine.offset');
  const x = number(offset[0], 'leaderLine.offset.x');
  const y = number(offset[1], 'leaderLine.offset.y');
  if (Math.hypot(x, y) <= 7) fail('leaderLine must extend beyond the anchor dot');
}

/** Validate the bounded bridge document; throws on invalid input. */
export function parseProject(value: unknown): ProjectDocument {
  const p = object(value, 'project');
  fields(p, ['schemaVersion','id','title','createdAt','updatedAt','fps','projection','outputVariants','assets','sources','features','featureRevisions','layers','scenes'], 'project');
  if (p.schemaVersion !== 1 || p.fps !== 30 || p.projection !== 'mercator') fail('version, fps, or projection');
  id(p.id, 'project.id'); string(p.title, 'title');
  for (const field of ['createdAt', 'updatedAt']) if (typeof p[field] !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(p[field] as string) || !Number.isFinite(Date.parse(p[field] as string))) fail(field);
  const variants = object(p.outputVariants, 'outputVariants'); fields(variants, ['portrait','landscape'], 'outputVariants');
  for (const [name, width, height] of [['portrait', 1080, 1920], ['landscape', 1920, 1080]] as const) { const v = object(variants[name], name); fields(v, ['width','height'], name); if (v.width !== width || v.height !== height) fail(name); }
  const assets = collection(p.assets, 'assets'), sources = collection(p.sources, 'sources'), features = collection(p.features, 'features'), revisions = collection(p.featureRevisions, 'featureRevisions'), layers = collection(p.layers, 'layers'), scenes = collection(p.scenes, 'scenes');
  for (const a of assets) { fields(a, ['id','path','mediaType','sha256'], 'asset'); const path = string(a.path, 'asset.path'); if (path.startsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..') || /^[A-Za-z]:/.test(path)) fail('asset.path'); string(a.mediaType, 'asset.mediaType'); digest(a.sha256, 'asset.sha256'); }
  for (const s of sources) { fields(s, ['id','title','sourceKind'], 'source'); string(s.title, 'source.title'); if (s.sourceKind !== 'author-origin') fail('source.kind'); }
  for (const r of revisions) { fields(r, ['id','featureId','geometry','geometrySha256','sourceIds'], 'featureRevision'); ref(r.featureId, features, 'revision.featureId'); geometry(r.geometry); digest(r.geometrySha256, 'geometrySha256'); for (const source of array(r.sourceIds, 'sourceIds')) ref(source, sources, 'sourceId'); }
  for (const f of features) { fields(f, ['id','name','kind','currentRevisionId'], 'feature'); string(f.name, 'feature.name'); const r = ref(f.currentRevisionId, revisions, 'currentRevisionId'); if (r.featureId !== f.id) fail('revision ownership'); const kind = object(r.geometry, 'geometry').type; if ((f.kind === 'point' && kind !== 'Point') || (f.kind === 'line' && kind !== 'LineString') || (f.kind === 'area' && kind !== 'Polygon') || !['point', 'line', 'area'].includes(f.kind as string)) fail('feature.kind'); }
  let duration = 0;
  for (const s of scenes) { fields(s, ['id','kind','durationFrames','focusFeatureRevisionId','outsideDimming','cameraTrack','annotations'], 'scene'); if (s.kind !== 'map') fail('scene.kind'); const d = integer(s.durationFrames, 'durationFrames'); if (d <= 0) fail('durationFrames'); duration += d; if (!Number.isSafeInteger(duration)) fail('project duration'); ref(s.focusFeatureRevisionId, revisions, 'focus'); validateOutsideDimming(s.outsideDimming, revisions); const track = array(s.cameraTrack, 'cameraTrack'); if (!track.length) fail('cameraTrack'); let previous = -1; for (const item of track) { const k = object(item, 'camera'); const frame = integer(k.frame, 'camera.frame'); if (frame <= previous || frame >= d || (previous === -1 && frame !== 0)) fail('camera.frame'); previous = frame; position(k.center, 'camera.center'); number(k.zoom, 'camera.zoom'); number(k.bearing, 'camera.bearing'); if (k.pitch !== 0 || k.easing !== 'linear' || Object.keys(k).some(key => !['frame','center','zoom','bearing','pitch','easing'].includes(key))) fail('camera fields'); } for (const a of collection(s.annotations, 'annotations')) { fields(a, ['id','text','anchor','leaderLine','startFrame','fadeInEndFrame','fadeOutStartFrame','endFrameExclusive'], 'annotation'); string(a.text, 'annotation.text'); position(a.anchor, 'annotation.anchor'); validateLeaderLine(a.leaderLine); interval(a.startFrame, a.endFrameExclusive, d, 'annotation interval'); const start = a.startFrame as number, end = a.endFrameExclusive as number, fadeIn = integer(a.fadeInEndFrame, 'fadeIn'), fadeOut = integer(a.fadeOutStartFrame, 'fadeOut'); if (fadeIn < start || fadeOut < fadeIn || fadeOut > end) fail('annotation fades'); } }
  if (!duration) fail('scenes');
  for (const l of layers) { fields(l, ['id','featureRevisionId','order','startFrame','endFrameExclusive','trace'], 'layer'); const r = ref(l.featureRevisionId, revisions, 'layer.featureRevisionId'); integer(l.order, 'layer.order'); interval(l.startFrame, l.endFrameExclusive, duration, 'layer interval'); if (l.trace !== undefined) { const t = object(l.trace, 'trace'); fields(t, ['startFrame','endFrameExclusive','mode'], 'trace'); interval(t.startFrame, t.endFrameExclusive, duration, 'trace interval'); if ((t.startFrame as number) < (l.startFrame as number) || (t.endFrameExclusive as number) > (l.endFrameExclusive as number)) fail('trace outside layer'); const type = object(r.geometry, 'geometry').type; if (!((t.mode === 'line' && type === 'LineString') || (t.mode === 'outer-ring' && type === 'Polygon'))) fail('trace mode'); } }
  return p as unknown as ProjectDocument;
}
