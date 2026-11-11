export type Position = [number, number];
export type Geometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'Polygon'; coordinates: Position[][] };
export type CameraKeyframe = { frame: number; center: Position; zoom: number; bearing: number; pitch: 0; easing: 'linear' };
export type ProjectDocument = {
  schemaVersion: 1; id: string; title: string; createdAt: string; updatedAt: string;
  fps: 30; projection: 'mercator';
  outputVariants: { portrait: { width: 1080; height: 1920 }; landscape: { width: 1920; height: 1080 } };
  assets: { id: string; path: string; mediaType: string; sha256: string }[];
  sources: { id: string; title: string; sourceKind: 'author-origin' }[];
  features: { id: string; name: string; kind: 'point' | 'line' | 'area'; currentRevisionId: string }[];
  featureRevisions: { id: string; featureId: string; geometry: Geometry; geometrySha256: string; sourceIds: string[] }[];
  layers: { id: string; featureRevisionId: string; order: number; startFrame: number; endFrameExclusive: number; trace?: { startFrame: number; endFrameExclusive: number; mode: 'line' | 'outer-ring' } }[];
  scenes: { id: string; kind: 'map'; durationFrames: number; focusFeatureRevisionId: string; cameraTrack: CameraKeyframe[]; annotations: { id: string; text: string; anchor: Position; startFrame: number; fadeInEndFrame: number; fadeOutStartFrame: number; endFrameExclusive: number }[] }[];
};
