import type { Geometry, Position, ProjectDocument } from '../../project-schema/src/index.ts';
import { evaluateCamera, type CameraState } from './camera.ts';
import { copyGeometry, tracePath, traceParts } from './geometry.ts';
import { evaluateFocus, type FocusState } from './focus.ts';
import { evaluateRoadwayAnimation, type RoadwayFrame } from './roadway-animation.ts';
import type { LayerStyle } from '../../project-schema/src/authoring.ts';

type VariantId = keyof ProjectDocument['outputVariants'];
type Scene = ProjectDocument['scenes'][number];
type Annotation = Scene['annotations'][number];
type Layer = ProjectDocument['layers'][number];
type Immutable<T> = { readonly [K in keyof T]: Immutable<T[K]> };

type LayerState = {
  id: string;
  featureRevisionId: string;
  order: number;
  visible: boolean;
  geometry: Geometry;
  style?: LayerStyle;
  trace?: {
    mode: NonNullable<Layer['trace']>['mode'];
    progress: number;
    coordinates: Position[];
    paths?: Position[][];
  };
};

/** Serializable state for one output frame of a validated bridge project. */
export type FrameState = Immutable<{
  frame: number;
  sceneId: string;
  variantId: VariantId;
  viewport: { width: number; height: number; pixelRatio: 1 };
  camera: CameraState;
  focus: { featureRevisionId: string; geometry: Geometry } | FocusState | null;
  outsideDimming?: {
    featureRevisionId: string;
    geometry: Extract<Geometry, { type: 'Polygon' | 'MultiPolygon' }>;
    opacity: number;
  };
  layers: LayerState[];
  roadway?: RoadwayFrame;
  caption?: string;
  credit?: string;
  researchCard?: { text: string; qualifier: string; status: string };
  annotations: {
    id: string; text: string; anchor: Position; opacity: number; fontSize?: number;
    leaderLine?: { offset: [number, number] };
  }[];
}>;

function freeze<T>(value: T): Immutable<T> {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value as Immutable<T>;
}

function sceneAt(scenes: readonly Scene[], frame: number) {
  let localFrame = frame;
  for (const scene of scenes) {
    if (localFrame < scene.durationFrames) return { scene, localFrame };
    localFrame -= scene.durationFrames;
  }
  throw new RangeError('Frame is outside the project duration');
}

function evaluateLayer(layer: Layer, geometry: Geometry, frame: number): LayerState {
  const state: LayerState = {
    id: layer.id,
    featureRevisionId: layer.featureRevisionId,
    order: layer.order,
    visible: frame >= layer.startFrame && frame < layer.endFrameExclusive,
    geometry: copyGeometry(geometry),
    ...(layer.style ? { style: { ...layer.style } } : {}),
  };

  // Validation pairs a trace with a LineString or Polygon of the matching mode.
  const trace = layer.trace;
  if (trace && geometry.type !== 'Point') {
    const paths = geometry.type === 'Polygon' ? [geometry.coordinates[0]]
      : geometry.type === 'MultiPolygon' ? geometry.coordinates.map(rings => rings[0])
      : geometry.type === 'MultiLineString' ? geometry.coordinates : [geometry.coordinates];
    const progress = Math.max(0, Math.min(1,
      (frame - trace.startFrame) / (trace.endFrameExclusive - trace.startFrame),
    ));
    state.trace = paths.length === 1
      ? { mode: trace.mode, progress, coordinates: tracePath(paths[0], progress) }
      : { mode: trace.mode, progress, coordinates: [], paths: traceParts(paths, progress) };
  }
  if (layer.fillFade) {
    const progress = Math.max(0, Math.min(1, (frame - layer.fillFade.startFrame) / Math.max(1, layer.fillFade.endFrameExclusive - layer.fillFade.startFrame - 1)));
    state.style = { stroke: '#0f766e', width: 4, fill: '#5eead4', opacity: 1, ...layer.style, fillOpacity: (layer.style?.fillOpacity ?? 0.26) * progress };
  }
  return state;
}

function labelOpacity(annotation: Annotation, frame: number): number {
  const { startFrame, fadeInEndFrame, fadeOutStartFrame, endFrameExclusive } = annotation;
  if (frame < startFrame || frame >= endFrameExclusive) return 0;
  if (frame < fadeInEndFrame) return (frame - startFrame) / (fadeInEndFrame - startFrame);
  if (frame < fadeOutStartFrame) return 1;
  return (endFrameExclusive - frame) / (endFrameExclusive - fadeOutStartFrame);
}

/**
 * Resolve one frame independently from playback history.
 *
 * Pass a project validated by parseProject. The frame must be a zero-based
 * integer within the project duration. An invalid frame or variant throws a
 * RangeError. The returned snapshot is deeply frozen.
 */
export function evaluateFrame(
  project: ProjectDocument,
  variantId: VariantId,
  frame: number,
): FrameState {
  if (!Number.isSafeInteger(frame) || frame < 0) {
    throw new RangeError('Frame must be a nonnegative safe integer');
  }
  if (variantId !== 'portrait' && variantId !== 'landscape') {
    throw new RangeError('Unsupported output variant');
  }

  const { scene, localFrame } = sceneAt(project.scenes, frame);
  const geometries = new Map(
    project.featureRevisions.map(({ id, geometry }) => [id, geometry]),
  );
  const layers = project.layers
    .map(layer => evaluateLayer(layer, geometries.get(layer.featureRevisionId)!, frame))
    .sort((a, b) => a.order - b.order || Number(a.id > b.id) - Number(a.id < b.id));

  const sequence = scene.focusSteps === undefined ? null
    : evaluateFocus(scene.focusSteps, variantId, localFrame, geometries);
  const focus = scene.focusSteps === undefined ? {
    featureRevisionId: scene.focusFeatureRevisionId,
    geometry: copyGeometry(geometries.get(scene.focusFeatureRevisionId)!),
  } : sequence?.focus ?? null;

  return freeze({
    frame,
    sceneId: scene.id,
    variantId,
    viewport: { ...project.outputVariants[variantId], pixelRatio: 1 as const },
    camera: sequence?.camera ?? evaluateCamera(scene.variantOverrides?.[variantId]?.cameraTrack ?? scene.cameraTrack, localFrame),
    focus,
    ...(scene.outsideDimming ? {
      outsideDimming: {
        ...scene.outsideDimming,
        geometry: copyGeometry(geometries.get(scene.outsideDimming.featureRevisionId)!) as
          Extract<Geometry, { type: 'Polygon' }>,
      },
    } : {}),
    layers,
    ...(scene.roadway ? { roadway: evaluateRoadwayAnimation(project.roadways!.find(r => r.id === scene.roadway!.roadwayId)!, scene.roadway.mappings, localFrame, scene.roadway.startFrame, scene.roadway.endFrame) } : {}),
    ...(scene.caption ? { caption: scene.caption } : {}),
    ...(scene.credit ? { credit: scene.credit } : {}),
    ...(scene.researchSnapshotId ? { researchCard: researchCard(project, scene.researchSnapshotId) } : {}),
    annotations: scene.annotations.map(annotation => ({
      id: annotation.id,
      text: annotation.text,
      anchor: [...annotation.anchor] as Position,
      opacity: labelOpacity(annotation, localFrame),
      ...(annotation.fontSize ? { fontSize: annotation.fontSize } : {}),
      ...(annotation.variantOffsets?.[variantId] ? { leaderLine: { offset: [...annotation.variantOffsets[variantId]!] as Position } } : annotation.leaderLine ? {
        leaderLine: { offset: [...annotation.leaderLine.offset] as [number, number] },
      } : {}),
    })),
  });
}

function researchCard(project: ProjectDocument, id: string) {
  const snapshot = project.researchSnapshots!.find(value => value.id === id)!;
  const value = snapshot.result.value;
  const number = value && typeof value === 'object' && !Array.isArray(value) ? value.displayPopulation : value;
  return {
    text: snapshot.status === 'approved' ? (typeof number === 'number' ? number.toLocaleString('en-US') : String(number)) + ' estimated residents' : 'Research awaiting review',
    qualifier: snapshot.result.note,
    status: snapshot.status,
  };
}

