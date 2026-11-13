import type {
  RoadwayBand, RoadwayCrossSection, RoadwayDimension,
} from '../../project-schema/src/index.ts';

/** Numerical balance tolerance, not a measurement accuracy or display precision. */
export const ROADWAY_WIDTH_TOLERANCE_METERS = 0.01;

/** The edit supplies a replacement dimension with original units and evidence. */
export type RoadwayWidthEdit = { bandId: string; width: RoadwayDimension };

/** A diagnostic identifies the failed constraint, affected bands, and signed residual. */
export type RoadwayWidthDiagnostic = {
  code: 'invalid-width' | 'unknown-width' | 'unknown-band' | 'duplicate-edit' |
    'locked-width' | 'locked-overallocation' | 'overallocated' | 'unassigned' |
    'numeric-range';
  constraint: 'band' | 'edit' | 'pavement' | 'envelope';
  bandIds: string[];
  residualMeters: number | null;
  message: string;
};

/** Null totals indicate unavailable dimensions or unsupported arithmetic range. */
export type RoadwayWidthBalance = {
  availableMeters: number | null;
  allocatedMeters: number | null;
  lockedMeters: number | null;
  editableMeters: number | null;
  residualMeters: number | null;
};

type WidthResult = {
  toleranceMeters: number;
  /** True means a nonempty edit batch was accepted, including physical no-ops. */
  editsApplied: boolean;
  bands: RoadwayBand[];
  pavement: RoadwayWidthBalance;
  envelope: RoadwayWidthBalance | null;
};

/** The result is feasible only when every required dimension and constraint passes. */
export type RoadwayWidthResult =
  | (WidthResult & { status: 'feasible'; diagnostics: [] })
  | (WidthResult & { status: 'infeasible'; diagnostics: RoadwayWidthDiagnostic[] });

function widthMeters(
  dimension: RoadwayDimension,
  constraint: RoadwayWidthDiagnostic['constraint'],
  bandIds: string[],
  diagnostics: RoadwayWidthDiagnostic[],
): number | null {
  if (dimension.status === 'unknown') {
    diagnostics.push({ code: 'unknown-width', constraint, bandIds, residualMeters: null,
      message: 'A required width is unknown; no numeric value was inferred.' });
    return null;
  }
  const { value, meters, unit } = dimension;
  const converted = value * (unit === 'ft' ? 0.3048 : 1);
  if (!['assumed', 'documented', 'estimated'].includes(dimension.status) ||
      !['m', 'ft'].includes(unit) || !Number.isFinite(value) || value <= 0 ||
      !Number.isFinite(meters) || meters <= 0 || !Number.isFinite(converted) ||
      Math.abs(meters - converted) > 1e-9 * Math.max(1, meters)) {
    diagnostics.push({ code: 'invalid-width', constraint, bandIds, residualMeters: null,
      message: 'Widths must be finite and positive, with matching original units and meters.' });
    return null;
  }
  return meters;
}

// Neumaier summation retains small positive widths beside larger widths.
function sum(widths: readonly (number | null)[]): number | null {
  let total = 0;
  let correction = 0;
  for (const width of widths) {
    if (width === null) return null;
    const next = total + width;
    correction += Math.abs(total) >= Math.abs(width) ?
      (total - next) + width : (width - next) + total;
    total = next;
  }
  const result = total + correction;
  return Number.isFinite(result) ? result : null;
}

function balance(
  availableMeters: number | null,
  bands: readonly RoadwayBand[],
  widths: ReadonlyMap<string, number | null>,
  constraint: 'pavement' | 'envelope',
  diagnostics: RoadwayWidthDiagnostic[],
): RoadwayWidthBalance {
  const total = (subset: readonly RoadwayBand[]) => sum(subset.map(b => widths.get(b.id)!));
  const allocatedMeters = total(bands);
  const locked = bands.filter(b => b.locked);
  const lockedMeters = total(locked);
  const editableMeters = total(bands.filter(b => !b.locked));
  const residualMeters = availableMeters === null || allocatedMeters === null ?
    null : availableMeters - allocatedMeters;

  // Reject ranges where a double's numerical resolution approaches the tolerance.
  const scale = Math.max(availableMeters ?? 0, allocatedMeters ?? 0, lockedMeters ?? 0);
  const roundoff = 4 * Number.EPSILON * scale;
  const overflow = bands.every(b => widths.get(b.id) !== null) && allocatedMeters === null;
  if (overflow || roundoff >= ROADWAY_WIDTH_TOLERANCE_METERS / 100) {
    diagnostics.push({ code: 'numeric-range', constraint, bandIds: bands.map(b => b.id),
      residualMeters, message: 'Width totals exceed the supported numerical precision.' });
  } else {
    const tolerance = ROADWAY_WIDTH_TOLERANCE_METERS + roundoff;
    if (availableMeters !== null && lockedMeters !== null &&
        availableMeters - lockedMeters < -tolerance) {
      diagnostics.push({ code: 'locked-overallocation', constraint,
        bandIds: locked.map(b => b.id), residualMeters: availableMeters - lockedMeters,
        message: 'Locked bands alone exceed the available width.' });
    }
    if (residualMeters !== null && Math.abs(residualMeters) > tolerance) {
      diagnostics.push({ code: residualMeters < 0 ? 'overallocated' : 'unassigned',
        constraint, bandIds: bands.map(b => b.id), residualMeters,
        message: residualMeters < 0 ? 'Over by the absolute residual in meters.' :
          'Unassigned space remains; explicit width edits are required.' });
    }
  }
  return { availableMeters, allocatedMeters, lockedMeters, editableMeters, residualMeters };
}

/**
 * The solver checks a schema-validated cross-section and explicit band edits.
 *
 * The solver performs no distribution, compression, or calculation rounding.
 * It uses saved meters and checks the curb and any declared total envelope
 * within 0.01 m. Unknown widths, invalid dimensions, and nonzero residuals
 * beyond tolerance are infeasible. A rejected edit batch applies no edits;
 * its balances describe the unchanged bands. Locked bands retain their entire
 * saved dimension, even when an edit supplies equivalent units. Results are
 * detached from inputs. Provenance and structural validation remain the
 * project parser's responsibility, including validation before persistence.
 */
export function solveRoadwayWidths(
  section: RoadwayCrossSection,
  edits: readonly RoadwayWidthEdit[] = [],
): RoadwayWidthResult {
  const diagnostics: RoadwayWidthDiagnostic[] = [];
  const originals = new Map(section.bands.map(b => [b.id, b]));
  const replacements = new Map<string, RoadwayDimension>();
  const seen = new Set<string>();
  let rejected = false;
  for (const edit of edits) {
    const band = originals.get(edit.bandId);
    if (seen.has(edit.bandId) || !band) {
      diagnostics.push({ code: seen.has(edit.bandId) ? 'duplicate-edit' : 'unknown-band',
        constraint: 'edit', bandIds: [edit.bandId], residualMeters: null,
        message: 'Each edit must identify one distinct existing band.' });
      rejected = true;
    } else {
      // Unknown values can be retained as a draft, but cannot produce feasibility.
      const editProblems: RoadwayWidthDiagnostic[] = [];
      if (edit.width.status !== 'unknown') {
        widthMeters(edit.width, 'edit', [band.id], editProblems);
      }
      if (editProblems.length) {
        diagnostics.push(...editProblems);
        rejected = true;
      } else if (band.locked) {
        const unchanged = band.width.status === 'unknown' ? edit.width.status === 'unknown' :
          edit.width.status !== 'unknown' && band.width.meters === edit.width.meters;
        if (!unchanged) {
          diagnostics.push({ code: 'locked-width', constraint: 'edit', bandIds: [band.id],
            residualMeters: null, message: 'The edit changes a locked physical width.' });
          rejected = true;
        }
      } else replacements.set(band.id, edit.width);
    }
    seen.add(edit.bandId);
  }

  const bands = section.bands.map(b => structuredClone({ ...b,
    width: rejected ? b.width : replacements.get(b.id) ?? b.width,
  }));
  const widths = new Map(bands.map(b =>
    [b.id, widthMeters(b.width, 'band', [b.id], diagnostics)] as const));
  const pavement = balance(
    widthMeters(section.curbToCurb, 'pavement', [], diagnostics),
    bands.filter(b => b.location === 'between-curbs'), widths, 'pavement', diagnostics,
  );
  const envelope = section.envelope.width.status === 'unknown' ? null : balance(
    widthMeters(section.envelope.width, 'envelope', [], diagnostics),
    bands, widths, 'envelope', diagnostics,
  );
  const result = { toleranceMeters: ROADWAY_WIDTH_TOLERANCE_METERS,
    editsApplied: !rejected && edits.length > 0, bands, pavement, envelope };
  return diagnostics.length ? { ...result, status: 'infeasible', diagnostics } :
    { ...result, status: 'feasible', diagnostics: [] };
}
