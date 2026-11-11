# Day 3 issue bodies

An implementer can publish these work items after publication approval and start
them after the later explicit implementation kickoff. IDs are local planning
identifiers, not existing GitHub issue numbers; the
[backlog procedure](issue-backlog.md) and [Day 3 runbook](day-3-research-production.md)
define publication, sequencing, evidence, and completion.

- [D3-01: Extend source, method, and result provenance records](#d3-01-extend-source-method-and-result-provenance-records)
- [D3-02: Acquire and map the selected ACS population and boundary snapshot](#d3-02-acquire-and-map-the-selected-acs-population-and-boundary-snapshot)
- [D3-03: Bind research runs to the reviewed study-area snapshot](#d3-03-bind-research-runs-to-the-reviewed-study-area-snapshot)
- [D3-04: Compute bounded polygon intersections and geodesic areas](#d3-04-compute-bounded-polygon-intersections-and-geodesic-areas)
- [D3-05: Allocate one population measure across partial overlaps](#d3-05-allocate-one-population-measure-across-partial-overlaps)
- [D3-06: Aggregate allocated population with reproducible rounding and diagnostics](#d3-06-aggregate-allocated-population-with-reproducible-rounding-and-diagnostics)
- [D3-07: Run the bounded population analysis as a local job](#d3-07-run-the-bounded-population-analysis-as-a-local-job)
- [D3-08: Display research results with source and limitation details](#d3-08-display-research-results-with-source-and-limitation-details)
- [D3-09: Record explicit review and invalidate stale research approvals](#d3-09-record-explicit-review-and-invalidate-stale-research-approvals)
- [D3-10: Enforce historical comparability before calculating change](#d3-10-enforce-historical-comparability-before-calculating-change)
- [D3-11: Find one defensible historical comparator or record its absence](#d3-11-find-one-defensible-historical-comparator-or-record-its-absence)
- [D3-12: Enforce valid income measures and comparisons](#d3-12-enforce-valid-income-measures-and-comparisons)
- [D3-13: Prepare one income source snapshot for review](#d3-13-prepare-one-income-source-snapshot-for-review)
- [D3-14: Render research cards from approved snapshot references](#d3-14-render-research-cards-from-approved-snapshot-references)
- [D3-15: Review one candidate aerial image for rights and usefulness](#d3-15-review-one-candidate-aerial-image-for-rights-and-usefulness)
- [D3-16: Import one cleared georeferenced image for deterministic scenes](#d3-16-import-one-cleared-georeferenced-image-for-deterministic-scenes)
- [D3-17: Run and review the first real Maple population result](#d3-17-run-and-review-the-first-real-maple-population-result)
- [D3-18: Assemble approved population and conditional research scenes](#d3-18-assemble-approved-population-and-conditional-research-scenes)
- [D3-19: Record the research mechanism gate and real-content status](#d3-19-record-the-research-mechanism-gate-and-real-content-status)

## D3-01: Extend source, method, and result provenance records

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D1-03.

**Why this model:** The research contract is defined and needs bounded schema implementation.

**Expected files:** `packages/project-schema/src/project.ts`, `packages/project-schema/src/validation.ts`, `tests/research/provenance.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add source/vintage/universe/rights fields, method parameters, input hashes, result status, and reviewer snapshot references from research-methods.
2. Distinguish raw inputs, estimates, approved results, stale approvals, and unavailable data.
3. Validate required references without inventing default approval or source values.

**Acceptance:** A result cannot be labeled approved without a reviewer record tied to its exact inputs and method.

**Tests:** Test missing source/vintage, changed inputs, missing reviewer, and valid unresolved records. Commands require their introducing issues to be verified.

**Documentation update:** Update project-format and research-methods schema coverage.

**Stop condition:** Stop if a schema default would convert unknown or estimated data into a verified fact. Reassess and split remaining scope at 60 minutes.

## D3-02: Acquire and map the selected ACS population and boundary snapshot

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D3-01, D2-04.

**Why this model:** The Census table, geography, identifiers, and annotations need a defensible join.

**Expected files:** `apps/local-service/src/research/source-adapters.ts`, `.local/storytelling-studio/pilot/research/`, `tests/research/census-source.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Use the exact no-key ACS 2024 five-year B01003 and TIGER 2024 block-group sources documented in research-methods.
2. Map actual source headers to population estimate, margin of error, and annotations; preserve full string GEOIDs and the 2020–2024 period label.
3. Filter Dallas County using verified state/county codes and retain checksums, table metadata, download date, and unmatched-record report.

**Acceptance:** One joined source snapshot has explicit universe/vintage/annotation handling and no silently dropped or coerced GEOIDs. No API key is a required prerequisite.

**Tests:** Test leading-zero identifiers, duplicate joins, missing values, suppressed/annotated estimates, and unmatched geometry. Commands require their introducing issues to be verified.

**Documentation update:** Record the acquired source hashes, actual field mapping, and coverage in the Maple ledger.

**Stop condition:** Stop for missing/suppressed inputs, incompatible geography, unclear annotations, or an unexplained join mismatch. Reassess and split remaining scope at 60 minutes.

## D3-03: Bind research runs to the reviewed study-area snapshot

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D3-01.

**Why this model:** This is bounded provenance and selection wiring over reviewed geography.

**Expected files:** `apps/studio/src/components/ResearchStudyArea.vue`, `apps/local-service/src/routes/research.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement study-area selection with synthetic fixtures first; bind a real result only to a reviewed network walkshed or an explicitly separate declared study area.
2. Save geometry hash, method reference, project revision, and selection rationale with the research request.
3. Invalidate prior derived inputs when the area changes.

**Acceptance:** The mechanism records exact geometry and method hashes using synthetic input; D3-17 requires the actual D2-12-reviewed walkshed before any real claim.

**Tests:** Check selection change, missing/stale method record, and reopened request state. Commands require their introducing issues to be verified.

**Documentation update:** Document the actual study-area selection and why changing it affects results.

**Stop condition:** Stop for unreviewed or ambiguous study geography. Reassess and split remaining scope at 60 minutes.

## D3-04: Compute bounded polygon intersections and geodesic areas

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D3-03.

**Why this model:** Partial-overlap geometry and area calculations are central research methods.

**Expected files:** `packages/story-core/src/geometry.ts`, `tests/research/intersections.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Validate geographic GeoJSON and implement the selected Turf polygon-intersection path from research-methods.
2. Calculate geodesic source-unit and intersected areas with explicit hole and invalid-geometry behavior; reject square-degree and Web Mercator area measurements.
3. Report no/full/partial overlap and reject nonfinite or out-of-range results.

**Acceptance:** Hand-checkable synthetic cases return the documented intersections and fractions using the selected geodesic method, without introducing an unapproved projected-area alternative.

**Tests:** Cover no/full/half overlap, holes, multipart units, invalid polygons, zero area, coordinate conventions, and known geodesic reference values. Commands require their introducing issues to be verified.

**Documentation update:** Record actual geometry library/version, geodesic method, precision, and invalid-input policy in research-methods.

**Stop condition:** Stop if repair would materially alter a source boundary without recorded method approval. Reassess and split remaining scope at 60 minutes.

## D3-05: Allocate one population measure across partial overlaps

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D3-02, D3-04.

**Why this model:** Population allocation must preserve the declared estimation assumptions.

**Expected files:** `apps/local-service/src/research/population.ts`, `tests/research/population.test.ts`, `package.json`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement the selected bounded area-weighted baseline with the exact overlap fractions and exclusions from research-methods.
2. Retain each source unit, estimate, denominator, allocation fraction, missingness, and method caveat in the result.
3. Add test:research with synthetic totals that can be calculated by hand.

**Acceptance:** Partial units contribute the documented estimate, full units contribute their supported total, and missing values remain missing rather than zero. The result is labeled an estimate.

**Tests:** Check full/partial/no overlap, zero denominator, missing estimate, annotations, and overlapping source-unit detection. Commands require their introducing issues to be verified.

**Documentation update:** Document the implemented allocation formula, limitations, and uncertainty treatment.

**Stop condition:** Stop if a result would imply exact residents or if an unsupported weighting dataset is needed. Reassess and split remaining scope at 60 minutes.

## D3-06: Aggregate allocated population with reproducible rounding and diagnostics

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D3-05.

**Why this model:** Aggregation and uncertainty labels affect the defensibility of the displayed claim.

**Expected files:** `apps/local-service/src/research/population-summary.ts`, `tests/research/population-summary.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Aggregate only valid allocated units under the declared rules and preserve unrounded intermediate values.
2. Produce coverage, missingness, overlap, sensitivity/uncertainty limitations, and final display rounding.
3. Reject unsupported aggregation of percentages, medians, or dependent uncertainty measures.

**Acceptance:** The displayed population estimate is reproducible from retained contributions and cannot hide incomplete coverage.

**Tests:** Check rounding boundaries, duplicate units, missing coverage, and unsupported measure types. Commands require their introducing issues to be verified.

**Documentation update:** Record output fields, display precision, and interpretation language.

**Stop condition:** Stop if coverage or uncertainty would make the proposed claim misleading; return an explicit incomplete result. Reassess and split remaining scope at 60 minutes.

## D3-07: Run the bounded population analysis as a local job

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D3-06, D1-18.

**Why this model:** The method and existing job machinery make this bounded integration.

**Expected files:** `apps/local-service/src/routes/research.ts`, `apps/local-service/src/services/job-runner.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Launch the population pipeline with immutable source, geometry, and parameter hashes.
2. Persist pending/running/completed/failed results and method diagnostics.
3. Support cancellation without discarding source provenance or treating partial results as final.

**Acceptance:** A completed job reproduces the same result from the same hashes and a failed/canceled run cannot become an approved card.

**Tests:** Test success, missing source, cancellation, restart visibility, and changed input hashes. Commands require their introducing issues to be verified.

**Documentation update:** Document the actual local analysis lifecycle and retry behavior.

**Stop condition:** Stop if the job reads mutable editor state or silently retries against newer inputs. Reassess and split remaining scope at 60 minutes.

## D3-08: Display research results with source and limitation details

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D3-07.

**Why this model:** This is bounded presentation of an already defined result contract.

**Expected files:** `apps/studio/src/pages/ResearchPage.vue`, `apps/studio/src/components/ResearchCard.vue`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Display estimate, population universe, vintage period, study area, method, coverage, and limitations.
2. Separate draft, incomplete, failed, and approved states with text rather than color alone.
3. Expose source contributions and downloadable result metadata for review.

**Acceptance:** A viewer can identify what the number estimates and why it may be uncertain without reading implementation code.

**Tests:** Review valid, missing, incomplete, stale, and zero-value cards with keyboard and screen-reader names. Commands require their introducing issues to be verified.

**Documentation update:** Write the verified research-result inspection workflow.

**Stop condition:** Stop if the displayed claim drops its estimate, period, scope, or missingness qualification. Reassess and split remaining scope at 60 minutes.

## D3-09: Record explicit review and invalidate stale research approvals

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D3-08.

**Why this model:** Approval is a provenance boundary across inputs, methods, edits, and export.

**Expected files:** `apps/local-service/src/research/approval.ts`, `apps/studio/src/components/ResearchReview.vue`, `tests/research/approval.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Record a named human review action with date, scope, result hash, method hash, source hashes, and relevant project revision.
2. Make the exporter accept approved claims only when the snapshot still matches.
3. Invalidate approval when any relevant source, study area, method, parameter, or result changes.

**Acceptance:** A human can approve or reject a concrete research snapshot, and a changed dependency becomes stale before export. An agent's technical validation never fabricates human approval.

**Tests:** Change each hashed dependency individually and verify stale state, preserved history, and export refusal. Commands require their introducing issues to be verified.

**Documentation update:** Document who can review, what the action means, and how to re-review changed evidence.

**Stop condition:** Stop factual approval until the designated human reviewer acts on the exact snapshot. Reassess and split remaining scope at 60 minutes.

## D3-10: Enforce historical comparability before calculating change

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D3-01, D3-06.

**Why this model:** Temporal comparison requires compatible geographies, universes, methods, and uncertainty.

**Expected files:** `apps/local-service/src/research/comparability.ts`, `tests/research/comparability.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement the comparison checklist from research-methods for geography, universe, measure, allocation, period, and uncertainty.
2. Detect incompatible or overlapping-period comparisons and require the documented interpretation/rejection path.
3. Return structured reasons before a change figure can be approved.

**Acceptance:** Comparable synthetic inputs produce a permitted comparison; mismatched inputs produce a visible blocked result rather than an attractive but unsupported trend.

**Tests:** Cover changed boundaries, different universes, overlapping ACS periods, missing uncertainty, and a valid controlled comparison. Commands require their introducing issues to be verified.

**Documentation update:** Document the implemented comparability checks and limits.

**Stop condition:** Stop if a valid comparison needs a crosswalk or statistical method outside the approved bounded pipeline. Reassess and split remaining scope at 60 minutes.

## D3-11: Find one defensible historical comparator or record its absence

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D3-10.

**Why this model:** This is a bounded evidence acquisition task using a defined comparability checklist.

**Expected files:** `.local/storytelling-studio/pilot/research/history/`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Inspect the 2015–2019 ACS five-year B01003 with 2019 TIGER block-group candidate identified in research-methods; preserve metadata and require explicit geography harmonization and uncertainty evidence before comparison.
2. Run the comparability gate against the selected baseline.
3. Prepare one evidence-backed comparison for human review or retain a named blocked requirement.

**Acceptance:** Only a supported comparable result can enter the film; if this candidate fails comparability, the history scene is honestly omitted and the conditional narrative requirement is satisfied without inventing a trend.

**Tests:** Reproduce the comparability report and inspect source metadata rather than inferring compatibility from a shared table title. Commands require their introducing issues to be verified.

**Documentation update:** Update the production ledger with the candidate, decision, and missing evidence.

**Stop condition:** Stop the historical scene if no defensible comparator is found within the bounded search. Reassess and split remaining scope at 60 minutes.

## D3-12: Enforce valid income measures and comparisons

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D3-01, D3-06.

**Why this model:** Income universes, medians, inflation, and uncertainty can produce misleading derived claims.

**Expected files:** `apps/local-service/src/research/income-validation.ts`, `tests/research/income.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement the income rules in research-methods for measure type, universe, dollar year, coverage, uncertainty, and temporal comparability.
2. Reject summed or area-averaged medians and unsupported conversion of household measures into person claims.
3. Represent unavailable or insufficient evidence explicitly.

**Acceptance:** The system permits only the bounded defensible income presentation and prevents unsupported aggregate or historical claims.

**Tests:** Check median aggregation rejection, universe mismatch, dollar-year mismatch, missing uncertainty, and a valid source-level display. Commands require their introducing issues to be verified.

**Documentation update:** Document supported income outputs and the reasons an income claim can be blocked.

**Stop condition:** Stop if satisfying the claim requires a new statistical estimator or unverified inflation series. Reassess and split remaining scope at 60 minutes.

## D3-13: Prepare one income source snapshot for review

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D3-12.

**Why this model:** The pilot's income claim needs method-aware source selection.

**Expected files:** `apps/local-service/src/research/source-adapters.ts`, `.local/storytelling-studio/pilot/research/income/`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Acquire one candidate income measure with exact table, universe, estimate, margin, annotation, period, and dollar-year metadata.
2. Run the implemented income and comparability gates for the proposed presentation.
3. Prepare a reviewable result or retain an explicit unsupported-claim record.

**Acceptance:** No result is displayed as neighborhood/walkshed income unless its method supports that scope; a source-level contextual value is labeled at its actual geography. Income capability remains optional for the first Maple film.

**Tests:** Verify field mapping, denominator/universe, annotations, and validation decisions on the actual source snapshot. Commands require their introducing issues to be verified.

**Documentation update:** Record the candidate and limitations in the Maple evidence ledger.

**Stop condition:** Stop the income scene when the source or aggregation cannot support its wording. Reassess and split remaining scope at 60 minutes.

## D3-14: Render research cards from approved snapshot references

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D3-09.

**Why this model:** Rendering reuses a stable approved-result contract.

**Expected files:** `packages/story-core/src/labels.ts`, `packages/map-adapter/src/svg-overlay.ts`, `apps/studio/src/components/ResearchSceneInspector.vue`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Bind a population scene card to an approved result snapshot rather than copied manual values; unsupported metric types fail closed until their own validators are implemented.
2. Render the estimate label, period, scope, essential limitation, and source credit in both variants.
3. Show draft/stale states in the editor and block factual export when approval is missing.

**Acceptance:** A changed or stale source cannot leave an apparently approved number in the exported card.

**Tests:** Check approved/draft/stale snapshots, long caveats, variant safe areas, and frame parity. Commands require their introducing issues to be verified.

**Documentation update:** Write verified research-card authoring and approval-recovery steps.

**Stop condition:** Stop if the card hides essential qualification or duplicates a number outside its provenance reference. Reassess and split remaining scope at 60 minutes.

## D3-15: Review one candidate aerial image for rights and usefulness

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D3-01.

**Why this model:** A bounded asset review follows explicit provenance and reuse fields.

**Expected files:** `.local/storytelling-studio/pilot/imagery/rights.json`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Inspect one candidate NAIP or Sentinel-2 asset with actual coverage, acquisition date, resolution, provider, and license terms.
2. Record display, video-export, package-redistribution, attribution, and any processing obligations separately.
3. Prepare the concrete asset record for the designated reviewer and assess whether it can support the proposed shot.

**Acceptance:** The candidate has an explicit approved/denied/unresolved rights record and usefulness decision; naming a source family does not clear an asset.

**Tests:** Compare actual metadata and coverage with the proposed scene; verify the cited terms and reviewer action. Commands require their introducing issues to be verified.

**Documentation update:** Update the imagery ledger and missing-asset fallback for the pilot.

**Stop condition:** Stop inclusion for unresolved rights, attribution, export/package permission, or unsuitable coverage/resolution. Reassess and split remaining scope at 60 minutes.

## D3-16: Import one cleared georeferenced image for deterministic scenes

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D3-15, D1-05.

**Why this model:** Georeferencing and resource readiness affect the shared render pipeline.

**Expected files:** `apps/local-service/src/imports/imagery.ts`, `packages/map-adapter/src/resources.ts`, `tests/render-contract/imagery.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Import only a reviewed usable image with its georeference, acquisition metadata, attribution, and content hash.
2. Normalize the bounded supported image format and preserve its relationship to geographic coordinates.
3. Require complete resource readiness and the proper rights state for display/export/package actions.

**Acceptance:** The actual cleared image aligns with sourced geography and reproduces in both variants; an unapproved or absent image remains unavailable.

**Tests:** Check wrong CRS/bounds, missing asset, revoked rights, placement, and repeated-frame rendering. Commands require their introducing issues to be verified.

**Documentation update:** Document supported imagery input and its exact rights-dependent behavior.

**Stop condition:** Stop if alignment is ambiguous or rights state does not authorize the requested action. Reassess and split remaining scope at 60 minutes.

## D3-17: Run and review the first real Maple population result

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D3-09, D2-12.

**Why this model:** The real pilot combines geospatial calculation, data interpretation, and explicit review.

**Expected files:** `.local/storytelling-studio/pilot/research/population/`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Run the selected population pipeline against the reviewed 600-second study area and retained source snapshot.
2. Inspect contribution totals, partial units, missing coverage, method assumptions, and wording with the designated human reviewer.
3. Record approval, requested corrections, or a blocked result without depending on historical or income validators or data.

**Acceptance:** The first population claim is reproducible and explicitly approved for its actual scope, or the relevant scene remains blocked. Approval cannot be supplied by the coding agent.

**Tests:** Re-run from hashes and compare output; hand-check at least one full and one partial source-unit contribution. Commands require their introducing issues to be verified.

**Documentation update:** Record result, review, methodology, limitations, and retained reproduction artifacts.

**Stop condition:** Stop factual export while approval or material validity questions remain unresolved. Reassess and split remaining scope at 60 minutes.

## D3-18: Assemble approved population and conditional research scenes

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D3-14, D3-17, D2-18.

**Why this model:** This is bounded editorial assembly using reviewed source references.

**Expected files:** `.local/storytelling-studio/pilot/maple.project.json`, `docs/planning/maple-production.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add the approved population scene and any independently approved history, income, or imagery scenes.
2. Record omitted conditional history or imagery with its evidence-based reason; include income only if independently supported and useful, since it is not required for the first Maple film.
3. Tune essential qualifications, credits, and both output variants.

**Acceptance:** The required population claim references its approved snapshot; conditional history/imagery may be omitted with documented reasons, and income is optional for the first film.

**Tests:** Inspect every card's snapshot, first/last frames, caveats, safe areas, and source credits. Commands require their introducing issues to be verified.

**Documentation update:** Update the shot ledger, required population status, and conditional-source decisions.

**Stop condition:** Stop inclusion of any stale claim or uncleared asset. Reassess and split remaining scope at 60 minutes.

## D3-19: Record the research mechanism gate and real-content status

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D3-18.

**Why this model:** The gate must distinguish a working method from a fully evidenced film.

**Expected files:** `docs/implementation-status.md`, `tests/smoke/day-three.spec.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Run Gate E for the synthetic method cases and actual first population snapshot.
2. Report historical, income, and imagery capabilities and real-data completion separately.
3. Verify review invalidation and render blocking for changed inputs.

**Acceptance:** The required bounded population pipeline passes with reproducible evidence and explicit review; unsupported conditional history/imagery or optional income does not block the first film.

**Tests:** Run check, test:research, affected render-contract tests, and the stale-approval walkthrough. Commands require their introducing issues to be verified.

**Documentation update:** Record actual receipts, human review references, missing scenes, and eligible next work.

**Stop condition:** Stop completion for a missing required population result, stale approval, or unsupported included claim; preserve conditional omissions separately. Reassess and split remaining scope at 60 minutes.
