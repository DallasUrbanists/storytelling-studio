# Day 2 issue bodies

An implementer can publish these work items after publication approval and start
them after the later explicit implementation kickoff. IDs are local planning
identifiers, not existing GitHub issue numbers; the
[backlog procedure](issue-backlog.md) and [Day 2 runbook](day-2-geographic-storytelling.md)
define publication, sequencing, evidence, and completion.

- [D2-00: Stage the external GIS tool and dated pedestrian graph](#d2-00-stage-the-external-gis-tool-and-dated-pedestrian-graph)
- [D2-01: Extend scenes to an ordered list of focus steps](#d2-01-extend-scenes-to-an-ordered-list-of-focus-steps)
- [D2-02: Add, duplicate, reorder, and delete focus steps](#d2-02-add-duplicate-reorder-and-delete-focus-steps)
- [D2-03: Fit camera extents independently for both output variants](#d2-03-fit-camera-extents-independently-for-both-output-variants)
- [D2-04: Prepare verified Dallas, Oak Lawn, Maple, and landmark sources](#d2-04-prepare-verified-dallas-oak-lawn-maple-and-landmark-sources)
- [D2-05: Normalize one verified transit dataset into project layers](#d2-05-normalize-one-verified-transit-dataset-into-project-layers)
- [D2-06: Expose transit layer groups and source details](#d2-06-expose-transit-layer-groups-and-source-details)
- [D2-07: Import and label verified GoLink service polygons](#d2-07-import-and-label-verified-golink-service-polygons)
- [D2-08: Persist layer visibility and Keep visible intervals across scenes](#d2-08-persist-layer-visibility-and-keep-visible-intervals-across-scenes)
- [D2-09: Trace verified routes with geometry-aware progress](#d2-09-trace-verified-routes-with-geometry-aware-progress)
- [D2-10: Acquire one reproducible 600-second pedestrian-network walkshed](#d2-10-acquire-one-reproducible-600-second-pedestrian-network-walkshed)
- [D2-11: Validate and import network walkshed packages](#d2-11-validate-and-import-network-walkshed-packages)
- [D2-12: Review the real walkshed's corridor access and barriers](#d2-12-review-the-real-walksheds-corridor-access-and-barriers)
- [D2-13: Add the walkshed overlay to saved story scenes](#d2-13-add-the-walkshed-overlay-to-saved-story-scenes)
- [D2-14: Write portable project archives with a complete asset manifest](#d2-14-write-portable-project-archives-with-a-complete-asset-manifest)
- [D2-15: Validate archive safety before extraction](#d2-15-validate-archive-safety-before-extraction)
- [D2-16: Import validated archives atomically with asset hash checks](#d2-16-import-validated-archives-atomically-with-asset-hash-checks)
- [D2-17: Prove portable round trip in a clean data directory](#d2-17-prove-portable-round-trip-in-a-clean-data-directory)
- [D2-18: Assemble the sourced Dallas-to-Maple geographic sequence](#d2-18-assemble-the-sourced-dallas-to-maple-geographic-sequence)
- [D2-19: Record the geographic and portable-project gate](#d2-19-record-the-geographic-and-portable-project-gate)

## D2-00: Stage the external GIS tool and dated pedestrian graph

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** P03; explicit implementation kickoff.

**Why this model:** Known external-source preparation can run in the Day 1 research lane before the network analysis.

**Expected files:** `.local/storytelling-studio/pilot/walkshed/toolchain.json`, `.local/storytelling-studio/pilot/walkshed/source-manifest.json`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Follow maple-production.md's external network-walkshed recipe to stage the selected QGIS/QNEAT version and dated OSM source extract, recording licenses, versions, download size, and checksums.
2. Verify the actual tool's time/speed units using the documented synthetic reachability case before processing Maple.
3. Prepare a bounded Dallas/corridor network extract retaining pedestrian-access tags, barriers, crossings, and topology; record any long download wait separately.

**Acceptance:** D2-10 receives a verified runnable external tool and a dated usable graph, or a named unmet prerequisite and revised forecast. This task does not create an in-app routing engine.

**Tests:** Run the synthetic unit check and inspect graph coverage, topology, pedestrian filtering, and source metadata. Commands require their introducing issues to be verified.

**Documentation update:** Record exact acquired artifacts and external procedure in the Maple evidence ledger.

**Stop condition:** Stop on unavailable tools, unsupported units, missing pedestrian tags, unverified reuse, or downloads that prevent the timebox; preserve the blocker rather than assuming readiness. Reassess and split remaining scope at 60 minutes.

## D2-01: Extend scenes to an ordered list of focus steps

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D1-09.

**Why this model:** Focus sequencing changes the shared frame contract.

**Expected files:** `packages/project-schema/src/focus.ts`, `packages/story-core/src/focus.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add stable step IDs, explicit frame intervals, extents, transitions, and per-variant overrides.
2. Evaluate zero, one, and many steps without a hard-coded Dallas/Oak Lawn/Maple count.
3. Define invalid interval and missing-reference errors before UI work.

**Acceptance:** A sequence with more than three steps evaluates consistently at every boundary, including direct reverse seeks.

**Tests:** Run test:core cases for empty, repeated, reordered, overlapping, and out-of-range steps. Commands require their introducing issues to be verified.

**Documentation update:** Update project-format and rendering-contract focus semantics.

**Stop condition:** Stop if focus evaluation depends on the previous camera state or introduces undocumented modes. Reassess and split remaining scope at 60 minutes.

## D2-02: Add, duplicate, reorder, and delete focus steps

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D2-01, D1-10.

**Why this model:** The ordered-step contract is fixed; this is bounded editor work.

**Expected files:** `apps/studio/src/components/FocusSteps.vue`, `apps/studio/src/stores/project-store.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add keyboard-accessible step controls with stable IDs and visible duration.
2. Preserve selected scene and variant settings when reordering.
3. Validate deletion references and provide an undoable local edit.

**Acceptance:** A user can author five or more focus steps, reorder them, and serialize the result without hidden three-step assumptions.

**Tests:** Walk through keyboard reorder, duplicate, delete, undo, and invalid duration. Commands require their introducing issues to be verified.

**Documentation update:** Update the geographic-story authoring guide with actual controls.

**Stop condition:** Stop if reordering breaks asset references or requires a new general timeline system. Reassess and split remaining scope at 60 minutes.

## D2-03: Fit camera extents independently for both output variants

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D2-01.

**Why this model:** Map projection and aspect-aware camera fitting need geometric validation.

**Expected files:** `packages/story-core/src/camera.ts`, `tests/core/camera-fit.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Fit verified geographic bounds to each variant's safe area using the rendering contract.
2. Support per-step explicit overrides without changing shared source geometry.
3. Define degenerate geometry and unsupported bounds behavior.

**Acceptance:** The same focus retains intended geometry in portrait and landscape without cropping required landmarks or changing source coordinates.

**Tests:** Check point/line/polygon bounds, narrow extents, safe-area padding, and repeatable projection results. Commands require their introducing issues to be verified.

**Documentation update:** Document automatic fit and manual override behavior.

**Stop condition:** Stop for unsupported projection bounds or camera assumptions that invalidate the bridge tolerances. Reassess and split remaining scope at 60 minutes.

## D2-04: Prepare verified Dallas, Oak Lawn, Maple, and landmark sources

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-03.

**Why this model:** Bounded source preparation follows the research plan but requires careful provenance.

**Expected files:** `.local/storytelling-studio/pilot/source-manifest.json`, `.local/storytelling-studio/pilot/geography/`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Acquire source geometry for Dallas and the Maple corridor from Mockingbird Lane to Oak Lawn Avenue with date, URL, rights, and geometry role.
2. Prepare verified Downtown, Love Field, and Parkland locations; record editorial Oak Lawn bounds explicitly.
3. Inspect the coordinates against source context and retain source hashes and unresolved questions.

**Acceptance:** Every included feature has a source record and an appropriate point/area interpretation; no editorial neighborhood extent is presented as an official boundary.

**Tests:** Validate GeoJSON and manually inspect corridor endpoints and landmark placements against the cited sources. Commands require their introducing issues to be verified.

**Documentation update:** Update the Maple evidence ledger and source manifest.

**Stop condition:** Stop each unsupported feature at unavailable; do not invent geometry or infer a legal boundary from a map label. Reassess and split remaining scope at 60 minutes.

## D2-05: Normalize one verified transit dataset into project layers

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-11, D2-04.

**Why this model:** Transit IDs, geometry joins, service dates, and layer semantics are geospatial integration.

**Expected files:** `apps/local-service/src/imports/transit.ts`, `tests/core/transit.test.ts`, `tests/fixtures/transit/`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement the documented bounded DART/GTFS or supplied GeoJSON adapter for routes, stops, and stations.
2. Retain source IDs, mode, geometry role, service/effective dates, and attribution.
3. Reject malformed joins and distinguish service geometry from a claim about frequency or current operation.

**Acceptance:** One verified source snapshot creates separate usable rail, bus-route, stop, and station layers within its actual coverage.

**Tests:** Check missing shapes, duplicate stop IDs, route joins, mode mapping, and source-date retention with small fixtures. Commands require their introducing issues to be verified.

**Documentation update:** Record the selected adapter, supported inputs, and known service limitations.

**Stop condition:** Stop on unavailable or unclear reuse rights, unknown date, or an unsupported feed structure; split additional adapters. Reassess and split remaining scope at 60 minutes.

## D2-06: Expose transit layer groups and source details

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D2-05.

**Why this model:** The normalized layer data is ready for bounded controls.

**Expected files:** `apps/studio/src/components/TransitLayers.vue`, `apps/studio/src/components/SourceDetails.vue`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add independently selectable station, stop, rail-route, and bus-route groups.
2. Show source/effective date, mode, and attribution details.
3. Provide explicit loading, unsupported, and unavailable states.

**Acceptance:** Users can inspect the source and control each supported transit group without conflating routes with verified service frequency.

**Tests:** Walk through empty feed, missing group, source details, and keyboard visibility controls. Commands require their introducing issues to be verified.

**Documentation update:** Update the transit-layer guide with actual interface names and limitations.

**Stop condition:** Stop if the UI would conceal unavailable source groups or imply unverified service. Reassess and split remaining scope at 60 minutes.

## D2-07: Import and label verified GoLink service polygons

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D2-05.

**Why this model:** The importer reuses an established geometry/provenance contract; Sol reviews the actual geospatial result.

**Expected files:** `apps/local-service/src/imports/golink.ts`, `packages/project-schema/src/layers.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Accept a verified GoLink polygon snapshot with provider, effective date, zone name, and reuse record.
2. Preserve polygon topology and model its layer as a service area.
3. Expose a missing-source result without drawing inferred polygons.

**Acceptance:** The importer capability passes synthetic polygon/provenance tests; the pilot uses an actual dated applicable zone or a source-backed reviewed finding that none applies. Missing or unverified coverage remains open in D2-18/D2-19.

**Tests:** Check polygon validation, multiple zones, metadata retention, and unavailable-source behavior. Commands require their introducing issues to be verified.

**Documentation update:** Record the source and service-area meaning in the transit guide and Maple ledger.

**Stop condition:** Stop a claim of coverage or nonapplicability without source evidence; importer capability can finish with synthetic tests while the factual applicability decision stays open. Reassess and split remaining scope at 60 minutes.

## D2-08: Persist layer visibility and Keep visible intervals across scenes

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D2-06, D2-07, D1-17.

**Why this model:** This is bounded state and form wiring over existing layer contracts.

**Expected files:** `apps/studio/src/components/LayerInspector.vue`, `packages/project-schema/src/scenes.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Store scene visibility, order, opacity, style, and explicit Keep visible intervals with scene-ID anchors for each layer.
2. Apply controls through the shared evaluator, and retime persistence intervals when scenes are reordered or durations change.
3. Preserve unavailable-layer references and warn clearly when assets cannot resolve.

**Acceptance:** A saved/reopened project retains independent settings and cross-scene Keep visible intervals in both exports; importer capability dependencies do not require every real source to be available.

**Tests:** Save/reopen scenes with differing settings, reorder and retime them, and compare interval boundaries in preview/export. Commands require their introducing issues to be verified.

**Documentation update:** Update the layer guide and schema reference.

**Stop condition:** Stop if layer state exists only in memory or preview and is absent from export. Reassess and split remaining scope at 60 minutes.

## D2-09: Trace verified routes with geometry-aware progress

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D1-13, D2-05.

**Why this model:** Real route multipart geometry and progress calculations require geospatial care.

**Expected files:** `packages/story-core/src/geometry.ts`, `tests/core/transit-trace.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Extend the proved trace behavior to the selected transit/corridor geometry types.
2. Keep progress proportional to the documented geometry measure and preserve breaks.
3. Retain source geometry and timing separately.

**Acceptance:** The trace follows the selected sourced route without inventing straight connections across disconnected parts.

**Tests:** Check multipart geometry, reversed direction, zero-length parts, and first/middle/last frames in both variants. Commands require their introducing issues to be verified.

**Documentation update:** Document the supported multipart behavior and remaining trace limits.

**Stop condition:** Stop on ambiguous route order or unsupported shapes rather than drawing fabricated links. Reassess and split remaining scope at 60 minutes.

## D2-10: Acquire one reproducible 600-second pedestrian-network walkshed

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D2-00, D2-04.

**Why this model:** The pilot needs an actual network-derived result, not an assumed incoming polygon.

**Expected files:** `.local/storytelling-studio/pilot/walkshed/`, `.local/storytelling-studio/pilot/source-manifest.json`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Follow the external network-walkshed recipe in maple-production.md using the verified corridor's documented pedestrian-access origins and the staged dated pedestrian graph.
2. Obtain or generate one 600-second network result with tool/version, walking assumptions, origins, snapping, barriers, graph source, and output CRS recorded.
3. Export the polygon and method record and inspect obvious barriers and disconnected coverage before marking it ready for import.

**Acceptance:** The pilot has a traceable ten-minute network result with reproducible inputs, or the requirement is explicitly blocked with the missing prerequisite named.

**Tests:** Check source and tool availability, 600-second duration, origin coverage, metadata completeness, and one known barrier/crossing against the graph. Commands require their introducing issues to be verified.

**Documentation update:** Record the acquisition recipe actually used, artifact hash, gaps, and elapsed time in the Maple ledger.

**Stop condition:** Stop at missing graph/tool/source rights or irreproducible output; reassess at 60 minutes and leave the real pilot requirement open. Reassess and split remaining scope at 60 minutes.

## D2-11: Validate and import network walkshed packages

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-11.

**Why this model:** The importer reuses an established geometry/provenance contract; Sol reviews the actual geospatial result.

**Expected files:** `apps/local-service/src/imports/walkshed.ts`, `packages/project-schema/src/walkshed.ts`, `tests/fixtures/walkshed/`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Define the bounded polygon-plus-method input from the research contract.
2. Require 600-second duration for the ten-minute label and record origins, network, barriers, assumptions, and CRS.
3. Reject a buffer or a polygon with missing method metadata as a verified network walkshed.

**Acceptance:** Synthetic valid/invalid cases exercise the importer; a real pilot source is accepted only after D2-10 supplies its evidence.

**Tests:** Check missing origins, wrong duration, invalid geometry/CRS, missing graph provenance, and a buffer explicitly mislabeled as a walkshed. Commands require their introducing issues to be verified.

**Documentation update:** Write the exact walkshed import requirements and error recovery.

**Stop condition:** Stop if the source is a radius/buffer or the network method cannot be substantiated. Reassess and split remaining scope at 60 minutes.

## D2-12: Review the real walkshed's corridor access and barriers

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D2-10, D2-11.

**Why this model:** A valid file can still encode an implausible or unsuitable network result.

**Expected files:** `.local/storytelling-studio/pilot/walkshed/review.json`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Compare origins with documented publicly accessible Maple points and record sampling gaps.
2. Inspect disconnected paths, major crossings, and barrier behavior against the dated network and relevant source context.
3. Record method limitations and approve technical suitability or reject with a repair target.

**Acceptance:** The result is technically suitable for the declared study-area use, with limitations visible; technical validation is distinct from factual/editorial approval.

**Tests:** Reproduce at least one reachability edge and one excluded barrier case from the source graph or external tool receipt. Commands require their introducing issues to be verified.

**Documentation update:** Add the review evidence and unresolved access assumptions to the production ledger.

**Stop condition:** Stop if a major access or barrier error could materially change the study area; do not repair by drawing an unexplained polygon. Reassess and split remaining scope at 60 minutes.

## D2-13: Add the walkshed overlay to saved story scenes

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D2-08, D2-12.

**Why this model:** The validated data and rendering contract make this a bounded layer feature.

**Expected files:** `apps/studio/src/components/WalkshedInspector.vue`, `packages/map-adapter/src/layers.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Expose the validated overlay, source details, and a ten-minute network label with limitations.
2. Persist visibility/style per scene and preserve the method reference.
3. Keep the shared frame evaluation responsible for reveal timing.

**Acceptance:** The real overlay appears in preview and both exports, survives reopen, and exposes its method rather than a misleading radius claim.

**Tests:** Check saved visibility, method details, reveal timing, and both aspect variants. Commands require their introducing issues to be verified.

**Documentation update:** Add verified walkshed-layer controls and limitations to the authoring guide.

**Stop condition:** Stop if the overlay's method review is absent or stale. Reassess and split remaining scope at 60 minutes.

## D2-14: Write portable project archives with a complete asset manifest

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-16, D2-08.

**Why this model:** The archive schema is specified; this slice writes deterministic bounded content.

**Expected files:** `apps/local-service/src/packaging/export-gstory.ts`, `packages/project-schema/src/package.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Write a versioned .gstory ZIP with project, source/method records, templates, geometries, and only redistribution-cleared assets.
2. Create a content-hash manifest and replace absolute local paths with logical references.
3. Report missing or nonredistributable assets explicitly before completion.

**Acceptance:** The archive manifest accounts for every required reference; prohibited assets are not silently copied and incomplete packages are clearly identified.

**Tests:** Inspect a complete package, a missing-asset case, a prohibited-asset case, and stable logical references after moving the source directory. Commands require their introducing issues to be verified.

**Documentation update:** Document the actual package layout, rights behavior, and completeness report.

**Stop condition:** Stop complete-package status if required assets are missing or rights prohibit redistribution. Reassess and split remaining scope at 60 minutes.

## D2-15: Validate archive safety before extraction

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D2-14.

**Why this model:** Untrusted ZIP content creates a security-sensitive filesystem boundary.

**Expected files:** `apps/local-service/src/packaging/validate-archive.ts`, `tests/package/security.test.ts`, `package.json`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement entry-count, compressed/uncompressed byte, expansion-ratio, path, duplicate-entry, symlink, and schema limits before extraction.
2. Resolve every entry beneath a fresh temporary import root and reject path aliases that escape or collide.
3. Add test:package and prepare the concrete boundary for owner security review before merge.

**Acceptance:** Traversal, absolute paths, symlinks, duplicate paths, oversized/decompression-bomb cases, and unsupported schemas fail without writing outside the temporary root.

**Tests:** Run malicious archive fixtures and inspect the temporary root and outside sentinel files; record owner review scope. Commands require their introducing issues to be verified.

**Documentation update:** Document actual limits and rejection messages in project-format and security notes.

**Stop condition:** Stop merge for absent owner security approval or any unsafe archive behavior. Reassess and split remaining scope at 60 minutes.

## D2-16: Import validated archives atomically with asset hash checks

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D2-15, D1-16.

**Why this model:** Atomic project import crosses validation, storage, schema, and recovery.

**Expected files:** `apps/local-service/src/packaging/import-gstory.ts`, `apps/studio/src/components/ProjectExchange.vue`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Verify every manifest hash and logical reference before committing imported project data.
2. Create a new local project identity while preserving source revision/provenance and editable content.
3. Expose missing-asset and unsupported-version recovery without partially replacing an existing project.

**Acceptance:** A valid package becomes an editable local project; tampered, incomplete, or unsupported packages do not corrupt existing data.

**Tests:** Check valid import, changed asset, missing manifest entry, interrupted import, and ID collision. Commands require their introducing issues to be verified.

**Documentation update:** Write verified export/import instructions and unsupported-version recovery.

**Stop condition:** Stop if import commits partial data or overwrites an existing project without a deliberate reviewed action. Reassess and split remaining scope at 60 minutes.

## D2-17: Prove portable round trip in a clean data directory

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D2-13, D2-16.

**Why this model:** The behavior is specified and the work is a focused integration proof.

**Expected files:** `tests/package/`, `docs/implementation-status.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Export the saved geographic project and import it into a new data root with no original absolute paths.
2. Compare normalized editable state, assets, source records, geometry hashes, and method references.
3. Render representative frames and both variants from the imported revision.

**Acceptance:** The transferred project remains editable and visually equivalent under the same pinned environment, with explicit treatment of any allowed external references.

**Tests:** Run test:package and the round-trip fixture, then test one missing-resource failure. Commands require their introducing issues to be verified.

**Documentation update:** Record the package receipt, import revision, frame comparisons, and portability limits.

**Stop condition:** Stop portability completion if the clean environment relies on hidden cache or machine paths. Reassess and split remaining scope at 60 minutes.

## D2-18: Assemble the sourced Dallas-to-Maple geographic sequence

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 45 minutes.

**Dependencies:** D2-02, D2-03, D2-04, D2-09, D2-13.

**Why this model:** The tools and verified sources are available; this is bounded editorial assembly.

**Expected files:** `.local/storytelling-studio/pilot/maple.project.json`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Build the Dallas, editorial Oak Lawn, and Maple focus sequence with additional steps as the narrative needs.
2. Place Downtown, Love Field, and Parkland labels and select verified applicable transit/walkshed reveals; retain a reviewed source-backed record if no GoLink connection applies.
3. Tune both output variants without asserting unverified demographics or dimensions.

**Acceptance:** The saved sequence explains the corridor from Mockingbird to Oak Lawn with sourced geography and clear editorial labels.

**Tests:** Review all focus boundaries, landmark placement, transit visibility, label safe areas, and both variant frames. Commands require their introducing issues to be verified.

**Documentation update:** Update the shot ledger with actual scene IDs, sources, and unresolved narrative gaps.

**Stop condition:** Stop any scene whose geography, service source, or walkshed method is unverified. Reassess and split remaining scope at 60 minutes.

## D2-19: Record the geographic and portable-project gate

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D2-17, D2-18.

**Why this model:** The milestone joins source validity, state persistence, rendering, and exchange.

**Expected files:** `docs/implementation-status.md`, `tests/smoke/day-two.spec.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Run Gate D against the real geographic sequence and the package security fixtures.
2. Verify the saved project and imported copy retain focus, source, style, and method data.
3. Record passed mechanics separately from any blocked real-data requirement.

**Acceptance:** The Day 2 milestone requires verified applicable transit or reviewed source-backed nonapplicability, the real network walkshed, and portable exchange; an importer-only proof is partial.

**Tests:** Run check, test:core, test:package, relevant render-contract cases, and the Day 2 walkthrough. Commands require their introducing issues to be verified.

**Documentation update:** Record actual receipts, blockers, source coverage, and next eligible issues.

**Stop condition:** Stop milestone completion for missing required geography, service data, network evidence, or portability. Reassess and split remaining scope at 60 minutes.
