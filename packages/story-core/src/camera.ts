import type { CameraKeyframe, FocusExtent, FocusStep, Geometry, Position, ProjectDocument } from '../../project-schema/src/index.ts';
import { interpolatePosition, radiansPerDegree } from './mercator.ts';

/** The camera values to apply immediately at the requested frame. */
export type CameraState = Pick<CameraKeyframe, 'center' | 'zoom' | 'bearing' | 'pitch'>;

export type CameraViewport = { width: number; height: number };
/** Insets in output pixels at pixel ratio 1, measured from the viewport edges. */
export type CameraInsets = { top: number; right: number; bottom: number; left: number };
export type CameraFitOptions = {
  safeArea?: Partial<CameraInsets>;
  padding?: number | Partial<CameraInsets>;
  maxZoom?: number;
};
export type CameraFitErrorCode = 'invalid-extent' | 'invalid-geometry' | 'invalid-viewport'
  | 'invalid-padding' | 'invalid-max-zoom' | 'invalid-camera' | 'unsupported-bounds';

/** A fit failure must be resolved before saving a new camera; no bounds are clamped. */
export class CameraFitError extends Error {
  readonly code: CameraFitErrorCode;

  constructor(code: CameraFitErrorCode, message: string) {
    super(`Camera fit: ${message}`);
    this.name = 'CameraFitError';
    this.code = code;
  }
}

/** Match the flat Mercator bridge's MapLibre world size and default zoom limits. */
export const cameraFitLimits = Object.freeze({
  tileSize: 512, minZoom: -2, maxZoom: 22, maxLatitude: 85.05112878,
});

function fitFailure(code: CameraFitErrorCode, message: string): never {
  throw new CameraFitError(code, message);
}

function checkExtent(extent: Readonly<FocusExtent>): void {
  if (!Array.isArray(extent) || extent.length !== 4 || !Array.from(extent).every(Number.isFinite)) {
    fitFailure('invalid-extent', 'Expected four finite WGS84 bounds');
  }
  const [west, south, east, north] = extent;
  if (west > east || south > north || west < -180 || east > 180
    || south < -cameraFitLimits.maxLatitude || north > cameraFitLimits.maxLatitude) {
    fitFailure('unsupported-bounds', 'Bounds must be ordered, nonwrapping and within flat Mercator limits');
  }
}

/**
 * Bound a validated Point, LineString or Polygon without altering its coordinates.
 * Empty shapes, malformed rings and segments crossing the antimeridian are errors.
 * This framing helper does not establish topology, provenance or source approval.
 */
export function cameraExtentForGeometry(geometry: Geometry): FocusExtent {
  let paths: Position[][];
  if (geometry?.type === 'Point') paths = [[geometry.coordinates]];
  else if (geometry?.type === 'LineString') {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
      fitFailure('invalid-geometry', 'A line requires at least two positions');
    }
    paths = [geometry.coordinates];
  } else if (geometry?.type === 'Polygon') {
    if (!Array.isArray(geometry.coordinates) || !geometry.coordinates.length) {
      fitFailure('invalid-geometry', 'A polygon requires a closed exterior ring');
    }
    paths = geometry.coordinates;
  } else fitFailure('invalid-geometry', 'Expected a supported geographic geometry');
  const extent: FocusExtent = [Infinity, Infinity, -Infinity, -Infinity];
  for (const path of paths) {
    if (!Array.isArray(path) || !path.length) fitFailure('invalid-geometry', 'Empty coordinate path');
    for (const [index, position] of path.entries()) {
      if (!Array.isArray(position) || position.length !== 2 || !Array.from(position).every(Number.isFinite)) {
        fitFailure('invalid-geometry', 'Expected finite longitude, latitude pairs');
      }
      const [longitude, latitude] = position;
      checkExtent([longitude, latitude, longitude, latitude]);
      if (index > 0 && Math.abs(longitude - path[index - 1][0]) > 180) {
        fitFailure('unsupported-bounds', 'Antimeridian segments require explicit preprocessing');
      }
      extent[0] = Math.min(extent[0], longitude);
      extent[1] = Math.min(extent[1], latitude);
      extent[2] = Math.max(extent[2], longitude);
      extent[3] = Math.max(extent[3], latitude);
    }
    if (geometry.type === 'Polygon' && (path.length < 4
      || path[0][0] !== path[path.length - 1][0] || path[0][1] !== path[path.length - 1][1])) {
      fitFailure('invalid-geometry', 'Polygon rings must have at least four positions and close explicitly');
    }
  }
  return extent;
}

function mercatorY(latitude: number): number {
  return (1 - Math.asinh(Math.tan(latitude * radiansPerDegree)) / Math.PI) / 2;
}

function latitudeAt(y: number): number {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) / radiansPerDegree;
}

function checkViewport(viewport: CameraViewport): void {
  if (!Number.isSafeInteger(viewport?.width) || !Number.isSafeInteger(viewport?.height)
    || viewport.width <= 0 || viewport.height <= 0) {
    fitFailure('invalid-viewport', 'Expected positive integer output dimensions');
  }
}

function insets(value: number | Partial<CameraInsets> = 0): CameraInsets {
  const result = typeof value === 'number'
    ? { top: value, right: value, bottom: value, left: value }
    : { top: 0, right: 0, bottom: 0, left: 0, ...value };
  if (value === null || typeof value !== 'number' && (typeof value !== 'object' || Array.isArray(value))
    || Object.keys(result).some(key => !['top', 'right', 'bottom', 'left'].includes(key))
    || !Object.values(result).every(side => Number.isFinite(side) && side >= 0)) {
    fitFailure('invalid-padding', 'Insets must be finite, nonnegative output pixels');
  }
  return result;
}

function checkBridgeCamera(camera: CameraState, viewport: CameraViewport): void {
  if (!camera || !Array.isArray(camera.center) || camera.center.length !== 2
    || !Array.from(camera.center).every(Number.isFinite) || Math.abs(camera.center[0]) > 180
    || Math.abs(camera.center[1]) > cameraFitLimits.maxLatitude
    || !Number.isFinite(camera.zoom) || camera.zoom < cameraFitLimits.minZoom || camera.zoom > cameraFitLimits.maxZoom
    || !Number.isFinite(camera.bearing) || camera.pitch !== 0) {
    fitFailure('invalid-camera', 'Expected a finite flat Mercator camera within bridge zoom limits');
  }
  const worldSize = cameraFitLimits.tileSize * 2 ** camera.zoom;
  const y = mercatorY(camera.center[1]);
  // Keep both the screen-height constraint and rotated corners inside the world.
  const bearing = wrapAngle(camera.bearing) * radiansPerDegree;
  const halfHeight = Math.max(viewport.height, Math.abs(Math.cos(bearing)) * viewport.height
    + Math.abs(Math.sin(bearing)) * viewport.width) / (2 * worldSize);
  if (y - halfHeight < 0 || y + halfHeight > 1) {
    fitFailure('unsupported-bounds', 'The viewport would exceed the Mercator world and constrain the bridge camera');
  }
}

/**
 * Fit verified, unrotated geographic bounds to a fixed output's safe area.
 * Safe-area insets and author padding add; omitted edges are zero. A zero span
 * does not limit zoom; a point uses maxZoom (default 22). Narrow extents cap there.
 * Unsupported bounds fail instead of wrapping, clipping or silently changing zoom.
 */
export function fitCameraToExtent(
  extent: Readonly<FocusExtent>,
  viewport: CameraViewport,
  options: CameraFitOptions = {},
): CameraState {
  checkExtent(extent);
  checkViewport(viewport);
  const safe = insets(options.safeArea);
  const padding = insets(options.padding);
  const top = safe.top + padding.top, bottom = safe.bottom + padding.bottom;
  const left = safe.left + padding.left, right = safe.right + padding.right;
  const width = viewport.width - left - right, height = viewport.height - top - bottom;
  if (width <= 0 || height <= 0) fitFailure('invalid-padding', 'Insets must leave a positive safe area');
  const maxZoom = options.maxZoom ?? cameraFitLimits.maxZoom;
  if (!Number.isFinite(maxZoom) || maxZoom < cameraFitLimits.minZoom || maxZoom > cameraFitLimits.maxZoom) {
    fitFailure('invalid-max-zoom', 'maxZoom must be within the bridge range [-2, 22]');
  }
  const [west, south, east, north] = extent;
  const northY = mercatorY(north), southY = mercatorY(south);
  const spanX = (east - west) / 360, spanY = southY - northY;
  const zoom = Math.min(maxZoom,
    spanX === 0 ? Infinity : Math.log2(width / (cameraFitLimits.tileSize * spanX)),
    spanY === 0 ? Infinity : Math.log2(height / (cameraFitLimits.tileSize * spanY)));
  const worldSize = cameraFitLimits.tileSize * 2 ** zoom;
  const camera: CameraState = {
    center: [
      (west + east) / 2 - (left - right) * 180 / worldSize,
      latitudeAt((northY + southY) / 2 - (top - bottom) / (2 * worldSize)),
    ],
    zoom, bearing: 0, pitch: 0,
  };
  checkBridgeCamera(camera, viewport);
  return camera;
}

/**
 * Return a detached step with both variant cameras saved for existing evaluation.
 * Each variant fits its override extent or the base extent independently. Existing
 * complete camera overrides are manual and retained; remove one to refit it.
 * Manual framing has no automatic landmark-containment guarantee. Timing, source
 * references, base extent and fallback camera are preserved, with no export refit.
 */
export function fitFocusStep(
  step: FocusStep,
  viewports: ProjectDocument['outputVariants'],
  options: Partial<Record<keyof ProjectDocument['outputVariants'], CameraFitOptions>> = {},
): FocusStep {
  checkExtent(step.extent);
  const result = structuredClone(step);
  result.variantOverrides ??= {};
  for (const variant of ['portrait', 'landscape'] as const) {
    checkViewport(viewports[variant]);
    const override = result.variantOverrides[variant];
    const extent = override?.extent ?? result.extent;
    checkExtent(extent);
    const camera = override?.camera ?? fitCameraToExtent(extent, viewports[variant], options[variant]);
    checkBridgeCamera(camera, viewports[variant]);
    result.variantOverrides[variant] = { extent: [...extent], camera };
  }
  return result;
}

function savedCamera({ center, zoom, bearing, pitch }: CameraKeyframe): CameraState {
  return { center: [...center], zoom, bearing, pitch };
}

function wrapAngle(angle: number): number {
  const reduced = angle % 360;
  if (reduced < -180) return reduced + 360;
  if (reduced > 180) return reduced - 360;
  return reduced;
}

function shortestTurn(from: number, to: number): number {
  const turn = wrapAngle(wrapAngle(to) - wrapAngle(from));
  return turn === -180 ? 180 : turn;
}

/** Evaluate the validated camera track at a scene-local frame. */
export function evaluateCamera(
  track: readonly CameraKeyframe[],
  frame: number,
): CameraState {
  const nextIndex = track.findIndex(key => key.frame >= frame);
  if (nextIndex === -1) return savedCamera(track[track.length - 1]);

  const to = track[nextIndex];
  if (nextIndex === 0 || frame === to.frame) return savedCamera(to);

  const from = track[nextIndex - 1];
  const progress = (frame - from.frame) / (to.frame - from.frame);
  const unwrappedEnd: Position = [
    from.center[0] + shortestTurn(from.center[0], to.center[0]),
    to.center[1],
  ];
  const [longitude, latitude] = interpolatePosition(
    from.center, unwrappedEnd, progress,
  );
  const zoom = from.zoom === to.zoom
    ? from.zoom
    : from.zoom * (1 - progress) + to.zoom * progress;
  const bearing = wrapAngle(from.bearing)
    + shortestTurn(from.bearing, to.bearing) * progress;
  return {
    center: [wrapAngle(longitude), latitude],
    zoom,
    bearing: wrapAngle(bearing),
    pitch: 0,
  };
}
