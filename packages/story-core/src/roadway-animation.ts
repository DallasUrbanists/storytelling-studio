import type { Roadway, RoadwayBand, RoadwayCrossSection, RoadwayDimension } from '../../project-schema/src/project.ts';
import type { BandMapping } from '../../project-schema/src/authoring.ts';
import { evaluateRoadwayStation, validateRoadwaySegments } from './roadway.ts';

export type RoadwayFrame = { title: string; progress: number; qualifier: string; extent: number; segments: {
  id: string; name: string; start: number; end: number; envelope: number; curbWidth: number;
  bands: { id: string; left: number; width: number; leftEnd: number; widthEnd: number; from?: RoadwayBand['kind']; to?: RoadwayBand['kind']; direction: RoadwayBand['direction']; oldOpacity: number; newOpacity: number }[];
}[]; gaps: { startMeters: number; endMeters: number }[] };

const meters = (value: RoadwayDimension): number => {
  if (value.status === 'unknown') throw new Error('Supply a width before animating this roadway.');
  return value.meters;
};

/** Map every endpoint band exactly once and preserve each endpoint's left-to-right order. */
export function validateBandMapping(existing: RoadwayBand[], proposed: RoadwayBand[], slots: BandMapping[]): void {
  for (const [key, bands] of [['existingId', existing], ['proposedId', proposed]] as const) {
    const mapped = slots.map(slot => slot[key]).filter((id): id is string => id !== undefined);
    if (mapped.length !== bands.length || mapped.some((id, i) => id !== bands[i].id)) throw new Error('The mapping must include every band once in its saved order.');
  }
  if (new Set(slots.map(slot => slot.id)).size !== slots.length || slots.some(slot => !slot.existingId && !slot.proposedId)) throw new Error('Invalid band mapping slots.');
}

/** Evaluate all segments from absolute frame time; endpoints and curb width stay exact. */
export function evaluateRoadwayAnimation(road: Roadway, mappings: Record<string, BandMapping[]>, frame: number, start: number, end: number): RoadwayFrame {
  const validation = validateRoadwaySegments(road);
  if (validation.status !== 'valid') throw new Error(validation.diagnostics.map(d => d.message).join(' '));
  if (!(end > start)) throw new Error('The roadway transition needs a positive duration.');
  const linear = Math.max(0, Math.min(1, (frame - start) / (end - start)));
  const progress = linear * linear * (3 - 2 * linear);
  const segments = road.segments.map(segment => {
    const before = evaluateRoadwayStation(road, segment.startMeters, 'existing');
    const after = evaluateRoadwayStation(road, segment.startMeters, 'proposed');
    if (before.status !== 'specified' || after.status !== 'specified') throw new Error('This segment cannot be rendered.');
    const from = before.startSection, to = after.startSection;
    const slots = mappings[segment.id];
    if (!slots) throw new Error(`Review a band mapping for ${segment.name}.`);
    validateBandMapping(from.bands, to.bands, slots);
    if (Math.abs(meters(from.curbToCurb) - meters(to.curbToCurb)) > 1e-9 || Math.abs(meters(from.envelope.width) - meters(to.envelope.width)) > 1e-9) throw new Error('Reallocation needs the same curb and illustrated envelope at both endpoints.');
    let left = 0, leftEnd = 0;
    const bands = slots.map(slot => {
      const old = from.bands.find(band => band.id === slot.existingId), next = to.bands.find(band => band.id === slot.proposedId);
      if (old && next && old.location !== next.location) throw new Error('A mapping cannot move a band across the curb.');
      const a = old ? meters(old.width) : 0, b = next ? meters(next.width) : 0;
      const width = progress === 0 ? a : progress === 1 ? b : (1 - progress) * a + progress * b;
      const oldEnd = old ? before.endSection.bands[from.bands.indexOf(old)] : undefined;
      const nextEnd = next ? after.endSection.bands[to.bands.indexOf(next)] : undefined;
      const aEnd = oldEnd ? meters(oldEnd.width) : 0, bEnd = nextEnd ? meters(nextEnd.width) : 0;
      const widthEnd = progress === 0 ? aEnd : progress === 1 ? bEnd : (1 - progress) * aEnd + progress * bEnd;
      const band = { id: slot.id, left, width, leftEnd, widthEnd, ...(old ? { from: old.kind } : {}), ...(next ? { to: next.kind } : {}),
        direction: (progress < 0.5 ? old?.direction : next?.direction) ?? next?.direction ?? old!.direction,
        oldOpacity: 1 - progress, newOpacity: progress };
      left += width; leftEnd += widthEnd; return band;
    });
    if (Math.abs(left - meters(from.envelope.width)) > 0.01 || Math.abs(leftEnd - meters(from.envelope.width)) > 0.01) throw new Error('The mapping does not conserve the illustrated width.');
    return { id: segment.id, name: segment.name, start: segment.startMeters, end: segment.endMeters, envelope: left, curbWidth: meters(from.curbToCurb), bands };
  });
  const evidence = road.segments.flatMap(s => ['existing','proposed'].map(role => {
    const section = s[role as 'existing' | 'proposed'];
    return 'layoutId' in section ? road.layouts!.find(l => l.id === section.layoutId)!.section : section;
  })).concat((road.layouts ?? []).map(l => l.section)).flatMap(s => [s.curbToCurb, s.envelope.width, ...s.bands.map(b => b.width)]);
  const qualifier = evidence.some(d => d.status === 'assumed') ? 'Illustrative dimensions — concept only' : evidence.some(d => d.status === 'estimated') ? 'Estimated dimensions — concept only' : 'Documented dimensions — concept only';
  return { title: road.title, progress, qualifier, extent: road.stationExtentMeters, segments, gaps: validation.gaps };
}

/** Editable illustrative presets carry no claim about an actual street. */
export function roadwayPreset(corridorFeatureRevisionId: string, id: string): { roadway: Roadway; mappings: Record<string, BandMapping[]> } {
  const dim = (value: number): RoadwayDimension => ({ status: 'assumed', value, unit: 'm', meters: value, rationale: 'Illustrative concept preset; replace with sourced dimensions.' });
  const band = (id: string, kind: RoadwayBand['kind'], width: number, direction: RoadwayBand['direction'], outside = false): RoadwayBand => ({ id, kind, width: dim(width), direction, location: outside ? 'outside-curbs' : 'between-curbs', locked: false });
  const existing: RoadwayCrossSection = { role: 'existing', curbToCurb: dim(16), envelope: { kind: 'illustrated', width: dim(20) }, bands: [
    band('side-left', 'sidewalk', 2, 'none', true), band('outer-left', 'through-lane', 4, 'reverse'), band('inner-left', 'through-lane', 4, 'reverse'),
    band('inner-right', 'through-lane', 4, 'forward'), band('outer-right', 'through-lane', 4, 'forward'), band('side-right', 'sidewalk', 2, 'none', true),
  ] };
  const proposed: RoadwayCrossSection = { role: 'proposed', proposalDescription: 'Illustrative four-to-three concept; not an engineering or adopted design.', curbToCurb: dim(16), envelope: { kind: 'illustrated', width: dim(20) }, bands: [
    band('side-left', 'sidewalk', 2, 'none', true), band('bike-left', 'bike-lane', 2, 'reverse'), band('buffer-left', 'buffer', 1, 'none'),
    band('through-left', 'through-lane', 3, 'reverse'), band('center', 'center-turn-lane', 4, 'both'), band('through-right', 'through-lane', 3, 'forward'),
    band('buffer-right', 'buffer', 1, 'none'), band('bike-right', 'bike-lane', 2, 'forward'), band('side-right', 'sidewalk', 2, 'none', true),
  ] };
  // The preset has explicit correspondence, including entering and leaving bands.
  const pairs = [['side-left','side-left'],[undefined,'bike-left'],[undefined,'buffer-left'],['outer-left',undefined],['inner-left','through-left'],[undefined,'center'],['inner-right','through-right'],['outer-right',undefined],[undefined,'buffer-right'],[undefined,'bike-right'],['side-right','side-right']];
  const mapping = pairs.map(([existingId, proposedId], i) => ({ id: `slot-${i}`, ...(existingId ? { existingId } : {}), ...(proposedId ? { proposedId } : {}) }));
  return { roadway: { id, title: 'Roadway concept', corridorFeatureRevisionId, stationOrigin: 'Start of selected corridor', stationDirection: 'Along source line', stationExtentMeters: 100, sourceIds: [], segments: [
    { id: 'segment-1', name: 'Illustrative segment', startMeters: 0, endMeters: 100, existing, proposed },
  ] }, mappings: { 'segment-1': mapping } };
}
