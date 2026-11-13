import type { Geometry, Position, ProjectDocument } from '../../project-schema/src/index.ts';
import { evaluateCamera, type CameraState } from './camera.ts';
import { copyGeometry, tracePath } from './geometry.ts';
import { evaluateFocus, type FocusState } from './focus.ts';

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
  trace?: {
    mode: NonNullable<Layer['trace']>['mode'];
    progress: number;
    coordinates: Position[];
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
    geometry: Extract<Geometry, { type: 'Polygon' }>;
    opacity: number;
  };
  layers: LayerState[];
  annotations: {
    id: string; text: string; anchor: Position; opacity: number;
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
  };

  // Validation pairs a trace with a LineString or Polygon of the matching mode.
  const trace = layer.trace;
  if (trace && geometry.type !== 'Point') {
    const path = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates;
    const progress = Math.max(0, Math.min(1,
      (frame - trace.startFrame) / (trace.endFrameExclusive - trace.startFrame),
    ));
    state.trace = { mode: trace.mode, progress, coordinates: tracePath(path, progress) };
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
    camera: sequence?.camera ?? evaluateCamera(scene.cameraTrack, localFrame),
    focus,
    ...(scene.outsideDimming ? {
      outsideDimming: {
        ...scene.outsideDimming,
        geometry: copyGeometry(geometries.get(scene.outsideDimming.featureRevisionId)!) as
          Extract<Geometry, { type: 'Polygon' }>,
      },
    } : {}),
    layers,
    annotations: scene.annotations.map(annotation => ({
      id: annotation.id,
      text: annotation.text,
      anchor: [...annotation.anchor] as Position,
      opacity: labelOpacity(annotation, localFrame),
      ...(annotation.leaderLine ? {
        leaderLine: { offset: [...annotation.leaderLine.offset] as [number, number] },
      } : {}),
    })),
  });
}
