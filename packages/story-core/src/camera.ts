import type { CameraKeyframe, Position } from '../../project-schema/src/index.ts';
import { interpolatePosition } from './mercator.ts';

/** The camera values to apply immediately at the requested frame. */
export type CameraState = Pick<CameraKeyframe, 'center' | 'zoom' | 'bearing' | 'pitch'>;

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
  const linear = (frame - from.frame) / (to.frame - from.frame);
  const progress = to.easing === 'ease-in-out' ? linear * linear * (3 - 2 * linear) : linear;
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
