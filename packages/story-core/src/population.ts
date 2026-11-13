import { geodesicAreaM2, intersectPolygonAreas, validateGeographicPolygon } from './geometry.ts';
import type { GeographicPolygon } from './geometry.ts';

export type PopulationUnit = { geoid: string; geometry: GeographicPolygon; estimate: number | null; marginOfError: number | null; estimateAnnotation: string | null; marginAnnotation: string | null };
export type PopulationResult = {
  population: number | null; displayPopulation: number | null; densityPerKm2: number | null;
  areaM2: number; coverage: number; complete: boolean; missingGeoids: string[];
  contributions: { geoid: string; fraction: number; sourcePopulation: number | null; marginOfError: number | null; contribution: number | null; overlapAreaM2: number; annotation: string | null; marginAnnotation: string | null }[];
  uncertainty: string; method: 'area-weighted-count'; methodVersion: 1; period: string;
};

/** Allocate an additive count using geodesic overlap, retaining missingness and all contributions. */
export function allocatePopulation(areaInput: unknown, units: PopulationUnit[], period = '2020–2024'): PopulationResult {
  const area = validateGeographicPolygon(areaInput), areaM2 = geodesicAreaM2(area);
  if (!Array.isArray(units) || !units.length || units.length > 5000) throw new Error('Supply 1–5,000 bounded source units.');
  const ids = new Set<string>();
  const intersections: GeographicPolygon[] = [];
  let overlapArea = 0, total = 0;
  const missingGeoids: string[] = [];
  const contributions = units.map(unit => {
    if (!/^\d{12}$/.test(unit.geoid) || ids.has(unit.geoid)) throw new Error('Source GEOIDs must be distinct 12-digit strings.');
    ids.add(unit.geoid);
    for (const value of [unit.estimate, unit.marginOfError]) if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error('Negative/special-coded estimates must be imported as missing values.');
    const overlap = intersectPolygonAreas(unit.geometry, area);
    if (overlap.intersection) {
      for (const previous of intersections) if (intersectPolygonAreas(previous, overlap.intersection).intersectedAreaM2 > 0.001) throw new Error('Overlapping source units would count the same area twice.');
      intersections.push(overlap.intersection);
    }
    overlapArea += overlap.intersectedAreaM2;
    const contribution = unit.estimate === null || (unit.estimateAnnotation !== null && unit.estimateAnnotation.trim() !== '') ? null : unit.estimate * overlap.fraction;
    if (overlap.fraction > 0) {
      if (contribution === null) missingGeoids.push(unit.geoid); else total += contribution;
    }
    return { geoid: unit.geoid, fraction: overlap.fraction, sourcePopulation: unit.estimate, marginOfError: unit.marginOfError,
      contribution, overlapAreaM2: overlap.intersectedAreaM2, annotation: unit.estimateAnnotation, marginAnnotation: unit.marginAnnotation };
  });
  const coverage = Math.min(1, overlapArea / areaM2);
  const complete = coverage >= 0.999999 && missingGeoids.length === 0;
  return { population: complete ? total : null, displayPopulation: complete ? Math.round(total) : null,
    densityPerKm2: complete ? total / (areaM2 / 1000000) : null, areaM2, coverage, complete, missingGeoids, contributions,
    uncertainty: 'Modeled area-weighted estimate assuming uniform population within each source unit. Combined sampling and allocation uncertainty is not quantified; source margins of error are retained.',
    method: 'area-weighted-count', methodVersion: 1, period };
}

/** Normalize ACS API or summary-file records while preserving leading zeros and annotations. */
export function joinPopulationRows(rows: Record<string, unknown>[], boundaries: { type: string; features: { properties: Record<string, unknown>; geometry: unknown }[] }): { units: PopulationUnit[]; unmatchedRows: string[]; unmatchedBoundaries: string[] } {
  if (!Array.isArray(rows) || !boundaries || boundaries.type !== 'FeatureCollection' || !Array.isArray(boundaries.features)) throw new Error('Supply table rows and a GeoJSON boundary collection.');
  const mapped = new Map<string, Record<string, unknown>>();
  const geoidOf = (value: unknown): string => {
    if (typeof value !== 'string') throw new Error('GEOIDs must be strings, including leading zeros.');
    const id = value.replace(/^1500000US/, '');
    if (!/^\d{12}$/.test(id)) throw new Error('Expected block-group summary level 150 and a 12-digit GEOID.');
    return id;
  };
  for (const row of rows) {
    const joined = ['state','county','tract','block group'].every(k => typeof row[k] === 'string') ? ['state','county','tract','block group'].map(k => row[k]).join('') : undefined;
    const geoid = geoidOf(row.GEOID ?? row.GEO_ID ?? joined);
    if (mapped.has(geoid)) throw new Error('Duplicate table GEOID.');
    mapped.set(geoid, row);
  }
  const seen = new Set<string>(), units: PopulationUnit[] = [], unmatchedBoundaries: string[] = [];
  const count = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '' || value === '-' || value === 'N') return null;
    const result = Number(value); return Number.isFinite(result) && result >= 0 ? result : null;
  };
  for (const feature of boundaries.features) {
    const id = geoidOf(feature.properties.GEOID);
    if (seen.has(id)) throw new Error('Duplicate boundary GEOID.'); seen.add(id);
    if (feature.properties.STATEFP !== undefined && feature.properties.STATEFP !== id.slice(0, 2)) throw new Error('Boundary state code differs from GEOID.');
    if (feature.properties.COUNTYFP !== undefined && feature.properties.COUNTYFP !== id.slice(2, 5)) throw new Error('Boundary county code differs from GEOID.');
    const row = mapped.get(id);
    if (!row) unmatchedBoundaries.push(id);
    units.push({ geoid: id, geometry: validateGeographicPolygon(feature.geometry), estimate: count(row?.B01003_001E ?? row?.B01003_E001),
      marginOfError: count(row?.B01003_001M ?? row?.B01003_M001),
      estimateAnnotation: row?.B01003_001EA == null ? null : String(row.B01003_001EA),
      marginAnnotation: row?.B01003_001MA == null ? null : String(row.B01003_001MA) });
  }
  return { units, unmatchedRows: [...mapped.keys()].filter(id => !seen.has(id)), unmatchedBoundaries };
}

export type ComparableMeasure = { value: number; variable: string; universe: string; units: string; geographySha256: string; method: string; periodStart: number; periodEnd: number; priceBasis?: string; kind: 'count' | 'rate' | 'median' };
/** Only like-for-like, nonoverlapping measured periods can support a change claim. */
export function compareMeasures(before: ComparableMeasure, after: ComparableMeasure): { change: number; percent: number | null } {
  for (const key of ['variable','universe','units','geographySha256','method','kind','priceBasis'] as const) if (before[key] !== after[key]) throw new Error(`Incomparable ${key}.`);
  if (before.periodEnd >= after.periodStart || before.periodStart > before.periodEnd || after.periodStart > after.periodEnd) throw new Error('Use ordered, nonoverlapping reference periods.');
  if (![before.value, after.value].every(Number.isFinite)) throw new Error('Missing measure.');
  if (before.kind === 'median' && before.method !== 'published-geography') throw new Error('Source medians cannot be spatially averaged.');
  return { change: after.value - before.value, percent: before.value === 0 ? null : (after.value / before.value - 1) * 100 };
}
