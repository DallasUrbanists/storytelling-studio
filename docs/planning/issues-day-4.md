# Day 4 issue bodies

An implementer can start independent synthetic roadway work as soon as its listed
Day 1 dependencies are verified; the final film still requires the geographic
and research gates. The [backlog procedure](issue-backlog.md) governs publication
and kickoff, and the [Day 4 runbook](day-4-roadway-production.md) defines delivery.

- [D4-01: Define roadway bands, dimensions, and provenance fields](#d4-01-define-roadway-bands-dimensions-and-provenance-fields)
- [D4-02: Implement a width solver that preserves locked dimensions](#d4-02-implement-a-width-solver-that-preserves-locked-dimensions)
- [D4-03: Add meaningful roadway constraint tests](#d4-03-add-meaningful-roadway-constraint-tests)
- [D4-04: Render top-down roadway bands and readable dimensions](#d4-04-render-top-down-roadway-bands-and-readable-dimensions)
- [D4-05: Add editable four-lane and three-lane concept presets](#d4-05-add-editable-four-lane-and-three-lane-concept-presets)
- [D4-06: Edit band widths, order, types, and locks](#d4-06-edit-band-widths-order-types-and-locks)
- [D4-07: Represent longitudinal segments with varying roadway layouts](#d4-07-represent-longitudinal-segments-with-varying-roadway-layouts)
- [D4-08: Edit and inspect roadway segment ranges](#d4-08-edit-and-inspect-roadway-segment-ranges)
- [D4-09: Render variable segments in a continuous top-down roadway view](#d4-09-render-variable-segments-in-a-continuous-top-down-roadway-view)
- [D4-10: Animate a mapped four-to-three-lane reallocation by frame](#d4-10-animate-a-mapped-four-to-three-lane-reallocation-by-frame)
- [D4-11: Edit roadway transformation timing and annotations](#d4-11-edit-roadway-transformation-timing-and-annotations)
- [D4-12: Attach source evidence and uncertainty to each roadway dimension](#d4-12-attach-source-evidence-and-uncertainty-to-each-roadway-dimension)
- [D4-13: Verify the Maple segment dimensions or record bounded estimates](#d4-13-verify-the-maple-segment-dimensions-or-record-bounded-estimates)
- [D4-14: Persist roadway edits in projects and portable archives](#d4-14-persist-roadway-edits-in-projects-and-portable-archives)
- [D4-15: Integrate roadway scenes into the shared renderer](#d4-15-integrate-roadway-scenes-into-the-shared-renderer)
- [D4-16: Author the reviewed Maple roadway transformation](#d4-16-author-the-reviewed-maple-roadway-transformation)
- [D4-17: Assemble the full geographic, research, and roadway story](#d4-17-assemble-the-full-geographic-research-and-roadway-story)
- [D4-18: Add captions, source credits, and final variant-specific framing](#d4-18-add-captions-source-credits-and-final-variant-specific-framing)
- [D4-19: Obtain final factual, dimension, and rights review of the pinned revision](#d4-19-obtain-final-factual-dimension-and-rights-review-of-the-pinned-revision)
- [D4-20: Render and decode both final video variants](#d4-20-render-and-decode-both-final-video-variants)
- [D4-21: Review full playback and reopen the final portable project](#d4-21-review-full-playback-and-reopen-the-final-portable-project)
- [D4-22: Close the sprint with accurate guides and delivery evidence](#d4-22-close-the-sprint-with-accurate-guides-and-delivery-evidence)

## D4-01: Define roadway bands, dimensions, and provenance fields

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-03.

**Why this model:** The approved roadway contract needs a bounded typed schema.

**Expected files:** `packages/project-schema/src/project.ts`, `packages/project-schema/src/validation.ts`, `tests/roadway/schema.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add top-down roadway bands, stable IDs, width units, envelope, segment limits, locks, and supported band types.
2. Represent existing, proposed, documented, estimated, and unknown dimensions without implicit values.
3. Validate referenced sources and prohibit negative/nonfinite widths or invalid segment ranges.

**Acceptance:** The schema can represent four existing traffic lanes and a proposed two-through-lane plus center-turn layout with bicycle space, buffers, and sidewalks, without claiming any Maple measurement.

**Tests:** Validate minimal existing/proposed fixtures, invalid widths, missing provenance, and disallowed overlaps. Commands require their introducing issues to be verified.

**Documentation update:** Update project-format and roadway-editor schema coverage.

**Stop condition:** Stop if a field forces invented widths or conflates existing measurements with proposed design choices. Reassess and split remaining scope at 60 minutes.

## D4-02: Implement a width solver that preserves locked dimensions

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-01, D1-04.

**Why this model:** Dimension conservation and infeasibility are the roadway editor's core constraint behavior.

**Expected files:** `packages/story-core/src/roadway.ts`, `tests/roadway/width-solver.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement the roadway-editor contract for total available width, fixed/locked bands, editable bands, and declared rounding.
2. Return explicit feasible/infeasible results and diagnostic residuals.
3. Keep locked values unchanged and reject any silent compression or negative width.

**Acceptance:** Every feasible layout conserves the envelope within documented precision; infeasible input explains the conflict without silently altering locked bands.

**Tests:** Check exact fit, spare width, overfull locked layout, zero-width policy, unit conversion, and rounding edge cases. Commands require their introducing issues to be verified.

**Documentation update:** Record actual constraint equations and error semantics.

**Stop condition:** Stop if the contract requires an unspecified optimization or engineering rule; do not substitute a guessed design standard. Reassess and split remaining scope at 60 minutes.

## D4-03: Add meaningful roadway constraint tests

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D4-02.

**Why this model:** The acceptance suite must catch dimensional failures rather than mirror implementation.

**Expected files:** `tests/roadway/constraints.test.ts`, `tests/fixtures/roadway/`, `package.json`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add test:roadway with hand-calculated synthetic fixtures for lane, center-turn, bicycle, buffer, and sidewalk combinations.
2. Test mutation sequences that lock/unlock/change widths and return to the original state.
3. Record the distinction between schematic geometry and an approved engineered design.

**Acceptance:** The suite catches conservation, lock, unit, and infeasibility errors using independently expected totals.

**Tests:** Run the suite and verify one deliberate solver fault is detected before removing it. Commands require their introducing issues to be verified.

**Documentation update:** Document the synthetic cases and required dimensional evidence.

**Stop condition:** Stop if expected values merely call the same solver or if fixtures are mislabeled as Maple measurements. Reassess and split remaining scope at 60 minutes.

## D4-04: Render top-down roadway bands and readable dimensions

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-01, D4-02.

**Why this model:** The solver output and visual contract support bounded SVG rendering.

**Expected files:** `packages/map-adapter/src/svg-overlay.ts`, `apps/studio/src/components/RoadwayPreview.vue`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Render scaled top-down bands with surface markings, direction, symbols, boundaries, and dimension labels.
2. Use solver output as the sole geometry source and display infeasibility in the editor.
3. Keep labels and scale consistent across portrait and landscape output variants.

**Acceptance:** A viewer can distinguish lanes, center turn, bicycle space, buffers, and sidewalks and inspect the declared total width.

**Tests:** Review synthetic narrow/wide layouts, label overflow, infeasible state, and both variants. Commands require their introducing issues to be verified.

**Documentation update:** Update design-system roadway visuals and accessible meaning.

**Stop condition:** Stop if visual scaling differs from dimension data or hides infeasible constraints. Reassess and split remaining scope at 60 minutes.

## D4-05: Add editable four-lane and three-lane concept presets

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D4-04.

**Why this model:** Presets reuse the schema and solver without new algorithms.

**Expected files:** `apps/studio/src/roadway/presets.ts`, `tests/fixtures/roadway/`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Create clearly synthetic/illustrative existing four-lane and proposed two-through-lane plus center-turn presets.
2. Include optional bicycle lanes, buffers, and sidewalks as editable band records.
3. Preserve units, dimension classification, and source fields when cloning.

**Acceptance:** The presets are starting structures, never asserted Maple dimensions, and all widths remain editable subject to locks and the envelope.

**Tests:** Instantiate both presets, change envelope, and verify source/estimate labels and solver outcomes. Commands require their introducing issues to be verified.

**Documentation update:** Document preset meaning and the need for real dimensional evidence.

**Stop condition:** Stop if a preset could be mistaken for measured or officially approved Maple design. Reassess and split remaining scope at 60 minutes.

## D4-06: Edit band widths, order, types, and locks

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-03, D4-04, D1-10.

**Why this model:** The constraint contract is fixed; this slice is bounded interactive editing.

**Expected files:** `apps/studio/src/components/RoadwayEditor.vue`, `apps/studio/src/components/RoadwayBandInspector.vue`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add accessible controls for band type, width, unit, order, lock, and documented/estimated/proposed classification.
2. Run every edit through the solver and show the specific infeasibility rather than committing an invalid silent adjustment.
3. Provide undoable edits and explicit envelope selection.

**Acceptance:** A user can build both layouts, keep selected dimensions locked, and resolve an overfull layout knowingly.

**Tests:** Walk through lock/unlock, drag or keyboard order, invalid entry, undo, and total-width feedback. Commands require their introducing issues to be verified.

**Documentation update:** Write the verified top-down roadway editing steps.

**Stop condition:** Stop if editing changes locked dimensions or hides which input caused a conflict. Reassess and split remaining scope at 60 minutes.

## D4-07: Represent longitudinal segments with varying roadway layouts

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-02.

**Why this model:** Spatial segment boundaries and layout validity require coherent shared geometry.

**Expected files:** `packages/story-core/src/roadway.ts`, `packages/project-schema/src/project.ts`, `tests/roadway/segments.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add ordered longitudinal segment ranges with stable layout references and per-segment envelope/dimension evidence.
2. Define gaps, overlaps, endpoint ownership, and transition-zone semantics from roadway-editor.
3. Evaluate a specified station along the road without assuming a constant cross section.

**Acceptance:** Two adjacent segments can have different widths and band layouts while each independently conserves its documented envelope.

**Tests:** Check boundary stations, gaps/overlaps, reversed ranges, missing layout references, and per-segment constraints. Commands require their introducing issues to be verified.

**Documentation update:** Document exact station/segment semantics and unsupported intersection geometry.

**Stop condition:** Stop if a varied section is reduced to one misleading corridor-wide width. Reassess and split remaining scope at 60 minutes.

## D4-08: Edit and inspect roadway segment ranges

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D4-06, D4-07.

**Why this model:** The segment model and solver make the UI slice bounded.

**Expected files:** `apps/studio/src/components/RoadwaySegments.vue`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add segment create/split/select controls with explicit longitudinal ranges and source details.
2. Bind width editing to the selected segment and show neighboring layout differences.
3. Validate range changes before applying them.

**Acceptance:** Users can author at least two different layouts along the corridor and inspect which dimensions apply to each.

**Tests:** Check split, invalid overlap, range boundary selection, undo, and per-segment lock retention. Commands require their introducing issues to be verified.

**Documentation update:** Update roadway instructions with segment editing and evidence labels.

**Stop condition:** Stop if changing one segment silently alters another segment's widths or provenance. Reassess and split remaining scope at 60 minutes.

## D4-09: Render variable segments in a continuous top-down roadway view

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-07, D4-04.

**Why this model:** Longitudinal geometry and transitions must match the dimension contract.

**Expected files:** `packages/story-core/src/roadway.ts`, `packages/map-adapter/src/svg-overlay.ts`, `tests/roadway/segment-render.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Convert segment layouts into the declared top-down schematic geometry with stable band identity.
2. Render documented segment boundaries and transition zones without implying unsupported engineering geometry.
3. Keep dimensional annotation tied to the inspected segment.

**Acceptance:** A varied roadway layout remains legible and dimensionally traceable; an abrupt unsupported change is labeled rather than hidden.

**Tests:** Compare two- and three-segment fixtures, different band counts, transition zones, and both aspect variants. Commands require their introducing issues to be verified.

**Documentation update:** Document supported longitudinal rendering and schematic limitations.

**Stop condition:** Stop if geometry implies a taper or intersection design not supplied by the contract or evidence. Reassess and split remaining scope at 60 minutes.

## D4-10: Animate a mapped four-to-three-lane reallocation by frame

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-09, D1-04.

**Why this model:** Deterministic transition identity and constraints cross the renderer boundary.

**Expected files:** `packages/story-core/src/roadway.ts`, `packages/story-core/src/evaluate-frame.ts`, `tests/roadway/transitions.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement the explicit four-to-three template's ordered band slots with declared before/after identities and zero-width missing endpoints, without automatic arbitrary matching.
2. Interpolate slot widths from immutable frame input, derive cumulative boundaries within the fixed curb envelope, and fade old/new markings and labels.
3. Preserve finite nonnegative widths, constant total curb width, exact endpoints, segment identity, and explicit lock semantics through every frame.

**Acceptance:** Repeated or shuffled requests produce the same visible lane reallocation with correct endpoints and conserved width; a wipe/dissolve alone is a partial fallback and cannot complete this requirement.

**Tests:** Check all 300 synthetic frames for finite nonnegative widths and conserved totals, exact endpoints, slot order, appearing/disappearing bands, labels, and reverse seeks. Commands require their introducing issues to be verified.

**Documentation update:** Record the supported mapped template, lock semantics, and the limits of arbitrary topology changes.

**Stop condition:** Stop if a morph would falsely imply a physically feasible intermediate design or breaks dimensional constraints. Reassess and split remaining scope at 60 minutes.

## D4-11: Edit roadway transformation timing and annotations

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D4-10, D4-08.

**Why this model:** The transition evaluator is ready for bounded timeline controls.

**Expected files:** `apps/studio/src/components/RoadwayTransitionInspector.vue`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Expose before/after hold durations, transition timing, supported mode, and annotation visibility.
2. Show existing/proposed/estimate labels and selected segment information.
3. Preview by direct frame seek using the shared evaluator.

**Acceptance:** A user can pace the four-to-three-lane transformation and explain bicycle, buffer, sidewalk, and center-turn changes in both variants.

**Tests:** Check boundary frames, invalid timing, keyboard controls, and labels during transition. Commands require their introducing issues to be verified.

**Documentation update:** Write the actual transformation-authoring workflow.

**Stop condition:** Stop if the inspector introduces a new animation algorithm rather than editing the existing contract. Reassess and split remaining scope at 60 minutes.

## D4-12: Attach source evidence and uncertainty to each roadway dimension

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D4-01, D3-01.

**Why this model:** Dimension provenance reuses the source schema with clear classifications.

**Expected files:** `apps/studio/src/components/DimensionEvidence.vue`, `packages/project-schema/src/validation.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Record source, date, measurement method, precision, reviewer, and documented/estimated/proposed status per dimension or justified shared measurement.
2. Carry evidence into saved layouts, captions, and package manifests.
3. Mark unknown widths as unresolved and require deliberate estimates with visible labels.

**Acceptance:** Every dimension used in a factual roadway scene is traceable, and an estimate cannot display as a surveyed fact.

**Tests:** Check missing source, estimate labeling, changed measurement, and package round-trip fields. Commands require their introducing issues to be verified.

**Documentation update:** Document dimension evidence entry and review rules.

**Stop condition:** Stop factual export for unlabeled unknown or unreviewed dimensions. Reassess and split remaining scope at 60 minutes.

## D4-13: Verify the Maple segment dimensions or record bounded estimates

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-12, D2-04.

**Why this model:** Interpreting real roadway evidence requires careful scope and measurement judgment.

**Expected files:** `.local/storytelling-studio/pilot/roadway/dimensions.json`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Inspect the documented measurement/design sources for the Mockingbird-to-Oak-Lawn corridor and identify varying segment layouts.
2. Record measured/documented dimensions with source precision, or explicit estimates with their method and uncertainty.
3. Prepare the actual existing/proposed factual and conceptual labels for the pilot owner's review.

**Acceptance:** The pilot has a defensible per-segment dimension record or a named unresolved measurement need; no generic preset is presented as actual Maple width.

**Tests:** Cross-check envelope sums and at least one source measurement; verify proposed values are distinct from existing evidence. Commands require their introducing issues to be verified.

**Documentation update:** Update the dimension ledger and outstanding survey/measurement requirements.

**Stop condition:** Stop unqualified factual claims where evidence is missing; do not infer engineering approval from a concept. Reassess and split remaining scope at 60 minutes.

## D4-14: Persist roadway edits in projects and portable archives

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D4-11, D4-12, D1-17.

**Why this model:** The schema is fixed and this slice integrates existing persistence.

**Expected files:** `apps/studio/src/stores/project-store.ts`, `apps/local-service/src/db/project-repository.ts`, `tests/persistence/roadway.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Save all layouts, locks, segment ranges, transition timing, source references, and variant annotations.
2. Reopen the project and verify unchanged editable roadway state.
3. Include roadway references in the package manifest and validation path when exchange support is available.

**Acceptance:** The saved/reopened roadway remains editable and retains provenance; package integration requires the verified Day 2 exchange capability before its gate.

**Tests:** Round-trip through JSON and SQLite, then run package cases once D2-16 exists. Commands require their introducing issues to be verified.

**Documentation update:** Update project-format and saved-project behavior for roadway content.

**Stop condition:** Stop if serialization loses locks, segment variation, or dimension classifications. Reassess and split remaining scope at 60 minutes.

## D4-15: Integrate roadway scenes into the shared renderer

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-09, D4-14, D1-09.

**Why this model:** The new scene type must preserve existing preview/export determinism.

**Expected files:** `apps/renderer/src/StoryComposition.tsx`, `packages/map-adapter/src/svg-overlay.ts`, `tests/render-contract/roadway.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Render roadway scene frame state through the shared SVG adapter in both Vue and Remotion hosts.
2. Reuse asset/font/readiness and receipt handling from the proved bridge.
3. Add mixed map-to-roadway scene boundaries to the deterministic contract tests.

**Acceptance:** Preview and export agree for both aspect variants and direct seeks across map/roadway boundaries.

**Tests:** Run repeated/shuffled roadway frames, mixed scene boundaries, both formats, and missing-font failure. Commands require their introducing issues to be verified.

**Documentation update:** Record roadway render support and actual parity evidence.

**Stop condition:** Stop if roadway rendering forks evaluator logic or fails the established frame tolerances. Reassess and split remaining scope at 60 minutes.

## D4-16: Author the reviewed Maple roadway transformation

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-13, D4-15.

**Why this model:** The tools and evidence are available; this is bounded production authoring.

**Expected files:** `.local/storytelling-studio/pilot/maple.project.json`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Build the existing four-lane and proposed three-lane concept with center turn, bicycle space, buffers, sidewalks, and source-backed or visibly estimated widths.
2. Apply per-segment differences and locks, then tune the top-down transformation and annotations.
3. Retain a clear conceptual-design label and all outstanding evidence limitations.

**Acceptance:** The roadway sequence is editable, dimension-aware, and faithful to the reviewed evidence without implying official design approval.

**Tests:** Review every segment total, lock, label, transition boundary, and both variant safe areas. Commands require their introducing issues to be verified.

**Documentation update:** Update the shot and dimension ledgers with actual scene IDs and review references.

**Stop condition:** Stop any unqualified roadway fact that lacks reviewed dimensional evidence. Reassess and split remaining scope at 60 minutes.

## D4-17: Assemble the full geographic, research, and roadway story

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D2-18, D3-18, D4-16.

**Why this model:** The scene capabilities are established and this slice integrates the editorial sequence.

**Expected files:** `.local/storytelling-studio/pilot/maple.project.json`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Follow the Maple production shot order from Dallas orientation through corridor evidence and the roadway proposal.
2. Set scene durations and transitions while preserving source/result references.
3. Keep required population, geography, network walkshed, roadway reallocation, and output requirements separate from documented conditional history/imagery omissions and optional income.

**Acceptance:** One saved revision contains the required integrated sequence; conditional history/imagery can be omitted with documented source reasons, and income is not a first-film prerequisite.

**Tests:** Watch the entire preview in both variants and inspect scene boundaries, narrative continuity, and source references. Commands require their introducing issues to be verified.

**Documentation update:** Record the actual sequence, duration, and remaining content gaps.

**Stop condition:** Stop full-story completion if required scenes or evidence are missing. Reassess and split remaining scope at 60 minutes.

## D4-18: Add captions, source credits, and final variant-specific framing

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D4-17.

**Why this model:** This is bounded presentation cleanup using approved content and shared text tools.

**Expected files:** `.local/storytelling-studio/pilot/maple.project.json`, `.local/storytelling-studio/pilot/captions/`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add readable captions or equivalent on-screen narration for essential spoken content and verified source/imagery credits.
2. Check line breaks, safe areas, chart/map/roadway labels, and pacing independently for each output variant.
3. Ensure estimates, editorial bounds, source periods, and concept labels remain readable.

**Acceptance:** The film's essential meaning is available without sound and both formats retain required credits and qualifications.

**Tests:** Review full caption/narration sequence, audio sync if audio exists, and text clipping in both variants. Commands require their introducing issues to be verified.

**Documentation update:** Update the caption transcript and attribution ledger.

**Stop condition:** Stop if required credits or qualifications cannot be read at the intended output size. Reassess and split remaining scope at 60 minutes.

## D4-19: Obtain final factual, dimension, and rights review of the pinned revision

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D4-18, D3-19.

**Why this model:** The final evidence audit crosses research, geography, dimensions, and asset rights.

**Expected files:** `.local/storytelling-studio/pilot/review/final-review.json`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Prepare the exact revision, scene/source map, research snapshots, dimension ledger, imagery rights, and remaining gaps for the designated human reviewer.
2. Check approvals match the pinned included content, all required scenes are present, and conditional omissions have documented reasons.
3. Record the reviewer's decision and required corrections without attributing the agent's audit to a human.

**Acceptance:** The reviewer explicitly approves the factual and rights scope of the exact full-film revision; a partial cut is approved only as partial.

**Tests:** Verify every scene's source/approval hashes and export permissions against the final revision. Commands require their introducing issues to be verified.

**Documentation update:** Record named reviewer, date, scope, decision, and unresolved conditions.

**Stop condition:** Stop full-film export approval for missing reviewer action, stale evidence, uncleared assets, or unmet required content. Reassess and split remaining scope at 60 minutes.

## D4-20: Render and decode both final video variants

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-19, D2-17.

**Why this model:** The final render joins all scene types, resources, and approved revision handling.

**Expected files:** `out/verification/`, `.local/storytelling-studio/pilot/review/export-receipts.json`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Submit both required formats at 30 frames per second from the approved immutable revision.
2. Wait for explicit successful jobs, preserve render/resource receipts, and decode the completed videos.
3. Check actual dimensions, duration/frame count, missing-resource status, and representative frames across every scene type.

**Acceptance:** Both decoded outputs match the approved revision and expected complete timeline; encoding wait beyond the target is recorded separately.

**Tests:** Inspect metadata, decode all frames, and compare sampled scene boundaries with approved preview inputs. Commands require their introducing issues to be verified.

**Documentation update:** Record output hashes, exact environment, elapsed render time, and validation results.

**Stop condition:** Stop if any frame/resource fails, either format is missing, or a result targets a different revision. Reassess and split remaining scope at 60 minutes.

## D4-21: Review full playback and reopen the final portable project

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D4-20.

**Why this model:** This is a concrete final acceptance walkthrough across finished artifacts.

**Expected files:** `.local/storytelling-studio/pilot/review/playback.md`, `out/verification/`, `docs/implementation-status.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Watch both complete videos and record timing, clipping, visual artifacts, captions, labels, and factual presentation findings.
2. Export the final .gstory package and reopen it in a clean data root to confirm all required editable content and permitted assets.
3. Fix only bounded findings through linked repair issues and repeat affected checks.

**Acceptance:** Both videos pass full playback and the portable project reopens with editable focus, layers, required population references, and roadway dimensions; conditional omissions are documented accurately.

**Tests:** Run the final Gate F walkthrough and package validation with retained receipts. Commands require their introducing issues to be verified.

**Documentation update:** Record reviewer findings, package hash, reopened revision, and accepted artifact locations.

**Stop condition:** Stop final acceptance for unresolved playback, portability, rights, or factual findings. Reassess and split remaining scope at 60 minutes.

## D4-22: Close the sprint with accurate guides and delivery evidence

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D4-21.

**Why this model:** This is bounded documentation and issue bookkeeping after verified behavior.

**Expected files:** `docs/implementation-status.md`, `docs/README.md`, affected contributor/user guides, `docs/planning/issue-backlog.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Update implemented capability and command status from actual gate receipts.
2. Link the final editable package, both videos, source/review records, and known limitations through approved artifact locations.
3. Close only completed issues after their changes merge and retain all blocked or deferred requirements.

**Acceptance:** A new contributor can reproduce the verified workflow and the delivery record states exactly what finished, what did not, and why.

**Tests:** Run documentation checks and review all milestone claims against receipts and actual merged changes. Commands require their introducing issues to be verified.

**Documentation update:** Complete the documentation plan and accurate final milestone record.

**Stop condition:** Stop a complete-sprint claim while any required deliverable or verification remains unfinished. Reassess and split remaining scope at 60 minutes.
