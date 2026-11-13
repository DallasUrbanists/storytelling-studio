import type { SceneFocus } from './focus.ts';
import type { Annotation, AssetPermission, LayerStyle, ScenePresentation, SourceContext, WalkshedEvidence } from './authoring.ts';

/** A width with explicit evidence; unknown widths make no numeric assertion. */
export type RoadwayDimension =
  | { status: 'unknown' }
  | { status: 'assumed'; value: number; unit: 'm' | 'ft'; meters: number; rationale: string }
  | { status: 'documented' | 'estimated'; value: number; unit: 'm' | 'ft'; meters: number; sourceIds: string[]; date: string; location: string; method: string; uncertainty: string };
/** A left-to-right band in a roadway cross-section. */
export type RoadwayBand = {
  id: string; kind: 'through-lane' | 'center-turn-lane' | 'bike-lane' | 'buffer' | 'sidewalk' | 'parking' | 'median' | 'other';
  direction: 'forward' | 'reverse' | 'both' | 'none'; location: 'between-curbs' | 'outside-curbs';
  width: RoadwayDimension; locked: boolean; label?: string;
};
/** An ordered arrangement, with an explicitly classified envelope. */
export type RoadwayCrossSection = {
  role: 'existing' | 'proposed'; curbToCurb: RoadwayDimension;
  envelope: { kind: 'illustrated' | 'right-of-way' | 'unknown'; width: RoadwayDimension };
  bands: RoadwayBand[]; proposalDescription?: string;
};
/** A stable, roadway-local reference or a legacy inline cross-section. */
export type RoadwaySectionReference = RoadwayCrossSection | { layoutId: string };
export type RoadwayLayout = { id: string; section: RoadwayCrossSection };
/** A named [start, end) range; only the corridor's final endpoint is inclusive. */
export type RoadwaySegment = {
  id: string; name: string; startMeters: number; endMeters: number;
  existing: RoadwaySectionReference; proposed: RoadwaySectionReference;
  /** The entire segment is a longitudinal transition to these endpoint layouts. */
  transition?: { existingLayoutId: string; proposedLayoutId: string };
};
/** A corridor's ordered, nonoverlapping station segments in meters. */
export type Roadway = {
  id: string; title: string; corridorFeatureRevisionId: string; stationOrigin: string;
  stationDirection: string; stationExtentMeters: number; sourceIds: string[];
  layouts?: RoadwayLayout[];
  segments: RoadwaySegment[];
};
export type Position = [number, number];
export type Geometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiLineString'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };
export type CameraKeyframe = { frame: number; center: Position; zoom: number; bearing: number; pitch: 0; easing: 'linear' | 'ease-in-out' };
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ResearchSource = { id: string; title: string; sourceKind: 'dataset'; publisher: string; version: string | null; referencePeriod: string | null; boundaryVintage: string | null; contentSha256: string | null; universe: string | null; rights: { localUse: 'unknown' | 'allowed' | 'restricted'; publication: 'unknown' | 'allowed' | 'restricted'; redistribution: 'unknown' | 'allowed' | 'restricted' } };
export type ResearchInput = { featureRevisionId: string; geometrySha256: string; sourceInputs: { sourceId: string; contentSha256: string | null; version: string | null; referencePeriod: string | null; boundaryVintage: string | null }[]; methodId: string; methodVersion: number; parameters: { [key: string]: JsonValue } };
export type ResearchResult = { kind: 'raw-input' | 'estimate' | 'unavailable'; value: JsonValue; universe: string | null; note: string };
export type ResearchSnapshot = { id: string; inputs: ResearchInput; result: ResearchResult; status: 'draft' | 'approved' | 'stale' | 'unavailable'; reviews: { reviewer: string; reviewedAt: string; decision: 'approved' | 'rejected' | 'reviewed'; inputs: ResearchInput; result: ResearchResult }[] };
/** Dim the scene outside a saved polygon, including its interior holes. */
export type OutsideDimming = { featureRevisionId: string; opacity: number };
/** Screen-pixel offset from the geographic anchor to the leader endpoint/text. */
export type LeaderLine = { offset: [number, number] };
export type ProjectDocument = {
  schemaVersion: 1; id: string; title: string; createdAt: string; updatedAt: string;
  fps: 30; projection: 'mercator';
  outputVariants: { portrait: { width: 1080; height: 1920 }; landscape: { width: 1920; height: 1080 } };
  roadways?: Roadway[];
  assets: { id: string; path: string; mediaType: string; sha256: string; permission?: AssetPermission }[];
  sources: (({ id: string; title: string; sourceKind: 'author-origin' } | ResearchSource) & SourceContext)[];
  walksheds?: WalkshedEvidence[];
  importedFrom?: { projectId: string; revisionId: string; packageSha256: string };
  researchSnapshots?: ResearchSnapshot[];
  features: { id: string; name: string; kind: 'point' | 'line' | 'area'; currentRevisionId: string }[];
  featureRevisions: { id: string; featureId: string; geometry: Geometry; geometrySha256: string; sourceIds: string[] }[];
  layers: { id: string; featureRevisionId: string; order: number; startFrame: number; endFrameExclusive: number; style?: LayerStyle; group?: 'context' | 'rail' | 'bus' | 'stop' | 'station' | 'service-area' | 'walkshed'; sceneRange?: { from: string; through: string }; fillFade?: { startFrame: number; endFrameExclusive: number }; trace?: { startFrame: number; endFrameExclusive: number; mode: 'line' | 'outer-ring' } }[];
  scenes: ({ id: string; kind: 'map'; durationFrames: number; outsideDimming?: OutsideDimming; cameraTrack: CameraKeyframe[]; annotations: Annotation[] } & SceneFocus & ScenePresentation)[];
};

