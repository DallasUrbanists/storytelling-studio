import type { Geometry, Position } from '../../project-schema/src/index.ts';
import { radiansPerDegree } from './mercator.ts';

function copyPath(path: readonly Position[]): Position[] {
  return path.map(position => [...position]);
}

/** Copy the saved geometry, including every polygon ring in its original order. */
export function copyGeometry(geometry: Geometry): Geometry {
  switch (geometry.type) {
    case 'Point':
      return { type: 'Point', coordinates: [...geometry.coordinates] };
    case 'LineString':
      return { type: 'LineString', coordinates: copyPath(geometry.coordinates) };
    case 'Polygon':
      return { type: 'Polygon', coordinates: geometry.coordinates.map(copyPath) };
  }
}

// The difference of atanh(sin(latitude)) avoids subtracting two nearly
// equal projected latitudes when a segment runs nearly east-west.
function mercatorLatitudeChange(latitude: number, change: number): number {
  const sine = Math.sin(change / 2);
  const numerator = 2 * Math.cos(latitude + change / 2) * sine;
  const denominator = Math.cos(latitude) * Math.cos(latitude + change) + 2 * sine ** 2;
  return Math.atanh(numerator / denominator);
}

function rhumbDistance(from: Position, to: Position): number {
  const latitude = from[1] * radiansPerDegree;
  const latitudeChange = (to[1] - from[1]) * radiansPerDegree;
  const longitudeChange = (to[0] - from[0]) * radiansPerDegree;
  const projectedChange = mercatorLatitudeChange(latitude, latitudeChange);
  const longitudeScale = projectedChange === 0
    ? Math.cos(latitude)
    : latitudeChange / projectedChange;
  return Math.hypot(latitudeChange, longitudeScale * longitudeChange);
}

function traceEndpoint(from: Position, to: Position, progress: number): Position {
  const latitude = from[1] * radiansPerDegree;
  const latitudeChange = (to[1] - from[1]) * radiansPerDegree;
  const projectedChange = mercatorLatitudeChange(latitude, latitudeChange);
  // A rhumb line has constant bearing, so distance along it is proportional
  // to latitude change. Longitude then follows the straight Mercator segment.
  const projectedProgress = projectedChange === 0
    ? progress
    : mercatorLatitudeChange(latitude, latitudeChange * progress) / projectedChange;
  return [
    from[0] + (to[0] - from[0]) * projectedProgress,
    from[1] + (to[1] - from[1]) * progress,
  ];
}

/**
 * Return the visible prefix of one saved path at progress from 0 to 1.
 * Use spherical rhumb-line distances so the partial endpoint follows both
 * geographic distance and the straight Mercator line or boundary.
 */
export function tracePath(path: readonly Position[], progress: number): Position[] {
  if (progress <= 0) return [];
  if (progress >= 1) return copyPath(path);

  const lengths = path.slice(1).map((to, index) => rhumbDistance(path[index], to));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) return [];

  const target = total * progress;
  let tracedLength = 0;
  for (const [index, length] of lengths.entries()) {
    if (length === 0) continue;
    const segmentEnd = tracedLength + length;
    if (target === segmentEnd) return copyPath(path.slice(0, index + 2));
    if (target < segmentEnd) {
      const coordinates = copyPath(path.slice(0, index + 1));
      coordinates.push(traceEndpoint(
        path[index],
        path[index + 1],
        (target - tracedLength) / length,
      ));
      return coordinates;
    }
    tracedLength = segmentEnd;
  }
  return copyPath(path);
}
