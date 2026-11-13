import type { RoadwayBand, RoadwayCrossSection, RoadwayDimension } from '../../../packages/project-schema/src/index.ts';

// Values and normalized meters are literal inputs; this helper does no conversion.
export const assumed = (value: number, meters = value, unit: 'm' | 'ft' = 'm'): RoadwayDimension => ({
  status: 'assumed', value, meters, unit,
  rationale: 'Synthetic illustrative dimensions; no Maple measurement or engineering approval',
});

const band = (id: string, kind: RoadwayBand['kind'], direction: RoadwayBand['direction'],
  width: RoadwayDimension, locked = false): RoadwayBand => ({
  id, kind, direction, width, locked,
  location: kind === 'sidewalk' ? 'outside-curbs' : 'between-curbs',
});

export const existing: RoadwayCrossSection = {
  role: 'existing', curbToCurb: assumed(14.4),
  envelope: { kind: 'illustrated', width: assumed(19.2) },
  bands: [
    band('walk-l', 'sidewalk', 'none', assumed(2.4), true),
    band('lane-1', 'through-lane', 'reverse', assumed(3.6), true),
    band('lane-2', 'through-lane', 'reverse', assumed(3.6)),
    band('lane-3', 'through-lane', 'forward', assumed(3.6)),
    band('lane-4', 'through-lane', 'forward', assumed(3.6)),
    band('walk-r', 'sidewalk', 'none', assumed(2.4), true),
  ],
};

export const proposed: RoadwayCrossSection = {
  role: 'proposed', proposalDescription: 'Synthetic illustrative concept; not an engineered design',
  curbToCurb: assumed(14.4), envelope: { kind: 'illustrated', width: assumed(19.2) },
  bands: [
    band('walk-l', 'sidewalk', 'none', assumed(2.4), true),
    band('bike-l', 'bike-lane', 'reverse', assumed(1.8)),
    band('buffer-l', 'buffer', 'none', assumed(0.9)),
    band('lane-l', 'through-lane', 'reverse', assumed(3)),
    band('turn', 'center-turn-lane', 'both', assumed(3), true),
    band('lane-r', 'through-lane', 'forward', assumed(3)),
    band('buffer-r', 'buffer', 'none', assumed(0.9)),
    band('bike-r', 'bike-lane', 'forward', assumed(1.8)),
    band('walk-r', 'sidewalk', 'none', assumed(2.4), true),
  ],
};

export const mixedUnits: RoadwayCrossSection = {
  role: 'proposed', proposalDescription: 'Synthetic mixed-unit concept',
  curbToCurb: assumed(48, 14.6304, 'ft'),
  envelope: { kind: 'illustrated', width: assumed(64, 19.5072, 'ft') },
  bands: [
    band('walk-l', 'sidewalk', 'none', assumed(8, 2.4384, 'ft'), true),
    band('bike-l', 'bike-lane', 'reverse', assumed(1.8288)),
    band('buffer-l', 'buffer', 'none', assumed(3, 0.9144, 'ft')),
    band('lane-l', 'through-lane', 'reverse', assumed(10, 3.048, 'ft')),
    band('turn', 'center-turn-lane', 'both', assumed(10, 3.048, 'ft'), true),
    band('lane-r', 'through-lane', 'forward', assumed(3.048)),
    band('buffer-r', 'buffer', 'none', assumed(3, 0.9144, 'ft')),
    band('bike-r', 'bike-lane', 'forward', assumed(6, 1.8288, 'ft')),
    band('walk-r', 'sidewalk', 'none', assumed(8, 2.4384, 'ft')),
  ],
};

type ExpectedBalance = {
  availableMeters: number; allocatedMeters: number; lockedMeters: number;
  editableMeters: number; residualMeters: number;
};
type ConstraintCase = {
  name: string; section: RoadwayCrossSection; status: 'feasible' | 'infeasible';
  pavement: ExpectedBalance; envelope: ExpectedBalance;
  diagnostics: { code: string; constraint: string; residualMeters: number; bandIds: string[] }[];
};

const pavementIds = ['bike-l', 'buffer-l', 'lane-l', 'turn', 'lane-r', 'buffer-r', 'bike-r'];
const envelopeIds = ['walk-l', ...pavementIds, 'walk-r'];

// Expected totals are hand-calculated constants, never solver-derived.
export const cases: ConstraintCase[] = [
  {
    name: 'four through lanes and two outside sidewalks', section: existing, status: 'feasible',
    pavement: { availableMeters: 14.4, allocatedMeters: 14.4, lockedMeters: 3.6, editableMeters: 10.8, residualMeters: 0 },
    envelope: { availableMeters: 19.2, allocatedMeters: 19.2, lockedMeters: 8.4, editableMeters: 10.8, residualMeters: 0 },
    diagnostics: [],
  },
  {
    name: 'two through lanes, center turn, bicycles, buffers and sidewalks', section: proposed, status: 'feasible',
    pavement: { availableMeters: 14.4, allocatedMeters: 14.4, lockedMeters: 3, editableMeters: 11.4, residualMeters: 0 },
    envelope: { availableMeters: 19.2, allocatedMeters: 19.2, lockedMeters: 7.8, editableMeters: 11.4, residualMeters: 0 },
    diagnostics: [],
  },
  {
    name: 'mixed feet and meters with independent normalized totals', section: mixedUnits, status: 'feasible',
    pavement: { availableMeters: 14.6304, allocatedMeters: 14.6304, lockedMeters: 3.048, editableMeters: 11.5824, residualMeters: 0 },
    envelope: { availableMeters: 19.5072, allocatedMeters: 19.5072, lockedMeters: 5.4864, editableMeters: 14.0208, residualMeters: 0 },
    diagnostics: [],
  },
  {
    name: 'overfull concept retains widths and signed discrepancies',
    section: { ...proposed, curbToCurb: assumed(14), envelope: { kind: 'illustrated', width: assumed(18.8) } },
    status: 'infeasible',
    pavement: { availableMeters: 14, allocatedMeters: 14.4, lockedMeters: 3, editableMeters: 11.4, residualMeters: -0.4 },
    envelope: { availableMeters: 18.8, allocatedMeters: 19.2, lockedMeters: 7.8, editableMeters: 11.4, residualMeters: -0.4 },
    diagnostics: [
      { code: 'overallocated', constraint: 'pavement', residualMeters: -0.4, bandIds: pavementIds },
      { code: 'overallocated', constraint: 'envelope', residualMeters: -0.4, bandIds: envelopeIds },
    ],
  },
  {
    name: 'unassigned space is not silently distributed',
    section: { ...proposed, curbToCurb: assumed(15.4), envelope: { kind: 'illustrated', width: assumed(20.2) } },
    status: 'infeasible',
    pavement: { availableMeters: 15.4, allocatedMeters: 14.4, lockedMeters: 3, editableMeters: 11.4, residualMeters: 1 },
    envelope: { availableMeters: 20.2, allocatedMeters: 19.2, lockedMeters: 7.8, editableMeters: 11.4, residualMeters: 1 },
    diagnostics: [
      { code: 'unassigned', constraint: 'pavement', residualMeters: 1, bandIds: pavementIds },
      { code: 'unassigned', constraint: 'envelope', residualMeters: 1, bandIds: envelopeIds },
    ],
  },
  {
    name: 'balanced pavement cannot hide an overfull outside envelope',
    section: { ...proposed, envelope: { kind: 'illustrated', width: assumed(19) } }, status: 'infeasible',
    pavement: { availableMeters: 14.4, allocatedMeters: 14.4, lockedMeters: 3, editableMeters: 11.4, residualMeters: 0 },
    envelope: { availableMeters: 19, allocatedMeters: 19.2, lockedMeters: 7.8, editableMeters: 11.4, residualMeters: -0.2 },
    diagnostics: [{ code: 'overallocated', constraint: 'envelope', residualMeters: -0.2, bandIds: envelopeIds }],
  },
  {
    name: 'locks alone exceed both available dimensions',
    section: { ...proposed, curbToCurb: assumed(2.8), envelope: { kind: 'illustrated', width: assumed(7.6) } },
    status: 'infeasible',
    pavement: { availableMeters: 2.8, allocatedMeters: 14.4, lockedMeters: 3, editableMeters: 11.4, residualMeters: -11.6 },
    envelope: { availableMeters: 7.6, allocatedMeters: 19.2, lockedMeters: 7.8, editableMeters: 11.4, residualMeters: -11.6 },
    diagnostics: [
      { code: 'locked-overallocation', constraint: 'pavement', residualMeters: -0.2, bandIds: ['turn'] },
      { code: 'overallocated', constraint: 'pavement', residualMeters: -11.6, bandIds: pavementIds },
      { code: 'locked-overallocation', constraint: 'envelope', residualMeters: -0.2, bandIds: ['walk-l', 'turn', 'walk-r'] },
      { code: 'overallocated', constraint: 'envelope', residualMeters: -11.6, bandIds: envelopeIds },
    ],
  },
];

