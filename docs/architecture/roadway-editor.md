# Dimension-aware roadway editor

Contributors can use this plan to build a top-down roadway comparison that
shows where street space goes. The Day 4 target is an editable existing and
proposed arrangement, including a four-through-lane to three-lane concept with
a center turn lane, bicycle space, buffers, and sidewalks.

**Status: planned, not implemented.** The dimensions in this document are
invented arithmetic examples, not measured Maple Avenue conditions or design
recommendations. The editor supports storytelling and concept comparison; it
does not certify engineering compliance or produce construction drawings.

- [First supported workflow](#first-supported-workflow)
- [Geographic and schematic views](#geographic-and-schematic-views)
- [Roadway data model](#roadway-data-model)
- [Widths, units, and locks](#widths-units-and-locks)
- [A four-to-three-lane example](#a-four-to-three-lane-example)
- [Varying corridor segments](#varying-corridor-segments)
- [Comparison animation](#comparison-animation)
- [Dimension evidence](#dimension-evidence)
- [Validation and failure behavior](#validation-and-failure-behavior)
- [Day 4 acceptance and later work](#day-4-acceptance-and-later-work)

## First supported workflow

The author should be able to complete the following sequence through manual
controls, using an already saved corridor feature.

1. Open **Roadway** for the selected corridor and divide it into named station
   segments where its arrangement or width changes.
2. Enter the existing curb-to-curb width, sidewalk widths, and lane arrangement,
   recording the evidence or estimate for each dimension.
3. Duplicate the arrangement as **Proposed**, change lane uses and widths, and
   inspect the remaining or overallocated space.
4. Lock dimensions that must remain fixed and adjust the unlocked elements
   without silently resizing the entire street.
5. Compare the arrangements in a scaled top-down view, then animate their
   declared lane reallocation with a caption and source references.
6. Inspect both output variants, save the project, and render the comparison
   from the same dimensional data.

The Day 4 interface can use a segment list, an ordered element list, numeric
width fields, and a live top-down canvas. Direct edge dragging is optional;
numeric controls must provide the complete supported workflow. The editor must
not depend on an automatic street-design generator.

## Geographic and schematic views

The map view must highlight the selected corridor geometry and its relevant
segment. The initial roadway detail view must display a dimensionally scaled
top-down strip: longitudinal distance follows corridor stationing, and lateral
distance follows the saved element widths. The view must identify itself as a
schematic when the corridor has been straightened.

A *station* is a distance along the selected corridor measured from its saved
start point. A segment from station 0 to station 120 spans the first 120 meters;
its left and right sides are defined while looking in the direction of
increasing station. The UI must show that direction so left-side bicycle and
travel directions remain understandable.

The schematic must preserve width proportions and its scale legend. It must
not imply surveyed placement on an aerial image or use arbitrary screen
stretching to make an overfull cross-section fit. The scene can move from the
geographic corridor to this explicitly labeled detail view without pretending
that the straightened diagram is a georeferenced construction plan.

A later map-aligned view can offset bands along a validated local centerline,
but it requires additional handling for curves, joins, sharp corners,
intersections, and self-overlap. That geometry is optional after the Day 4
baseline; an untested offset operation must not replace the dimensional model.

## Roadway data model

The `Roadway` record belongs to the shared project format. Existing and proposed
arrangements are data consumed by the same story core and drawing adapter as
the rest of the film.

| Record | Required fields and meaning |
| --- | --- |
| `Roadway` | ID, title, pinned corridor feature revision, station origin/direction, calculation units, segment order, and source references. |
| `RoadwaySegment` | ID, name, start/end stations, existing and proposed cross-sections, and any transition range. |
| `CrossSection` | Ordered left-to-right elements, curb-to-curb width, optional total envelope width, and dimensional evidence. |
| `RoadwayElement` | Stable ID, kind, direction, width, lock state, evidence status, and optional label/marking style. |
| `DimensionEvidence` | Value, original unit, normalized meters, status, source references, date/location, method, and optional uncertainty range. |
| `RoadwayScene` | Roadway ID, selected segments, comparison mode, transition frames, captions, and variant framing overrides. |
| `TransitionMapping` | An ordered list of band slots with explicit existing/proposed element references and marking transitions. |

The first element kinds must include `through-lane`, `center-turn-lane`,
`bike-lane`, `buffer`, `sidewalk`, `parking`, and `median`. A generic `other`
element requires an explicit author label; an unknown use must not be rendered
as a known facility type. Parking and median elements can use the same width
model without requiring their own simulation.

The `direction` value must be `forward`, `reverse`, `both`, or `none` relative
to station direction. A center turn lane must use `both` and its own marking
pattern, so it is not mistaken for a third through lane. A sidewalk or buffer
has no implied motor-vehicle travel direction.

Each side's sidewalk belongs outside the curb-to-curb sum. The optional total
envelope width must include every represented outside-curb element, with clear
limits describing whether the value is measured public right-of-way, an
illustrated envelope, or unknown. An envelope value must not be labeled legal
right-of-way without an appropriate source.

## Widths, units, and locks

The model must store calculation widths in meters and retain the author's
original value and unit. The interface must support meters and feet, using the
exact conversion `1 ft = 0.3048 m`; changing display units must not change the
saved physical width. Display rounding must remain separate from calculation
precision.

The cross-section validator must calculate the following quantities.

```text
allocated_pavement = sum(width of all elements between the curbs)
remaining_pavement = available_curb_to_curb - allocated_pavement
illustrated_envelope = allocated_pavement + outside_curb_elements
```

The initial equality tolerance is 0.01 meters, recorded as a numerical
validation tolerance rather than a measurement accuracy claim. A cross-section
within that tolerance can be considered numerically balanced; uncertainty in
the original measurements still remains visible.

A locked element must retain its physical width through automatic balancing
or adjacent edits. The editor must reject an adjustment that violates a lock
and identify the conflicting elements. **Distribute remaining width** can be a
later explicit operation on selected unlocked elements; the initial workflow
can leave that adjustment to manual numeric input.

The editor must never silently shrink every lane to fit the available width.
An overallocated arrangement must show **Over by** and its amount; an
underallocated arrangement must show **Unassigned** space. Saving an incomplete
concept is useful, but a dimensionally balanced publication scene must not hide
the discrepancy.

Each persisted element width must be finite and positive while the element is
present. Removing an element must be an explicit edit rather than a negative
width or a hidden zero-width lane; zero-width entry/exit bands exist only in the
evaluated animation state described below. The UI must preserve rejected
numeric input long enough for correction without replacing valid saved data.

## A four-to-three-lane example

The following example demonstrates arithmetic and element semantics only.
It supplies no lane-width recommendation and must not appear in the Maple film
as measured street geometry.

The fictional existing segment has 14.4 meters between curbs and four through
lanes of 3.6 meters each. It has two 2.4-meter sidewalks outside the curbs,
making an illustrated envelope of 19.2 meters; the envelope is not asserted to
be a legal right-of-way.

The fictional proposed arrangement uses the same curb-to-curb width.

| Left-to-right element | Width | Direction relative to station |
| --- | --- | --- |
| Bicycle lane | 1.8 m | Reverse |
| Buffer | 0.9 m | None |
| Through lane | 3.0 m | Reverse |
| Center turn lane | 3.0 m | Both |
| Through lane | 3.0 m | Forward |
| Buffer | 0.9 m | None |
| Bicycle lane | 1.8 m | Forward |
| Total between curbs | 14.4 m | Not applicable |

The two sidewalks remain separate 2.4-meter outside-curb elements in this
example. A **Three motor-vehicle lanes, including a center turn lane** caption
is more precise than a caption that implies three through lanes. The author
must choose the wording supported by the actual proposed design.

The example must carry `assumed` evidence status and an **Illustrative
dimensions** label. Actual Maple widths, sidewalk extents, existing lane uses,
and proposed allocations remain source-acquisition and review tasks.

## Varying corridor segments

A corridor must support more than one cross-section. The author can create
separate segments for a constrained block, a parking section, a wider approach,
or an intersection influence area; the film must not imply that one width
represents the entire corridor when the source shows otherwise.

Segment ranges must be ordered, nonoverlapping, and within the pinned corridor's
station extent. A gap must be explicitly marked **Unspecified**, not filled by
copying an adjacent arrangement without notice. A changed corridor geometry
must mark station-dependent arrangements for review rather than retain
apparently precise but mismatched positions.

The initial transition model can interpolate widths across a named transition
range only when the ordered element kinds and directions match at both ends.
The range must have a positive length, and interpolation must preserve the
defined envelope and locks or report the incompatibility. A change in element
topology, such as a lane ending, must use an explicit segment break in the
initial model.

The animation must show a boundary or label at an abrupt segment change. The
first implementation must not generate tapers, turning paths, driveway access,
signal layouts, or intersection geometry from a width table. Those features
need separate design and evidence beyond this storytelling editor.

## Comparison animation

The initial comparison modes must be **Existing**, **Proposed**, and animated
**Reallocate**. The four-to-three template must include an explicit,
author-reviewable mapping between existing and proposed bands so lane
boundaries move and street space changes continuously within the fixed curb
envelope. A wipe or dissolve alone does not satisfy this transformation.

The transition mapping must contain ordered slots, each with an optional
existing element ID and optional proposed element ID. A slot missing an
endpoint represents a band entering from or leaving to zero width in the
evaluation result; it does not insert a zero-width element into saved
cross-section data. At least one endpoint must exist, each endpoint element
must appear exactly once, and the slot order must preserve each arrangement's
left-to-right order.

For normalized eased progress `p`, the core must evaluate each slot width as
`(1 - p) * existingWidth + p * proposedWidth`, treating an absent endpoint as
zero. It must compute band boundaries from cumulative widths measured from the
same left curb. If both endpoints have the same curb-to-curb total, this rule
preserves that envelope throughout the transition without rescaling lanes.

The first four-to-three template can use the following explicit mapping.

| Ordered slot | Existing reference | Proposed reference |
| --- | --- | --- |
| Left bicycle space | Absent | Left bicycle lane |
| Left buffer | Absent | Left buffer |
| Removed left outer through lane | Left outer through lane | Absent |
| Retained left through lane | Left inner through lane | Left through lane |
| Center turn space | Absent | Center turn lane |
| Retained right through lane | Right inner through lane | Right through lane |
| Removed right outer through lane | Right outer through lane | Absent |
| Right buffer | Absent | Right buffer |
| Right bicycle space | Absent | Right bicycle lane |

The core must fade old markings out and new markings in through saved frame
intervals, while dimension text identifies the existing/proposed endpoints or
clearly labels a transitioning value. The animation must not imply that its
intermediate bands are construction stages or a validated operating design.
Vehicles, traffic demand, and operational benefits remain outside this model.

Width locks must protect authored endpoint values from edits and automatic
balancing. An explicitly approved transition can interpolate different locked
endpoint values without changing either saved value; a requirement to retain
the same width throughout needs matching endpoint widths. The initial template
must keep the curb envelope fixed, and an unequal-envelope transition must fail
until a separately supported design explicitly handles it.

The core must evaluate all boundaries, markings, labels, and captions from the
requested frame, with exact existing and proposed endpoint states. Arbitrary
automatic inference of correspondence is outside the first implementation;
the author must review the supplied template mapping or create a valid mapping
through the supported controls. **Reveal** can remain a draft fallback when
mapping fails, but the full lane-transformation gate remains incomplete.

The portrait variant can use a tighter station range or a vertical schematic
layout; landscape can show more corridor length. Both must retain the same
underlying width values and segment identity. Width text must not change merely
because the camera or orientation changes.

## Dimension evidence

Every meaningful width must use one of the following evidence states.

| State | Required presentation |
| --- | --- |
| `documented` | Identified drawing, survey, design document, or measurement source with date, location, and units. |
| `estimated` | Disclosed measurement method and source image/map, with uncertainty or practical precision limits. |
| `assumed` | Explicit author-selected concept value, never presented as an observed condition. |
| `unknown` | No numeric assertion; the diagram identifies its missing dimensional basis. |

An aerial estimate must record the source image's acquisition date and scale or
georeferencing basis, plus the measurement method. A visible pavement edge or
paint line is not automatically a curb, property boundary, or accessible clear
width. The review must address those distinctions before calling a dimension
documented.

The **Existing** label describes the role of an arrangement, not its evidentiary
quality. An existing arrangement can still be estimated or unverified. The
**Proposed** label must identify whether the concept comes from an adopted plan,
an external proposal, or the author's illustrative alternative.

The exported scene must retain a short evidence qualifier and the required
source credit. The project package must preserve detailed dimensional evidence,
including private or nonredistributable references as metadata when their bytes
cannot be shared. Missing permission must be handled through the
[asset policy](project-format.md#asset-rights-and-missing-resources).

## Validation and failure behavior

The initial roadway validator must report each of the following conditions
with the affected segment and element IDs.

- Invalid, negative, nonfinite, or missing required widths.
- Curb-to-curb over-allocation, unassigned space, or disagreement with a stated
  total envelope.
- A width edit that changes a locked element or an impossible set of locks.
- Invalid station ordering, overlapping ranges, out-of-extent stations, or an
  unsupported transition between different element sequences.
- Conflicting direction or use, such as a center turn lane presented as a
  one-way through lane.
- Missing, duplicate, or order-reversing transition references, unequal curb
  envelopes, or evaluated widths that are negative, nonfinite, or do not sum
  to the fixed envelope.
- A changed corridor revision or an evidence claim that no longer matches its
  reviewed inputs.

The editor must permit saving an incomplete concept with visible diagnostics,
but export preflight must distinguish a draft schematic from a reviewed,
dimensionally complete scene. An author can publish an explicitly estimated
concept after review; the app must not require a survey for every illustration
or mislabel estimates as surveyed dimensions.

The rendering check must use the same roadway evaluator for preview and export.
A screenshot-only diagram, hand-scaled rectangle, or raster image with width
labels pasted on top does not satisfy this editor's dimensional requirement.

## Day 4 acceptance and later work

The Day 4 gate must demonstrate one editable corridor with at least two segments,
existing and proposed arrangements, a center turn lane, bicycle space, buffers,
and sidewalks. It must include a valid four-to-three-lane example, one rejected
over-allocation, one respected width lock, and clearly distinguished documented,
estimated, and assumed dimensional evidence.

The acceptance run must save, reopen, export, and re-import the roadway project
without losing widths, units, locks, segment ranges, transition mappings, or
evidence. Both video variants must animate the lane reallocation through the
shared evaluator and retain legible dimensions and concept qualifiers.

The transition tests must prove exact endpoints, finite nonnegative evaluated
widths, a constant curb envelope, correct marking fades, and identical results
under shuffled frame requests. A visually similar wipe cannot replace those
tests or pass as the requested four-to-three transformation.

The final Maple production gate additionally requires reviewed existing-condition
claims and an accurately identified proposal. Source-backed estimated dimensions
can satisfy the requirement when their method, practical precision, and
uncertainty are visible; exact or surveyed measurements are not mandatory.
Unsupported invented dimensions cannot establish an actual Maple condition,
and a fictional fixture proves only software behavior.

Later work can add map-aligned curved bands, explicit tapers, more general
element correspondence, intersection diagrams, design-guidance checks, and accessible
street-section templates. Those additions must preserve the distinction
between a visualization tool and a professional engineering approval process.

## Implemented roadway schema

The project parser accepts optional roadway records with ordered segments and
existing and proposed cross-sections. Stations use meters within an authored
extent. Each cross-section has ordered bands with explicit placement, locks,
and evidence. Known dimensions retain original units and normalized meters.
Unknown dimensions carry no numeric value. Documented and estimated widths
require source references and provenance.

The schema tests use synthetic roadway layouts. The width solver, editor,
rendering, and verification of real-world measurements remain future work.

