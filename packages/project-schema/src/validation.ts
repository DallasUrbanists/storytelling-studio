import type { ProjectDocument } from './project.ts';
import { FocusValidationError, validateFocusSteps } from './focus.ts';
import { validateCameraTrack, validatePresentation } from './authoring.ts';

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
const nullableString = (v: unknown, path: string) => v === null ? null : string(v, path);
const json = (v: unknown, path: string): void => {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return;
  if (typeof v === 'number') { number(v, path); return; }
  if (Array.isArray(v)) { for (const item of v) json(item, path); return; }
  const o = object(v, path); for (const item of Object.values(o)) json(item, path);
};
const canonical = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v !== null && typeof v === 'object') return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical((v as RecordValue)[k])}`).join(',')}}`;
  return JSON.stringify(v);
};
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
const researchInputs = (value: unknown, path: string): RecordValue => {
  const inputs = object(value, path); fields(inputs, ['featureRevisionId','geometrySha256','sourceInputs','methodId','methodVersion','parameters'], path);
  id(inputs.featureRevisionId, `${path}.featureRevisionId`); digest(inputs.geometrySha256, `${path}.geometrySha256`);
  string(inputs.methodId, `${path}.methodId`); if (integer(inputs.methodVersion, `${path}.methodVersion`) < 1) fail(`${path}.methodVersion`);
  json(object(inputs.parameters, `${path}.parameters`), `${path}.parameters`);
  const seenSources = new Set<string>();
  for (const item of array(inputs.sourceInputs, `${path}.sourceInputs`)) {
    const input = object(item, `${path}.sourceInput`); fields(input, ['sourceId','contentSha256','version','referencePeriod','boundaryVintage'], `${path}.sourceInput`);
    const sourceId = id(input.sourceId, `${path}.sourceInput.sourceId`);
    if (seenSources.has(sourceId)) fail(`${path}.sourceInput duplicate`); seenSources.add(sourceId);
    if (input.contentSha256 !== null) digest(input.contentSha256, `${path}.sourceInput.contentSha256`);
    for (const key of ['version','referencePeriod','boundaryVintage']) nullableString(input[key], `${path}.sourceInput.${key}`);
  }
  return inputs;
};
const researchResult = (value: unknown, path: string): RecordValue => {
  const result = object(value, path); fields(result, ['kind','value','universe','note'], path);
  if (!['raw-input','estimate','unavailable'].includes(result.kind as string)) fail(`${path}.kind`);
  json(result.value, `${path}.value`); nullableString(result.universe, `${path}.universe`); string(result.note, `${path}.note`);
  if (result.kind === 'unavailable' && result.value !== null) fail(`${path} unavailable value`);
  return result;
};
const interval = (start: unknown, end: unknown, limit: number, path: string) => {
  const a = integer(start, path), b = integer(end, path); if (a < 0 || a >= b || b > limit) fail(path);
};
const geometry = (value: unknown) => {
  const g = object(value, 'geometry'); fields(g, ['type', 'coordinates'], 'geometry');
  if (g.type === 'Point') { position(g.coordinates, 'point'); return; }
  if (g.type === 'MultiPolygon') {
    const parts = array(g.coordinates, 'multipolygon'); if (!parts.length) fail('empty multipolygon');
    for (const coordinates of parts) geometry({ type: 'Polygon', coordinates });
    return;
  }
  const lines = g.type === 'LineString' ? [g.coordinates] : ['Polygon', 'MultiLineString'].includes(g.type as string) ? array(g.coordinates, 'parts') : fail('geometry.type');
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
  if (!['Polygon','MultiPolygon'].includes(object(revision.geometry, 'geometry').type as string)) fail('outsideDimming polygon');
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

const dimension = (value: unknown, sources: RecordValue[], path: string) => {
  const d = object(value, path);
  if (d.status === 'unknown') { fields(d, ['status'], path); return; }
  if (!['documented', 'estimated', 'assumed'].includes(d.status as string)) fail(`${path}.status`);
  fields(d, d.status === 'assumed' ? ['status','value','unit','meters','rationale'] : ['status','value','unit','meters','sourceIds','date','location','method','uncertainty'], path);
  const amount = number(d.value, path), meters = number(d.meters, path);
  if (amount <= 0 || meters <= 0 || !['m', 'ft'].includes(d.unit as string) || Math.abs(meters - amount * (d.unit === 'ft' ? 0.3048 : 1)) > 1e-9 * Math.max(1, meters)) fail(path);
  if (d.status === 'assumed') string(d.rationale, `${path}.rationale`);
  else {
    const refs = array(d.sourceIds, `${path}.sourceIds`); if (!refs.length) fail(`${path}.sourceIds`);
    for (const source of refs) ref(source, sources, `${path}.sourceId`);
    for (const key of ['date','location','method','uncertainty']) string(d[key], `${path}.${key}`);
  }
};
const roadwaySection = (value: unknown, sources: RecordValue[]) => {
  const section = object(value, 'section'); const role = section.role;
  fields(section, ['role','curbToCurb','envelope','bands','proposalDescription'], 'section');
  if (!['existing', 'proposed'].includes(role as string)) fail('section role');
  if (role === 'proposed') string(section.proposalDescription, 'proposalDescription');
  else if (section.proposalDescription !== undefined) fail('existing proposalDescription');
  dimension(section.curbToCurb, sources, 'curbToCurb');
  const envelope = object(section.envelope, 'envelope'); fields(envelope, ['kind','width'], 'envelope');
  if (!['illustrated','right-of-way','unknown'].includes(envelope.kind as string)) fail('envelope.kind');
  dimension(envelope.width, sources, 'envelope.width');
  const width = object(envelope.width, 'envelope.width');
  if ((envelope.kind === 'unknown') !== (width.status === 'unknown')) fail('envelope evidence');
  if (envelope.kind === 'right-of-way' && width.status !== 'documented') fail('right-of-way evidence');
  let outsidePhase = 0;
  for (const band of collection(section.bands, 'bands')) {
    fields(band, ['id','kind','direction','location','width','locked','label'], 'band');
    if (!['through-lane','center-turn-lane','bike-lane','buffer','sidewalk','parking','median','other'].includes(band.kind as string)) fail('band.kind');
    if (!['forward','reverse','both','none'].includes(band.direction as string) || (band.kind === 'center-turn-lane' && band.direction !== 'both') || (['sidewalk','buffer'].includes(band.kind as string) && band.direction !== 'none')) fail('band.direction');
    if (band.kind === 'other') string(band.label, 'band.label'); else if (band.label !== undefined) string(band.label, 'band.label');
    if (band.location === 'between-curbs') { if (outsidePhase === 2) fail('band location order'); outsidePhase = 1; }
    else if (band.location === 'outside-curbs') { if (outsidePhase === 1) outsidePhase = 2; }
    else fail('band.location');
    if (band.kind === 'sidewalk' && band.location !== 'outside-curbs') fail('sidewalk location');
    if (typeof band.locked !== 'boolean') fail('band.locked'); dimension(band.width, sources, 'band.width');
  }
  return section;
};
const roadways = (value: unknown, sources: RecordValue[], revisions: RecordValue[]) => {
  for (const road of collection(value, 'roadways')) {
    fields(road, ['id','title','corridorFeatureRevisionId','stationOrigin','stationDirection','stationExtentMeters','sourceIds','segments','layouts'], 'roadway');
    string(road.title, 'roadway.title'); string(road.stationOrigin, 'stationOrigin'); string(road.stationDirection, 'stationDirection');
    const revision = ref(road.corridorFeatureRevisionId, revisions, 'corridorFeatureRevisionId');
    if (object(revision.geometry, 'geometry').type !== 'LineString') fail('roadway corridor geometry');
    const extent = number(road.stationExtentMeters, 'stationExtentMeters'); if (extent <= 0) fail('stationExtentMeters');
    for (const source of array(road.sourceIds, 'roadway.sourceIds')) ref(source, sources, 'roadway.sourceId');
    const layouts = road.layouts === undefined ? [] : collection(road.layouts, 'layouts');
    for (const layout of layouts) {
      fields(layout, ['id', 'section'], 'layout'); roadwaySection(layout.section, sources);
    }
    const layoutSection = (layoutId: unknown, role: string) => {
      const section = object(ref(layoutId, layouts, 'layoutId').section, 'section');
      if (section.role !== role) fail('section role');
    };
    let previous = 0;
    for (const segment of collection(road.segments, 'segments')) {
      fields(segment, ['id','name','startMeters','endMeters','existing','proposed','transition'], 'segment'); string(segment.name, 'segment.name');
      const start = number(segment.startMeters, 'segment.startMeters'), end = number(segment.endMeters, 'segment.endMeters');
      if (start < previous || start >= end || end > extent) fail('segment range'); previous = end;
      for (const role of ['existing', 'proposed']) {
        const section = object(segment[role], role);
        if (Object.hasOwn(section, 'layoutId')) {
          fields(section, ['layoutId'], role); layoutSection(section.layoutId, role);
        } else if (roadwaySection(section, sources).role !== role) fail('section role');
      }
      if (segment.transition !== undefined) {
        const transition = object(segment.transition, 'transition');
        fields(transition, ['existingLayoutId', 'proposedLayoutId'], 'transition');
        for (const role of ['existing', 'proposed']) layoutSection(transition[`${role}LayoutId`], role);
      }
    }
  }
};

/** Validate the bounded bridge document; throws on invalid input. */
export function parseProject(value: unknown): ProjectDocument {
  const p = object(value, 'project');
  fields(p, ['schemaVersion','id','title','createdAt','updatedAt','fps','projection','outputVariants','assets','sources','features','featureRevisions','layers','scenes','researchSnapshots','roadways','walksheds','importedFrom'], 'project');
  if (p.schemaVersion !== 1 || p.fps !== 30 || p.projection !== 'mercator') fail('version, fps, or projection');
  id(p.id, 'project.id'); string(p.title, 'title');
  for (const field of ['createdAt', 'updatedAt']) if (typeof p[field] !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(p[field] as string) || !Number.isFinite(Date.parse(p[field] as string))) fail(field);
  const variants = object(p.outputVariants, 'outputVariants'); fields(variants, ['portrait','landscape'], 'outputVariants');
  for (const [name, width, height] of [['portrait', 1080, 1920], ['landscape', 1920, 1080]] as const) { const v = object(variants[name], name); fields(v, ['width','height'], name); if (v.width !== width || v.height !== height) fail(name); }
  const assets = collection(p.assets, 'assets'), sources = collection(p.sources, 'sources'), features = collection(p.features, 'features'), revisions = collection(p.featureRevisions, 'featureRevisions'), layers = collection(p.layers, 'layers'), scenes = collection(p.scenes, 'scenes');
  for (const a of assets) { fields(a, ['id','path','mediaType','sha256','permission'], 'asset'); const path = string(a.path, 'asset.path'); if (path.startsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..') || /^[A-Za-z]:/.test(path)) fail('asset.path'); string(a.mediaType, 'asset.mediaType'); digest(a.sha256, 'asset.sha256');
    if (a.permission !== undefined) {
      const permission = object(a.permission, 'asset.permission'); fields(permission, ['localUse','publication','redistribution','license','credit'], 'asset.permission');
      for (const key of ['localUse','publication','redistribution']) if (typeof permission[key] !== 'boolean') fail('asset.permission');
      string(permission.license, 'asset.license'); string(permission.credit, 'asset.credit');
    }
  }
  for (const s of sources) {
    string(s.title, 'source.title');
    for (const key of ['url','retrievedAt','serviceDate','notes']) if (s[key] !== undefined) string(s[key], 'source.' + key);
    if (s.url !== undefined && !/^https?:\/\//.test(s.url as string)) fail('source.url');
    if (s.interpretation !== undefined && !['official','editorial','synthetic'].includes(s.interpretation as string)) fail('source.interpretation');
    if (s.sourceKind === 'author-origin') fields(s, ['id','title','sourceKind','url','retrievedAt','interpretation','serviceDate','notes'], 'source');
    else if (s.sourceKind === 'dataset') {
      fields(s, ['id','title','sourceKind','publisher','version','referencePeriod','boundaryVintage','contentSha256','universe','rights','url','retrievedAt','interpretation','serviceDate','notes'], 'source');
      string(s.publisher, 'source.publisher');
      for (const key of ['version','referencePeriod','boundaryVintage','universe']) nullableString(s[key], `source.${key}`);
      if (s.contentSha256 !== null) digest(s.contentSha256, 'source.contentSha256');
      const rights = object(s.rights, 'source.rights'); fields(rights, ['localUse','publication','redistribution'], 'rights');
      for (const key of ['localUse','publication','redistribution']) if (!['unknown','allowed','restricted'].includes(rights[key] as string)) fail(`rights.${key}`);
    } else fail('source.kind');
  }
  for (const r of revisions) { fields(r, ['id','featureId','geometry','geometrySha256','sourceIds'], 'featureRevision'); ref(r.featureId, features, 'revision.featureId'); geometry(r.geometry); digest(r.geometrySha256, 'geometrySha256'); for (const source of array(r.sourceIds, 'sourceIds')) ref(source, sources, 'sourceId'); }
  for (const f of features) { fields(f, ['id','name','kind','currentRevisionId'], 'feature'); string(f.name, 'feature.name'); const r = ref(f.currentRevisionId, revisions, 'currentRevisionId'); if (r.featureId !== f.id) fail('revision ownership'); const kind = object(r.geometry, 'geometry').type; if ((f.kind === 'point' && kind !== 'Point') || (f.kind === 'line' && !['LineString','MultiLineString'].includes(kind as string)) || (f.kind === 'area' && !['Polygon','MultiPolygon'].includes(kind as string)) || !['point', 'line', 'area'].includes(f.kind as string)) fail('feature.kind'); }
  for (const snapshot of p.researchSnapshots === undefined ? [] : collection(p.researchSnapshots, 'researchSnapshots')) {
    fields(snapshot, ['id','inputs','result','status','reviews'], 'researchSnapshot');
    if (!['draft','approved','stale','unavailable'].includes(snapshot.status as string)) fail('snapshot.status');
    const inputs = researchInputs(snapshot.inputs, 'inputs');
    const revision = ref(inputs.featureRevisionId, revisions, 'inputs.featureRevisionId');
    digest(inputs.geometrySha256, 'inputs.geometrySha256'); if (inputs.geometrySha256 !== revision.geometrySha256) fail('input geometry hash mismatch');
    const sourceInputs = array(inputs.sourceInputs, 'sourceInputs');
    for (const item of sourceInputs) {
      const input = object(item, 'sourceInput');
      const source = ref(input.sourceId, sources, 'sourceInput.sourceId');
      if (source.sourceKind !== 'dataset') fail('sourceInput unsupported source');
      for (const key of ['contentSha256','version','referencePeriod','boundaryVintage']) if (input[key] !== source[key]) fail(`sourceInput.${key} mismatch`);
      if (snapshot.status === 'approved' && (!input.contentSha256 || !input.version || !input.referencePeriod || !source.universe)) fail('approved source missing provenance');
    }
    const result = researchResult(snapshot.result, 'result');
    if ((snapshot.status === 'unavailable') !== (result.kind === 'unavailable')) fail('unavailable status');
    const reviews = array(snapshot.reviews, 'reviews'); let matched = false;
    for (const item of reviews) {
      const review = object(item, 'review'); fields(review, ['reviewer','reviewedAt','decision','inputs','result'], 'review');
      string(review.reviewer, 'reviewer'); const date = string(review.reviewedAt, 'reviewedAt');
      if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(date) || !Number.isFinite(Date.parse(date))) fail('reviewedAt');
      if (!['approved','rejected','reviewed'].includes(review.decision as string)) fail('review.decision');
      researchInputs(review.inputs, 'review.inputs'); researchResult(review.result, 'review.result');
      if (canonical(review.inputs) === canonical(inputs) && canonical(review.result) === canonical(result) && review.decision !== 'reviewed') matched = review.decision === 'approved';
    }
    if (snapshot.status === 'approved' && (!matched || !sourceInputs.length || result.kind === 'unavailable' || result.value === null || !result.universe)) fail('approved snapshot requires matching review and complete inputs');
  }
  let duration = 0;
  for (const s of scenes) {
    fields(s, ['id','kind','durationFrames','focusFeatureRevisionId','focusSteps','outsideDimming','cameraTrack','annotations','title','caption','credit','variantOverrides','roadway','researchSnapshotId'], 'scene');
    if (s.kind !== 'map') fail('scene.kind');
    const d = integer(s.durationFrames, 'durationFrames');
    if (d <= 0 || d > 108000) fail('durationFrames');
    duration += d; if (!Number.isSafeInteger(duration) || duration > 1080000) fail('project duration');
    if (s.focusSteps === undefined) ref(s.focusFeatureRevisionId, revisions, 'focus');
    else {
      if (s.focusFeatureRevisionId !== undefined) throw new FocusValidationError('ambiguous-focus', 'scene.focusSteps');
      validateFocusSteps(s.focusSteps, new Set(revisions.map(r => r.id as string)), d);
    }
    validateOutsideDimming(s.outsideDimming, revisions);
    validateCameraTrack(s.cameraTrack, d);
    validatePresentation(s, d);
    if (s.researchSnapshotId !== undefined) ref(s.researchSnapshotId, collection(p.researchSnapshots, 'researchSnapshots'), 'scene research');
    if (s.roadway !== undefined) ref(object(s.roadway, 'roadway').roadwayId, collection(p.roadways, 'roadways'), 'scene roadway');
    for (const a of collection(s.annotations, 'annotations')) {
      fields(a, ['id','text','anchor','leaderLine','startFrame','fadeInEndFrame','fadeOutStartFrame','endFrameExclusive','fontSize','variantOffsets'], 'annotation');
      string(a.text, 'annotation.text'); position(a.anchor, 'annotation.anchor'); validateLeaderLine(a.leaderLine);
      interval(a.startFrame, a.endFrameExclusive, d, 'annotation interval');
      const start = a.startFrame as number, end = a.endFrameExclusive as number, fadeIn = integer(a.fadeInEndFrame, 'fadeIn'), fadeOut = integer(a.fadeOutStartFrame, 'fadeOut');
      if (fadeIn < start || fadeOut < fadeIn || fadeOut > end) fail('annotation fades');
      if (a.fontSize !== undefined && (number(a.fontSize, 'fontSize') < 16 || (a.fontSize as number) > 128)) fail('fontSize');
      if (a.variantOffsets !== undefined) {
        const offsets = object(a.variantOffsets, 'variantOffsets'); fields(offsets, ['portrait','landscape'], 'variantOffsets');
        for (const offset of Object.values(offsets)) {
          if (!Array.isArray(offset) || offset.length !== 2 || !offset.every(x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 3840)) fail('label offset');
        }
      }
    }
  }
  if (!duration) fail('scenes');
  for (const l of layers) { fields(l, ['id','featureRevisionId','order','startFrame','endFrameExclusive','trace','style','group','sceneRange','fillFade'], 'layer'); const r = ref(l.featureRevisionId, revisions, 'layer.featureRevisionId'); integer(l.order, 'layer.order'); interval(l.startFrame, l.endFrameExclusive, duration, 'layer interval'); if (l.trace !== undefined) { const t = object(l.trace, 'trace'); fields(t, ['startFrame','endFrameExclusive','mode'], 'trace'); interval(t.startFrame, t.endFrameExclusive, duration, 'trace interval'); if ((t.startFrame as number) < (l.startFrame as number) || (t.endFrameExclusive as number) > (l.endFrameExclusive as number)) fail('trace outside layer'); const type = object(r.geometry, 'geometry').type; if (!((t.mode === 'line' && ['LineString','MultiLineString'].includes(type as string)) || (t.mode === 'outer-ring' && ['Polygon','MultiPolygon'].includes(type as string)))) fail('trace mode'); } }
  for (const layer of layers) {
    if (layer.fillFade !== undefined) {
      const fade = object(layer.fillFade, 'fill fade'); fields(fade, ['startFrame','endFrameExclusive'], 'fill fade');
      interval(fade.startFrame, fade.endFrameExclusive, duration, 'fill fade');
      const revision = ref(layer.featureRevisionId, revisions, 'fill feature');
      if (!['Polygon','MultiPolygon'].includes(object(revision.geometry, 'fill geometry').type as string) || (fade.startFrame as number) < (layer.startFrame as number) || (fade.endFrameExclusive as number) > (layer.endFrameExclusive as number)) fail('fill fade outside area layer');
    }
    if (layer.group !== undefined && !['context','rail','bus','stop','station','service-area','walkshed'].includes(layer.group as string)) fail('layer group');
    if (layer.style !== undefined) {
      const style = object(layer.style, 'layer style'); fields(style, ['stroke','width','fill','fillOpacity','opacity'], 'layer style');
      for (const key of ['stroke','fill']) if (typeof style[key] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(style[key] as string)) fail('layer color');
      if (number(style.width, 'stroke width') < 0 || (style.width as number) > 40) fail('stroke width');
      for (const key of ['opacity','fillOpacity']) if (number(style[key], key) < 0 || (style[key] as number) > 1) fail(key);
    }
    if (layer.sceneRange !== undefined) {
      const range = object(layer.sceneRange, 'scene range'); fields(range, ['from','through'], 'scene range');
      const from = scenes.indexOf(ref(range.from, scenes, 'from scene')), through = scenes.indexOf(ref(range.through, scenes, 'through scene'));
      if (from > through) fail('reversed scene range');
      const start = scenes.slice(0, from).reduce((n, scene) => n + (scene.durationFrames as number), 0);
      const end = scenes.slice(0, through + 1).reduce((n, scene) => n + (scene.durationFrames as number), 0);
      if (start !== layer.startFrame || end !== layer.endFrameExclusive) fail('stale scene range');
    }
  }
  if (p.importedFrom !== undefined) {
    const provenance = object(p.importedFrom, 'importedFrom'); fields(provenance, ['projectId','revisionId','packageSha256'], 'importedFrom');
    id(provenance.projectId, 'source project'); id(provenance.revisionId, 'source revision'); digest(provenance.packageSha256, 'package digest');
  }
  if (p.walksheds !== undefined) for (const item of array(p.walksheds, 'walksheds')) {
    const walk = object(item, 'walkshed');
    fields(walk, ['featureRevisionId','durationSeconds','method','tool','toolVersion','networkDate','networkSha256','speedMetersPerSecond','origins','reachableNetworkAssetId','sourceAssetIds','barriers','assumptions','limitations','technicalReview'], 'walkshed');
    const revision = ref(walk.featureRevisionId, revisions, 'walkshed area');
    if (!['Polygon','MultiPolygon'].includes(object(revision.geometry, 'walkshed geometry').type as string)) fail('walkshed area');
    if (walk.durationSeconds !== 600 || walk.method !== 'pedestrian-network') fail('walkshed method');
    for (const key of ['tool','toolVersion','networkDate','barriers','assumptions','limitations']) string(walk[key], key);
    digest(walk.networkSha256, 'network hash');
    if (number(walk.speedMetersPerSecond, 'walking speed') <= 0 || (walk.speedMetersPerSecond as number) > 3) fail('walking speed');
    const origins = array(walk.origins, 'origins'); if (!origins.length) fail('origins');
    for (const origin of origins) position(origin, 'walkshed origin');
    ref(walk.reachableNetworkAssetId, assets, 'reachable network');
    for (const asset of array(walk.sourceAssetIds, 'walkshed inputs')) ref(asset, assets, 'walkshed input');
    if (walk.technicalReview !== undefined) {
      const review = object(walk.technicalReview, 'walkshed review'); fields(review, ['reviewer','reviewedAt','notes'], 'walkshed review');
      for (const key of ['reviewer','reviewedAt','notes']) string(review[key], key);
    }
  }
  if (p.roadways !== undefined) roadways(p.roadways, sources, revisions);
  return p as unknown as ProjectDocument;
}

