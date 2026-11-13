import type {
  RoadwayBand, RoadwayCrossSection, RoadwayDimension,
} from '../../project-schema/src/index.ts';
import type { Roadway, RoadwaySectionReference } from '../../project-schema/src/project.ts';

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

export type RoadwaySegmentDiagnostic = {
  code: 'invalid-extent' | 'invalid-range' | 'overlap-or-order' | 'duplicate-id' |
    'missing-layout' | 'layout-role' | 'width-constraint' | 'transition-topology' |
    'transition-envelope' | 'transition-lock';
  segmentId: string | null;
  role?: RoadwayCrossSection['role'];
  endpoint?: 'start' | 'end';
  widthDiagnostics?: RoadwayWidthDiagnostic[];
  message: string;
};
export type RoadwayGap = { startMeters: number; endMeters: number };
export type RoadwaySegmentValidation = {
  status: 'valid' | 'invalid';
  gaps: RoadwayGap[];
  diagnostics: RoadwaySegmentDiagnostic[];
};

const roles = ['existing', 'proposed'] as const;
function resolveSection(road: Roadway, reference: RoadwaySectionReference): RoadwayCrossSection | undefined {
  return 'layoutId' in reference ?
    road.layouts?.find(layout => layout.id === reference.layoutId)?.section : reference;
}

/** Check ordered band correspondence without inferring lane additions or tapers. */
function transitionProblems(from: RoadwayCrossSection, to: RoadwayCrossSection):
    Pick<RoadwaySegmentDiagnostic, 'code' | 'message'>[] {
  const problems: Pick<RoadwaySegmentDiagnostic, 'code' | 'message'>[] = [];
  const sameDimension = (a: RoadwayDimension, b: RoadwayDimension) =>
    a.status === 'unknown' ? b.status === 'unknown' :
      b.status !== 'unknown' && a.meters === b.meters;
  const sameTopology = from.bands.length === to.bands.length && from.bands.every((band, i) => {
    const other = to.bands[i];
    return band.kind === other.kind && band.direction === other.direction &&
      band.location === other.location;
  });
  if (!sameTopology) problems.push({ code: 'transition-topology',
    message: 'Longitudinal interpolation requires matching ordered kinds, directions, and curb placement; use a segment break.' });
  if (!sameDimension(from.curbToCurb, to.curbToCurb) ||
      from.envelope.kind !== to.envelope.kind ||
      !sameDimension(from.envelope.width, to.envelope.width)) {
    problems.push({ code: 'transition-envelope',
      message: 'A longitudinal transition must retain identical curb and declared envelope widths and classification.' });
  }
  if (sameTopology && from.bands.some((band, i) =>
    (band.locked || to.bands[i].locked) && !sameDimension(band.width, to.bands[i].width))) {
    problems.push({ code: 'transition-lock',
      message: 'A longitudinal transition cannot change a width locked at either endpoint.' });
  }
  return problems;
}

/**
 * Check a structurally parsed roadway, including edited ranges and references.
 * Gaps are allowed and explicitly returned. Width failures retain their segment,
 * role, endpoint, band IDs, and solver residuals. No corridor-wide width exists.
 * Persistence must still pass parseProject for structure and evidence validation.
 */
export function validateRoadwaySegments(road: Roadway): RoadwaySegmentValidation {
  const diagnostics: RoadwaySegmentDiagnostic[] = [];
  const gaps: RoadwayGap[] = [];
  const extent = road.stationExtentMeters;
  if (!Number.isFinite(extent) || extent <= 0) diagnostics.push({ code: 'invalid-extent',
    segmentId: null, message: 'The station extent must be finite and positive.' });
  const layoutIds = new Set<string>();
  for (const layout of road.layouts ?? []) {
    if (layoutIds.has(layout.id)) diagnostics.push({ code: 'duplicate-id', segmentId: null,
      message: `Duplicate layout ID: ${layout.id}.` });
    layoutIds.add(layout.id);
  }
  const segmentIds = new Set<string>();
  let previousEnd = 0;
  for (const segment of road.segments) {
    const segmentId = segment.id;
    if (segmentIds.has(segmentId)) diagnostics.push({ code: 'duplicate-id', segmentId,
      message: 'Segment IDs must be unique within the roadway.' });
    segmentIds.add(segmentId);
    const { startMeters: start, endMeters: end } = segment;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 ||
        start >= end || end > extent) diagnostics.push({ code: 'invalid-range', segmentId,
      message: 'A segment requires finite 0 <= start < end <= station extent.' });
    if (start < previousEnd) diagnostics.push({ code: 'overlap-or-order', segmentId,
      message: 'Segment ranges must be authored in increasing, nonoverlapping order.' });
    if (start > previousEnd) gaps.push({ startMeters: previousEnd, endMeters: start });
    previousEnd = end;
    for (const role of roles) {
      const startSection = resolveSection(road, segment[role]);
      const endSection = segment.transition ? resolveSection(road,
        { layoutId: segment.transition[`${role}LayoutId`] }) : undefined;
      for (const endpoint of ['start', 'end'] as const) {
        if (endpoint === 'end' && !segment.transition) continue;
        const section = endpoint === 'start' ? startSection : endSection;
        if (!section) {
          diagnostics.push({ code: 'missing-layout', segmentId, role, endpoint,
            message: 'The segment references a missing roadway-local layout.' });
          continue;
        }
        if (section.role !== role) diagnostics.push({ code: 'layout-role', segmentId, role, endpoint,
          message: 'The referenced layout must have the selected existing/proposed role.' });
        const widths = solveRoadwayWidths(section);
        if (widths.status === 'infeasible') diagnostics.push({ code: 'width-constraint',
          segmentId, role, endpoint, widthDiagnostics: widths.diagnostics,
          message: 'This segment endpoint fails its own dimensional constraints.' });
      }
      if (startSection && endSection) diagnostics.push(...transitionProblems(startSection, endSection)
        .map(problem => ({ ...problem, segmentId, role })));
    }
  }
  if (previousEnd < extent) gaps.push({ startMeters: previousEnd, endMeters: extent });
  // Invalid ranges do not define meaningful gap geometry.
  const rangesInvalid = diagnostics.some(d => ['invalid-extent', 'invalid-range', 'overlap-or-order'].includes(d.code));
  return { status: diagnostics.length ? 'invalid' : 'valid',
    gaps: rangesInvalid ? [] : gaps, diagnostics };
}

/** Evaluated meters keep endpoint evidence separate; interpolation invents no provenance. */
export type RoadwayStationBand = Omit<RoadwayBand, 'width'> & {
  endBandId: string;
  widthMeters: number;
};
export type RoadwayStationResult =
  | { status: 'invalid'; diagnostics: RoadwaySegmentDiagnostic[] }
  | { status: 'outside'; stationMeters: number }
  | { status: 'unspecified'; stationMeters: number; gap: RoadwayGap }
  | { status: 'specified'; stationMeters: number; segmentId: string; segmentName: string;
      role: RoadwayCrossSection['role']; progress: number; transition: boolean;
      /** Callers must show a boundary/label here, including at abrupt layout changes. */
      atSegmentStart: boolean;
      startLayoutId: string | null; endLayoutId: string | null;
      startSection: RoadwayCrossSection; endSection: RoadwayCrossSection;
      curbToCurbMeters: number; envelopeMeters: number | null;
      bands: RoadwayStationBand[] };

/**
 * Evaluate an absolute station without history or extrapolation. Ranges own
 * [start, end); a segment ending exactly at stationExtentMeters also owns that
 * terminal point. No station tolerance, adjacent copying, or width rescaling
 * applies. Invalid roadways return diagnostics before any station is rendered.
 */
export function evaluateRoadwayStation(
  road: Roadway, stationMeters: number, role: RoadwayCrossSection['role'],
): RoadwayStationResult {
  const validation = validateRoadwaySegments(road);
  if (validation.status === 'invalid') return { status: 'invalid', diagnostics: validation.diagnostics };
  if (!Number.isFinite(stationMeters) || stationMeters < 0 || stationMeters > road.stationExtentMeters) {
    return { status: 'outside', stationMeters };
  }
  const segment = road.segments.find(s => stationMeters >= s.startMeters &&
    (stationMeters < s.endMeters ||
      (stationMeters === road.stationExtentMeters && s.endMeters === road.stationExtentMeters)));
  if (!segment) return { status: 'unspecified', stationMeters,
    gap: validation.gaps.find(g => stationMeters >= g.startMeters && stationMeters <= g.endMeters)! };
  const start = resolveSection(road, segment[role])!;
  const endLayoutId = segment.transition?.[`${role}LayoutId`] ?? null;
  const end = endLayoutId === null ? start : resolveSection(road, { layoutId: endLayoutId })!;
  const progress = segment.transition ?
    (stationMeters - segment.startMeters) / (segment.endMeters - segment.startMeters) : 0;
  const interpolate = (a: number, b: number) => progress === 0 ? a : progress === 1 ? b :
    (1 - progress) * a + progress * b;
  const meters = (dimension: RoadwayDimension) => dimension.status === 'unknown' ? null : dimension.meters;
  return structuredClone({ status: 'specified', stationMeters,
    segmentId: segment.id, segmentName: segment.name, role, progress,
    transition: segment.transition !== undefined, atSegmentStart: stationMeters === segment.startMeters,
    startLayoutId: 'layoutId' in segment[role] ? segment[role].layoutId : null,
    endLayoutId, startSection: start, endSection: end,
    curbToCurbMeters: meters(start.curbToCurb)!, envelopeMeters: meters(start.envelope.width),
    bands: start.bands.map((band, i) => ({
      ...bandWithoutWidth(band), endBandId: end.bands[i].id,
      locked: band.locked || end.bands[i].locked,
      widthMeters: interpolate(meters(band.width)!, meters(end.bands[i].width)!),
    })),
  });
}

function bandWithoutWidth(band: RoadwayBand): Omit<RoadwayBand, 'width'> {
  return { id: band.id, kind: band.kind, direction: band.direction,
    location: band.location, locked: band.locked,
    ...(band.label === undefined ? {} : { label: band.label }) };
}

