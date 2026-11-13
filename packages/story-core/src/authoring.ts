import type { CameraKeyframe, Geometry, ProjectDocument, Position } from '../../project-schema/src/index.ts';
import { parseProject } from '../../project-schema/src/index.ts';
import { validateGeographicPolygon } from './geometry.ts';

/** Enumerate original positions without connecting disconnected parts. */
export function geometryPositions(geometry: Geometry): Position[] {
  if (geometry.type === 'Point') return [geometry.coordinates];
  if (geometry.type === 'LineString') return geometry.coordinates;
  if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') return geometry.coordinates.flat();
  return geometry.coordinates.flat(2);
}

/** Fit authored bounds in Mercator separately for each fixed output viewport. */
export function fitGeometry(geometry: Geometry, viewport: { width: number; height: number }, padding = 100): CameraKeyframe {
  const points = geometryPositions(geometry);
  const xs = points.map(p => (p[0] + 180) / 360);
  const ys = points.map(p => (1 - Math.log(Math.tan(Math.PI / 4 + p[1] * Math.PI / 360)) / Math.PI) / 2);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((viewport.width - padding * 2) / Math.max(1e-8, maxX - minX), (viewport.height - padding * 2) / Math.max(1e-8, maxY - minY));
  return { frame: 0, center: [(minX + maxX) * 180 - 180, Math.atan(Math.sinh(Math.PI * (1 - minY - maxY))) * 180 / Math.PI],
    zoom: Math.max(0, Math.min(18, Math.log2(scale / 512))), bearing: 0, pitch: 0, easing: 'ease-in-out' };
}

/** Validate one bounded GeoJSON document; source geometry is never repaired silently. */
export function readGeoJson(value: unknown): { name: string; geometry: Geometry }[] {
  const root = value as Record<string, unknown>;
  if (!root || typeof root !== 'object' || root.crs) throw new Error('Use GeoJSON in longitude, latitude (WGS84); convert other coordinate systems first.');
  const records = root.type === 'FeatureCollection' ? root.features : [root];
  if (!Array.isArray(records) || !records.length || records.length > 500) throw new Error('Import 1–500 features at a time.');
  let count = 0;
  return records.map((item, i) => {
    if (!item || typeof item !== 'object' || item.crs) throw new Error('Invalid GeoJSON feature.');
    const geometry = structuredClone(item.type === 'Feature' ? item.geometry : item) as Geometry;
    if (!geometry || !['Point','LineString','MultiLineString','Polygon','MultiPolygon'].includes(geometry.type)) throw new Error('Use point, line, polygon, or multipart line/area geometry.');
    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') validateGeographicPolygon(geometry);
    const points = geometryPositions(geometry);
    count += points.length;
    if (count > 50000 || !points.length || points.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 85.05112878)) throw new Error('Coordinates must be finite longitude, latitude pairs; import at most 50,000 positions.');
    const lines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.type === 'MultiLineString' ? geometry.coordinates : [];
    for (const line of lines) {
      if (line.length < 2 || !line.some(p => p[0] !== line[0][0] || p[1] !== line[0][1])) throw new Error('A line needs two distinct positions.');
      for (let p = 1; p < line.length; p++) if (Math.abs(line[p][0] - line[p - 1][0]) > 180) throw new Error('Split geometry at the antimeridian before import.');
    }
    const name = typeof item.properties?.name === 'string' ? item.properties.name : `Imported feature ${i + 1}`;
    return { name, geometry };
  });
}

/** Retiming uses stable scene identities so Keep visible ranges follow scene edits. */
export function retimeProject(project: ProjectDocument): ProjectDocument {
  const result = structuredClone(project);
  const starts = new Map<string, number>(), ends = new Map<string, number>();
  let total = 0;
  for (const scene of result.scenes) { starts.set(scene.id, total); total += scene.durationFrames; ends.set(scene.id, total); }
  for (const layer of result.layers) {
    const previousStart = layer.startFrame;
    if (layer.sceneRange) {
      const a = starts.get(layer.sceneRange.from), b = ends.get(layer.sceneRange.through);
      if (a === undefined || b === undefined || a >= b) throw new Error('Update the layer’s Keep visible range before removing or reversing its scenes.');
      const traceLength = layer.trace ? layer.trace.endFrameExclusive - layer.trace.startFrame : 0;
      layer.startFrame = a; layer.endFrameExclusive = b;
      if (layer.trace) { layer.trace.startFrame = Math.min(b - 1, a + layer.trace.startFrame - previousStart); layer.trace.endFrameExclusive = Math.min(b, layer.trace.startFrame + traceLength); }
    } else {
      layer.startFrame = Math.min(layer.startFrame, total - 1);
      layer.endFrameExclusive = Math.min(layer.endFrameExclusive, total);
      if (layer.trace) { layer.trace.startFrame = Math.min(layer.trace.startFrame, layer.endFrameExclusive - 1); layer.trace.endFrameExclusive = Math.min(layer.trace.endFrameExclusive, layer.endFrameExclusive); }
    }
    if (layer.fillFade) {
      const length = layer.fillFade.endFrameExclusive - layer.fillFade.startFrame;
      layer.fillFade.startFrame = Math.max(layer.startFrame, Math.min(layer.endFrameExclusive - 1, layer.startFrame + layer.fillFade.startFrame - previousStart));
      layer.fillFade.endFrameExclusive = Math.min(layer.endFrameExclusive, layer.fillFade.startFrame + length);
    }
  }
  return parseProject(result);
}

/** Changing a feature creates a separate record while prior scenes remain pinned. */
export function replaceFeature(project: ProjectDocument, featureId: string, revision: ProjectDocument['featureRevisions'][number]): ProjectDocument {
  const result = structuredClone(project), feature = result.features.find(f => f.id === featureId);
  if (!feature || revision.featureId !== featureId || result.featureRevisions.some(r => r.id === revision.id)) throw new Error('A new matching geometry revision is required.');
  result.featureRevisions.push(revision); feature.currentRevisionId = revision.id;
  for (const snapshot of result.researchSnapshots ?? []) if (result.featureRevisions.find(r => r.id === snapshot.inputs.featureRevisionId)?.featureId === featureId && snapshot.status === 'approved') snapshot.status = 'stale';
  return parseProject(result);
}
