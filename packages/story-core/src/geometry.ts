import type { Geometry, Position } from '../../project-schema/src/index.ts';
import { radiansPerDegree } from './mercator.ts';
import turfArea from '@turf/area';
import turfIntersect from '@turf/intersect';
import turfDifference from '@turf/difference';
import { featureCollection, polygon, multiPolygon } from '@turf/helpers';
import { orient2d } from 'robust-predicates';
import type { Polygon, MultiPolygon } from 'geojson';

type XY = [number, number];
type Ring = XY[];
type PolygonRings = Ring[];
export type GeographicPolygon = Polygon | MultiPolygon;

/** Versioned spherical area method; all reported areas are square meters. */
export const polygonAreaMethod = Object.freeze({
  id: 'turf-spherical-area',
  version: 1,
  turfVersion: '7.4.0',
  earthRadiusMeters: 6371008.8,
  maxPositions: 2000,
  maxRings: 128,
});

export type PolygonOverlap = {
  overlap: 'none' | 'full' | 'partial';
  sourceAreaM2: number;
  intersectedAreaM2: number;
  fraction: number;
  intersection: GeographicPolygon | null;
};

function invalid(message: string): never {
  throw new Error(`Invalid geographic polygon: ${message}`);
}

function same(a: XY, b: XY): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function onSegment(point: XY, a: XY, b: XY): boolean {
  return orient2d(...a, ...b, ...point) === 0 &&
    point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]) &&
    point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1]);
}

// Adaptive orientation predicates retain the sign near collinear boundaries.
function segmentsMeet(a: XY, b: XY, c: XY, d: XY): boolean {
  const abC = orient2d(...a, ...b, ...c);
  const abD = orient2d(...a, ...b, ...d);
  const cdA = orient2d(...c, ...d, ...a);
  const cdB = orient2d(...c, ...d, ...b);
  return (Math.sign(abC) !== Math.sign(abD) && abC !== 0 && abD !== 0 &&
    Math.sign(cdA) !== Math.sign(cdB) && cdA !== 0 && cdB !== 0) ||
    onSegment(c, a, b) || onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d);
}

function ringsMeet(a: Ring, b: Ring): boolean {
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      if (segmentsMeet(a[i], a[i + 1], b[j], b[j + 1])) return true;
    }
  }
  return false;
}

// Call only after boundary contacts have been excluded.
function insideRing(point: XY, ring: Ring): boolean {
  let inside = false;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1];
    if ((a[1] > point[1]) !== (b[1] > point[1])) {
      const side = orient2d(...a, ...b, ...point);
      if ((side < 0) === (b[1] > a[1])) inside = !inside;
    }
  }
  return inside;
}

function insidePolygon(point: XY, rings: PolygonRings): boolean {
  return insideRing(point, rings[0]) && !rings.slice(1).some(hole => insideRing(point, hole));
}

/**
 * Validate a bounded RFC 7946 geometry in longitude, latitude degrees and copy it.
 * Reject invalid or unsupported topology without closing, snapping, or repairing it.
 * Legacy CRS declarations, altitude, poles, and longitude spans >= 180° are unsupported.
 */
export function validateGeographicPolygon(input: unknown): GeographicPolygon {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('expected Polygon or MultiPolygon geometry');
  const record = input as Record<string, unknown>;
  if (Object.hasOwn(record, 'crs')) invalid('convert the declared CRS explicitly before import');
  if (record.type !== 'Polygon' && record.type !== 'MultiPolygon') invalid('expected Polygon or MultiPolygon geometry');
  const parts = record.type === 'Polygon' ? [record.coordinates] : record.coordinates;
  if (!Array.isArray(parts) || parts.length === 0 || parts.length > polygonAreaMethod.maxRings) invalid('empty or excessive polygon parts');
  let positions = 0, ringCount = 0, west = Infinity, east = -Infinity;
  const checked: PolygonRings[] = [];
  for (const part of parts) {
    if (!Array.isArray(part) || part.length === 0) invalid('empty polygon');
    ringCount += part.length;
    if (ringCount > polygonAreaMethod.maxRings) invalid('ring limit exceeded');
    const rings: PolygonRings = [];
    for (const rawRing of part) {
      if (!Array.isArray(rawRing) || rawRing.length < 4) invalid('rings require at least four positions');
      positions += rawRing.length;
      if (positions > polygonAreaMethod.maxPositions) invalid('position limit exceeded');
      const ring: Ring = [];
      for (const position of rawRing) {
        if (!Array.isArray(position) || position.length !== 2 ||
          !Number.isFinite(position[0]) || !Number.isFinite(position[1]) ||
          Math.abs(position[0]) > 180 || Math.abs(position[1]) >= 90) {
          invalid('positions must be finite [longitude, latitude] degrees, excluding poles');
        }
        west = Math.min(west, position[0]); east = Math.max(east, position[0]);
        ring.push([position[0], position[1]]);
      }
      if (!same(ring[0], ring[ring.length - 1])) invalid('unclosed ring');
      const n = ring.length - 1;
      for (let i = 0; i < n; i++) {
        const a = ring[i], b = ring[(i + 1) % n], c = ring[(i + 2) % n];
        if (same(a, b)) invalid('duplicate consecutive positions');
        if (orient2d(...a, ...b, ...c) === 0 && !onSegment(b, a, c)) invalid('backtracking or zero-area ring');
        for (let j = i + 1; j < n; j++) {
          if (j === i + 1 || (i === 0 && j === n - 1)) continue;
          if (segmentsMeet(a, b, ring[j], ring[j + 1])) invalid('self-intersecting ring');
        }
      }
      rings.push(ring);
    }
    for (let i = 1; i < rings.length; i++) {
      if (ringsMeet(rings[0], rings[i]) || !insideRing(rings[i][0], rings[0])) invalid('hole must be strictly inside its exterior');
      for (let j = 1; j < i; j++) {
        if (ringsMeet(rings[i], rings[j]) || insideRing(rings[i][0], rings[j]) || insideRing(rings[j][0], rings[i])) {
          invalid('holes overlap, touch, or nest');
        }
      }
    }
    checked.push(rings);
  }
  if (east - west >= 180) invalid('antimeridian or longitude span >= 180 degrees requires a recorded preprocessing method');
  for (let i = 0; i < checked.length; i++) {
    for (let j = 0; j < i; j++) {
      if (checked[i].some(a => checked[j].some(b => ringsMeet(a, b))) ||
        insidePolygon(checked[i][0][0], checked[j]) || insidePolygon(checked[j][0][0], checked[i])) {
        invalid('multipart boundaries touch or interiors overlap; supply an approved union');
      }
    }
  }
  const result: GeographicPolygon = record.type === 'Polygon'
    ? { type: 'Polygon', coordinates: checked[0] }
    : { type: 'MultiPolygon', coordinates: checked };
  // Reject numerically zero holes too; an exterior must not hide their failure.
  // Every component must provide a positive denominator, not just the total.
  for (const rings of checked) {
    for (const ring of rings) positiveArea({ type: 'Polygon', coordinates: [ring] });
    positiveArea({ type: 'Polygon', coordinates: rings });
  }
  return result;
}

function positiveArea(geometry: GeographicPolygon): number {
  const area = turfArea(geometry);
  if (!Number.isFinite(area) || area <= 0) invalid('nonfinite or zero geodesic area');
  return area;
}

/** Return Turf's spherical geodesic area in square meters, subtracting holes. */
export function geodesicAreaM2(input: unknown): number {
  return positiveArea(validateGeographicPolygon(input));
}

function asFeature(geometry: GeographicPolygon) {
  return geometry.type === 'Polygon' ? polygon(geometry.coordinates) : multiPolygon(geometry.coordinates);
}

/** Intersect one source unit with a study area; boundary-only contact has no area. */
export function intersectPolygonAreas(sourceInput: unknown, studyAreaInput: unknown): PolygonOverlap {
  const source = validateGeographicPolygon(sourceInput);
  const studyArea = validateGeographicPolygon(studyAreaInput);
  const sourceAreaM2 = positiveArea(source);
  let clipped;
  let full = false;
  try {
    const pair = featureCollection<GeographicPolygon>([asFeature(source), asFeature(studyArea)]);
    clipped = turfIntersect(pair);
    if (clipped !== null) full = turfDifference(pair) === null;
  } catch {
    throw new Error('Polygon intersection failed; no boundary repair was attempted');
  }
  if (clipped === null) return { overlap: 'none', sourceAreaM2, intersectedAreaM2: 0, fraction: 0, intersection: null };
  const intersection = validateGeographicPolygon(clipped.geometry);
  // A clipping operation can remove collinear vertices and reorder sums. When
  // no source remainder exists, retain the source's exact denominator instead
  // of classifying full coverage from a floating-point area comparison.
  if (full) return { overlap: 'full', sourceAreaM2, intersectedAreaM2: sourceAreaM2, fraction: 1, intersection };
  const intersectedAreaM2 = positiveArea(intersection);
  const fraction = intersectedAreaM2 / sourceAreaM2;
  if (!Number.isFinite(fraction) || fraction <= 0 || fraction > 1) {
    throw new Error('Polygon intersection produced a nonfinite or out-of-range area fraction');
  }
  return { overlap: 'partial', sourceAreaM2, intersectedAreaM2, fraction, intersection };
}

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
    case 'MultiLineString':
      return { type: 'MultiLineString', coordinates: geometry.coordinates.map(copyPath) };
    case 'MultiPolygon':
      return { type: 'MultiPolygon', coordinates: geometry.coordinates.map(rings => rings.map(copyPath)) };
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

/** Reveal disconnected parts by their total length without drawing a gap connector. */
export function traceParts(paths: readonly (readonly Position[])[], progress: number): Position[][] {
  const lengths = paths.map(path => path.slice(1).reduce((sum, point, i) => sum + rhumbDistance(path[i], point), 0));
  let remaining = lengths.reduce((a, b) => a + b, 0) * Math.max(0, Math.min(1, progress));
  return paths.map((path, i) => {
    const fraction = lengths[i] === 0 ? 0 : Math.min(1, remaining / lengths[i]);
    remaining = Math.max(0, remaining - lengths[i]);
    return tracePath(path, fraction);
  });
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

