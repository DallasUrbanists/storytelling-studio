import type { CameraKeyframe, Position } from './project.ts';

/** Per-layer appearance is saved with the film, independently of editor theme. */
export type LayerStyle = { stroke: string; width: number; fill: string; fillOpacity: number; opacity: number };
export type BandMapping = { id: string; existingId?: string; proposedId?: string };
export type RoadwayScene = { roadwayId: string; startFrame: number; endFrame: number; mappings: Record<string, BandMapping[]> };
export type Annotation = {
  id: string; text: string; anchor: Position; leaderLine?: { offset: Position };
  startFrame: number; fadeInEndFrame: number; fadeOutStartFrame: number; endFrameExclusive: number;
  fontSize?: number; variantOffsets?: { portrait?: Position; landscape?: Position };
};
export type ScenePresentation = {
  title?: string; caption?: string; credit?: string;
  variantOverrides?: { portrait?: { cameraTrack: CameraKeyframe[] }; landscape?: { cameraTrack: CameraKeyframe[] } };
  roadway?: RoadwayScene; researchSnapshotId?: string;
};
export type SourceContext = { url?: string; retrievedAt?: string; interpretation?: 'official' | 'editorial' | 'synthetic'; serviceDate?: string; notes?: string };
export type AssetPermission = { localUse: boolean; publication: boolean; redistribution: boolean; license: string; credit: string };
export type WalkshedEvidence = {
  featureRevisionId: string; durationSeconds: 600; method: 'pedestrian-network';
  tool: string; toolVersion: string; networkDate: string; networkSha256: string;
  speedMetersPerSecond: number; origins: Position[]; reachableNetworkAssetId: string;
  sourceAssetIds: string[]; barriers: string; assumptions: string; limitations: string;
  technicalReview?: { reviewer: string; reviewedAt: string; notes: string };
};

/** The validator rejects unknown presentation fields and non-finite authored values. */
export function validatePresentation(scene: Record<string, unknown>, duration: number): void {
  const fail = (name: string): never => { throw new Error(`Invalid project: ${name}`); };
  for (const key of ['title','caption','credit']) if (scene[key] !== undefined && (typeof scene[key] !== 'string' || (scene[key] as string).length > 2000)) fail(key);
  if (scene.researchSnapshotId !== undefined && typeof scene.researchSnapshotId !== 'string') fail('researchSnapshotId');
  const variant = scene.variantOverrides as Record<string, { cameraTrack: CameraKeyframe[] }> | undefined;
  if (variant !== undefined) {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) fail('variantOverrides');
    for (const [key, item] of Object.entries(variant)) {
      if (!['portrait','landscape'].includes(key) || !item || Object.keys(item).some(k => k !== 'cameraTrack')) fail('variant override');
      validateCameraTrack(item.cameraTrack, duration);
    }
  }
  const road = scene.roadway as RoadwayScene | undefined;
  if (road !== undefined) {
    if (!road || typeof road !== 'object' || Object.keys(road).some(k => !['roadwayId','startFrame','endFrame','mappings'].includes(k)) || typeof road.roadwayId !== 'string') fail('roadway scene');
    if (!Number.isSafeInteger(road.startFrame) || !Number.isSafeInteger(road.endFrame) || road.startFrame < 0 || road.endFrame <= road.startFrame || road.endFrame >= duration) fail('roadway timing');
    if (!road.mappings || typeof road.mappings !== 'object' || Array.isArray(road.mappings)) fail('roadway mappings');
    for (const slots of Object.values(road.mappings)) {
      if (!Array.isArray(slots) || slots.length > 100) fail('roadway slots');
      const ids = new Set();
      for (const slot of slots) {
        if (!slot || typeof slot !== 'object' || Object.keys(slot).some(k => !['id','existingId','proposedId'].includes(k)) || typeof slot.id !== 'string' || ids.has(slot.id)) fail('roadway slot');
        ids.add(slot.id);
        if (slot.existingId === undefined && slot.proposedId === undefined) fail('empty roadway slot');
        for (const key of ['existingId','proposedId'] as const) if (slot[key] !== undefined && typeof slot[key] !== 'string') fail('roadway reference');
      }
    }
  }
}

export function validateCameraTrack(track: unknown, duration: number): void {
  if (!Array.isArray(track) || !track.length) throw new Error('Invalid project: camera track');
  let previous = -1;
  for (const k of track) {
    if (!k || typeof k !== 'object' || Object.keys(k).some(key => !['frame','center','zoom','bearing','pitch','easing'].includes(key))
      || !Number.isSafeInteger(k.frame) || k.frame <= previous || k.frame >= duration || (previous === -1 && k.frame !== 0)
      || !Array.isArray(k.center) || k.center.length !== 2 || !k.center.every(Number.isFinite) || Math.abs(k.center[0]) > 180 || Math.abs(k.center[1]) > 85.05112878
      || !Number.isFinite(k.zoom) || k.zoom < 0 || k.zoom > 24 || !Number.isFinite(k.bearing) || k.pitch !== 0 || !['linear','ease-in-out'].includes(k.easing)) throw new Error('Invalid project: camera fields');
    previous = k.frame;
  }
}
