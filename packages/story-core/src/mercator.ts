import type { Position } from '../../project-schema/src/index.ts';

export const radiansPerDegree = Math.PI / 180;

/** Interpolate longitude and projected latitude on a straight Mercator segment. */
export function interpolatePosition(
  from: Position,
  to: Position,
  progress: number,
): Position {
  const longitude = from[0] + (to[0] - from[0]) * progress;
  const fromY = Math.asinh(Math.tan(from[1] * radiansPerDegree));
  const toY = Math.asinh(Math.tan(to[1] * radiansPerDegree));
  const y = fromY + (toY - fromY) * progress;
  const latitude = from[1] === to[1]
    ? from[1]
    : Math.atan(Math.sinh(y)) / radiansPerDegree;
  return [longitude, latitude];
}
