# Day 1 issue bodies

An implementer can start these work items after a later explicit implementation
kickoff. The [backlog identifier map](issue-backlog.md#github-identifier-map)
links planning IDs to published issues; the [Day 1 runbook](day-1-mvp.md)
defines sequencing, evidence, and completion.

- [D1-01: Pin the minimal workspace and rendering toolchain](#d1-01-pin-the-minimal-workspace-and-rendering-toolchain)
- [D1-02: Create checkout-scoped lifecycle and static-check scripts](#d1-02-create-checkout-scoped-lifecycle-and-static-check-scripts)
- [D1-03: Define the minimum versioned project and synthetic fixture](#d1-03-define-the-minimum-versioned-project-and-synthetic-fixture)
- [D1-04: Implement pure frame, camera, trace, and label evaluation](#d1-04-implement-pure-frame-camera-trace-and-label-evaluation)
- [D1-05: Build one MapLibre frame adapter with explicit readiness](#d1-05-build-one-maplibre-frame-adapter-with-explicit-readiness)
- [D1-06: Mount the shared fixture in a Vue preview harness](#d1-06-mount-the-shared-fixture-in-a-vue-preview-harness)
- [D1-07: Mount the shared fixture in a Remotion composition](#d1-07-mount-the-shared-fixture-in-a-remotion-composition)
- [D1-08: Render and decode the synthetic fixture in both formats](#d1-08-render-and-decode-the-synthetic-fixture-in-both-formats)
- [D1-09: Prove Vue-to-Remotion parity before editor expansion](#d1-09-prove-vue-to-remotion-parity-before-editor-expansion)
- [D1-10: Create the minimal Quasar authoring shell](#d1-10-create-the-minimal-quasar-authoring-shell)
- [D1-11: Import bounded GeoJSON with usable validation errors](#d1-11-import-bounded-geojson-with-usable-validation-errors)
- [D1-12: Edit a camera focus with variant-specific framing](#d1-12-edit-a-camera-focus-with-variant-specific-framing)
- [D1-13: Edit line and boundary trace timing and appearance](#d1-13-edit-line-and-boundary-trace-timing-and-appearance)
- [D1-14: Edit animated labels and safe-area placement](#d1-14-edit-animated-labels-and-safe-area-placement)
- [D1-15: Implement the narrow loopback service boundary](#d1-15-implement-the-narrow-loopback-service-boundary)
- [D1-16: Save immutable SQLite revisions with conflict recovery](#d1-16-save-immutable-sqlite-revisions-with-conflict-recovery)
- [D1-17: Wire local project save and open controls](#d1-17-wire-local-project-save-and-open-controls)
- [D1-18: Run cancellable render jobs against a saved revision](#d1-18-run-cancellable-render-jobs-against-a-saved-revision)
- [D1-19: Expose export controls and prove the complete local flow](#d1-19-expose-export-controls-and-prove-the-complete-local-flow)
- [D1-20: Record Day 1 evidence and wire required checks](#d1-20-record-day-1-evidence-and-wire-required-checks)

## D1-01: Pin the minimal workspace and rendering toolchain

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** P03; explicit implementation kickoff.

**Why this model:** Repository setup follows the approved fixed architecture; Sol owns the later cross-runtime compatibility proof.

**Expected files:** `package.json`, `package-lock.json`, workspace manifests, `.gitignore`, `docs/contributor-guides/development.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Create npm workspaces for the three apps and three packages in the architecture, with no unrelated scaffold.
2. Pin Node 24 LTS, npm, and the tested compatible dependency set; record the exact selected Remotion and media-binary licenses.
3. Install the minimal packages and verify a tiny Chromium/encoder invocation and media inspection on Windows.

**Acceptance:** A clean install preserves the lockfile and imports the required Vue, Quasar, MapLibre, React, and Remotion entry points in their intended workspace. No real data or cloud credential is needed.

**Tests:** Record install, version, import, encoder, and decoded-media probes; no application command is claimed available yet. Commands require their introducing issues to be verified.

**Documentation update:** Add verified setup/version/license evidence to the development guide and implementation status.

**Stop condition:** Stop for incompatible peer dependencies, unavailable media inspection, or unresolved license obligations; do not replace the approved architecture silently. Reassess and split remaining scope at 60 minutes.

## D1-02: Create checkout-scoped lifecycle and static-check scripts

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 45 minutes.

**Dependencies:** D1-01.

**Why this model:** The process and command contracts are specified; implementation is bounded wiring.

**Expected files:** `package.json`, `scripts/dev.mjs`, `scripts/check-docs.mjs`, app entry points, `docs/contributor-guides/development.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add a loopback-only studio and health-only service stub plus root dev, status, stop, check, and documentation-check commands; expose no project mutation or arbitrary file routes before D1-15.
2. Track only this checkout's processes and report URLs/readiness without assuming fixed available ports.
3. Wire lint/type checks for existing code and reject broken local documentation links.

**Acceptance:** Two start/stop cycles free the owned ports and preserve data; status does not stop or claim unrelated processes. Missing future test suites never appear as passed.

**Tests:** Run the available scripts, verify a port collision, and inspect process ownership and documentation-check failure on a temporary broken fixture. Commands require their introducing issues to be verified.

**Documentation update:** Mark only implemented commands available and document start, readiness, and shutdown.

**Stop condition:** Stop if process ownership cannot be proven or a required static check would need a no-op. Reassess and split remaining scope at 60 minutes.

## D1-03: Define the minimum versioned project and synthetic fixture

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D1-01.

**Why this model:** A bounded schema implements the already documented project contract.

**Expected files:** `packages/project-schema/src/project.ts`, `packages/project-schema/src/validation.ts`, `tests/fixtures/synthetic-story/project.json`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Define IDs, schema version, assets, scenes, focus/camera, geometry, labels, timeline frames, and output variants for the bridge fixture.
2. Create an explicitly fictional ten-second fixture with point, line, polygon outer-ring boundary trace, timed label entrance/exit opacity, and local asset metadata.
3. Reject malformed IDs, nonfinite values, missing references, and unsupported schema versions.

**Acceptance:** Both apps can parse the same document without importing each other. The fixture has 300 frames at 30 frames per second and both target variants.

**Tests:** Run schema cases for a valid fixture and each rejected field class; include integer-frame bounds. Commands require their introducing issues to be verified.

**Documentation update:** Update project-format field coverage and mark the fixture synthetic in its accompanying notes.

**Stop condition:** Stop if the minimum bridge requires undocumented schema fields or broad features outside this slice. Reassess and split remaining scope at 60 minutes.

## D1-04: Implement pure frame, camera, trace, and label evaluation

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-03.

**Why this model:** Random-access frame math and geographic interpolation are critical shared behavior.

**Expected files:** `packages/story-core/src/evaluate-frame.ts`, `packages/story-core/src/camera.ts`, `packages/story-core/src/geometry.ts`, `tests/core/`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Evaluate immutable frame state from project, frame index, and output variant without a clock or DOM.
2. Implement the bounded camera, line and polygon outer-ring boundary tracing, and label entrance/exit opacity required by the fixture; preserve holes in fills and never add artificial ring connectors.
3. Add the test:core command with boundary, repeated-frame, and shuffled-order cases.

**Acceptance:** Repeated inputs return equal frame state independent of evaluation order; first/last frames and variant framing satisfy the rendering contract.

**Tests:** Run test:core with frames 0, 1, 149, 150, and 299, invalid bounds, zero-length geometry, polygon rings/holes, label transition boundaries, and reverse seek order. Commands require their introducing issues to be verified.

**Documentation update:** Record supported camera/trace semantics and exact unsupported modes in the rendering contract.

**Stop condition:** Stop if state depends on playback history or if geographic interpolation lacks a defined coordinate convention. Reassess and split remaining scope at 60 minutes.

## D1-05: Build one MapLibre frame adapter with explicit readiness

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-04.

**Why this model:** Map rendering readiness is the first cross-runtime uncertainty.

**Expected files:** `packages/map-adapter/src/mount.ts`, `packages/map-adapter/src/readiness.ts`, `tests/fixtures/synthetic-story/assets/`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Apply evaluated camera, geometry, trace, and labels to a MapLibre-backed shared view using local fixture assets.
2. Expose frame readiness only after the requested state, maps, and fonts have settled according to the rendering contract.
3. Surface missing-resource and timeout errors without wall-clock animation or arbitrary success delays.

**Acceptance:** The same adapter can mount in a Vue or React host and produce a ready frame or a specific failure. Synthetic assets need no external request.

**Tests:** Exercise repeated apply calls, missing fonts, missing map assets, and dispose/recreate behavior. Commands require their introducing issues to be verified.

**Documentation update:** Document readiness, resource ownership, and the bounded static fallback in the rendering contract.

**Stop condition:** Stop if readiness cannot be tied to the requested frame; preserve the smallest failing fixture for the bridge gate. Reassess and split remaining scope at 60 minutes.

## D1-06: Mount the shared fixture in a Vue preview harness

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 45 minutes.

**Dependencies:** D1-02, D1-05.

**Why this model:** The adapter contract is fixed and the host wiring is bounded.

**Expected files:** `apps/studio/src/pages/BridgePreview.vue`, `apps/studio/src/components/MapSurface.vue`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Create a minimal Quasar route that loads the synthetic fixture and shared adapter.
2. Add frame and variant controls that pass immutable inputs to the evaluator.
3. Expose a test hook reporting requested frame, readiness, and evaluated state hash.

**Acceptance:** A user can seek directly to any fixture frame in both dimensions without playback history. React remains absent from the studio dependency graph.

**Tests:** Manually seek out of order and verify keyboard access; capture the hook values for the parity harness. Commands require their introducing issues to be verified.

**Documentation update:** Document the temporary diagnostic route and avoid presenting it as the completed editor.

**Stop condition:** Stop if the host must duplicate camera, trace, or label math from story-core. Reassess and split remaining scope at 60 minutes.

## D1-07: Mount the shared fixture in a Remotion composition

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-04, D1-05.

**Why this model:** The React render host must preserve the Vue-shared deterministic contract.

**Expected files:** `apps/renderer/src/index.tsx`, `apps/renderer/src/StoryComposition.tsx`, `apps/renderer/src/MapFrameHost.tsx`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Create portrait and landscape compositions that consume serialized project data and the shared evaluator/adapter.
2. Tie Remotion's frame to the readiness promise with explicit failure propagation and cleanup.
3. Expose the same state/readiness diagnostic values used by the Vue harness.

**Acceptance:** Remotion requests any frame without a dependency on prior frame execution. Missing resources fail rendering instead of producing a blank success.

**Tests:** Render first/middle/last PNG frames and a deliberate missing-font failure. Commands require their introducing issues to be verified.

**Documentation update:** Record actual composition IDs and the render input contract.

**Stop condition:** Stop if the renderer imports Vue state, requires a running editor, or advances animations using elapsed time. Reassess and split remaining scope at 60 minutes.

## D1-08: Render and decode the synthetic fixture in both formats

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-07.

**Why this model:** The output pipeline and Windows media tools need an early executable proof.

**Expected files:** `scripts/render-fixture.mjs`, `apps/renderer/src/render-job.ts`, `package.json`, `out/verification/`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement render:fixture and its optional format/frame arguments exactly as testing-and-gates specifies.
2. Render both ten-second videos and capture source revision, environment, asset, frame, and output metadata in a receipt.
3. Decode the completed media and verify actual frame count, dimensions, frame rate, and representative frames.

**Acceptance:** The outputs are 1080 × 1920 and 1920 × 1080 at 30 frames per second with 300 decoded frames each. Partial outputs cannot be confused with accepted artifacts.

**Tests:** Run both full renders plus the five-frame diagnostic invocation and one expected failure. Commands require their introducing issues to be verified.

**Documentation update:** Mark the verified command available with its output directory and error behavior.

**Stop condition:** Stop if decoding, frame count, font readiness, or either required format fails; file existence alone is insufficient. Reassess and split remaining scope at 60 minutes.

## D1-09: Prove Vue-to-Remotion parity before editor expansion

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-06, D1-08.

**Why this model:** The bridge is the sprint's highest-risk integration and critical-path gate.

**Expected files:** `tests/render-contract/`, `package.json`, `docs/implementation-status.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement test:render-contract against the same pinned revision and viewport in both hosts.
2. Compare state and images for ordered, repeated, and shuffled frame requests using the rendering contract's tolerances.
3. Record Gate B evidence or attempt only the documented static fallback within its declared limitations.

**Acceptance:** Both hosts pass the parity and readiness cases in both formats, with retained hashes and image-diff evidence. A failed bridge blocks broad editor work.

**Tests:** Run the complete Gate B procedure including 299,0,149,1,299 seeks, repeated runs, and missing resources. Commands require their introducing issues to be verified.

**Documentation update:** Record the actual renderer mode, tolerances, environment, limitations, and gate status.

**Stop condition:** Stop editor expansion if either runtime diverges or neither approved rendering path passes. Reassess and split remaining scope at 60 minutes.

## D1-10: Create the minimal Quasar authoring shell

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 45 minutes.

**Dependencies:** D1-09.

**Why this model:** The approved design and proven preview adapter make this presentation work.

**Expected files:** `apps/studio/src/layouts/StudioLayout.vue`, `apps/studio/src/pages/AnimatePage.vue`, `apps/studio/src/stores/project-store.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Create the project, scene/timeline, preview, inspector, and export areas defined by the design system.
2. Keep project state serializable and route all preview changes through evaluateFrame.
3. Add the basic empty, dirty, loading, and error states with keyboard focus behavior.

**Acceptance:** The fixture can be opened in the authoring shell and edited state is visibly distinct from a saved revision. Layout remains usable at the documented desktop minimum.

**Tests:** Walk through keyboard navigation, empty state, frame seeking, and portrait/landscape preview. Commands require their introducing issues to be verified.

**Documentation update:** Update design-system implementation notes and the draft authoring guide with actual labels.

**Stop condition:** Stop if the shell requires a second rendering model or a large timeline feature beyond the minimum controls. Reassess and split remaining scope at 60 minutes.

## D1-11: Import bounded GeoJSON with usable validation errors

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-10.

**Why this model:** Coordinate and geometry validation affects every later geographic feature.

**Expected files:** `packages/story-core/src/geojson.ts`, `apps/studio/src/components/GeoJsonImport.vue`, `tests/fixtures/geojson/`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Support the geometry types and WGS84 conventions in the project contract with explicit file/feature limits.
2. Validate coordinates, geometry shape, identifiers, and bounding boxes before adding a layer or accepting reviewed replacement GeoJSON as a new feature revision.
3. Show source/provenance fields and import errors; require deliberate adoption of replacement geometry while prior saved scenes/snapshots retain their earlier revision and stale-dependency indicators remain visible.

**Acceptance:** Valid point, line, and polygon fixtures appear and retain source metadata; reviewed replacement GeoJSON creates a new immutable feature revision while earlier saved references retain prior geometry. Invalid coordinates and unsupported content do not corrupt the project, and freehand/vertex editing is deferred.

**Tests:** Test empty, malformed, oversized, nonfinite, reversed-bound, valid multipart, and replacement-revision cases, including prior-reference preservation and explicit new-revision adoption. Commands require their introducing issues to be verified.

**Documentation update:** Write the verified import steps and documented input limits.

**Stop condition:** Stop on ambiguous coordinate reference systems or unknown source rights; do not guess a conversion. Reassess and split remaining scope at 60 minutes.

## D1-12: Edit a camera focus with variant-specific framing

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D1-11.

**Why this model:** This slice binds known camera fields to a bounded inspector.

**Expected files:** `apps/studio/src/components/CameraInspector.vue`, `apps/studio/src/stores/project-store.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Expose supported center/extent, duration, easing, and output-variant framing controls.
2. Validate edits using the schema and update the shared preview at the selected frame.
3. Provide a reversible reset to the saved or default focus values.

**Acceptance:** The user can create a visible camera transition in both output variants without changing shared geographic identity.

**Tests:** Check first/last frames, invalid durations, keyboard editing, and variant overrides. Commands require their introducing issues to be verified.

**Documentation update:** Update the authoring guide with actual control labels and supported camera modes.

**Stop condition:** Stop if a requested mode needs new camera mathematics; create a separate Sol issue. Reassess and split remaining scope at 60 minutes.

## D1-13: Edit line and boundary trace timing and appearance

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D1-12.

**Why this model:** The shared trace evaluator already supplies the difficult behavior.

**Expected files:** `apps/studio/src/components/TraceInspector.vue`, `apps/studio/src/stores/project-store.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Select an imported line or polygon boundary and edit trace start/end frames, direction, width, and color, with explicit ring/hole behavior.
2. Reject invalid timing or incompatible geometry and preserve layer references.
3. Preview the result through the existing frame evaluator.

**Acceptance:** Trace timing and style survive a project serialization round trip and match the bridge render behavior.

**Tests:** Check zero/short line, polygon outer ring and holes, multipart breaks, reverse direction, invalid ranges, and first/mid/last trace frames. Commands require their introducing issues to be verified.

**Documentation update:** Add verified route-trace authoring instructions.

**Stop condition:** Stop if the UI needs to approximate geometry independently of the shared trace function. Reassess and split remaining scope at 60 minutes.

## D1-14: Edit animated labels and safe-area placement

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D1-13.

**Why this model:** This is bounded form and visual-state work against the shared text contract.

**Expected files:** `apps/studio/src/components/LabelInspector.vue`, `apps/studio/src/components/SafeAreaOverlay.vue`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add text, anchor, dot, leader line, white casing, visibility interval, entrance/exit opacity timing, and supported style controls using bundled cleared fonts.
2. Expose portrait/landscape safe-area guides and variant-specific label placement.
3. Show overflow or unavailable-font errors before export.

**Acceptance:** A user can add and edit readable labels in both variants; exported text follows the same positioning and font inputs as preview.

**Tests:** Check long text, dot/leader/casing geometry, missing font, timed entrance/exit frames, disabled label, keyboard editing, and safe-area clipping. Commands require their introducing issues to be verified.

**Documentation update:** Document actual label controls and attribution requirements for font assets.

**Stop condition:** Stop if text requires browser-dependent layout outside the rendering contract. Reassess and split remaining scope at 60 minutes.

## D1-15: Implement the narrow loopback service boundary

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-01, D1-03.

**Why this model:** Local HTTP origin, session, and file-access controls are security-sensitive integration.

**Expected files:** `apps/local-service/src/server.ts`, `apps/local-service/src/security.ts`, `tests/persistence/security.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Implement loopback-only binding, narrow allowed origins, per-session authorization, request-size limits, and fixed storage-root resolution from the architecture.
2. Expose health and validated project API routes without arbitrary filesystem access.
3. Prepare a concrete security review record for the repository owner before merging this boundary.

**Acceptance:** Unauthorized, cross-origin, oversized, and path-escaping requests fail; authorized local requests work. Owner approval of this concrete security boundary is recorded before merge.

**Tests:** Exercise remote bind rejection, missing/incorrect session token, origin validation, request limits, and path escape attempts. Commands require their introducing issues to be verified.

**Documentation update:** Document the actual local security contract and owner review scope without revealing credentials.

**Stop condition:** Stop merge for absent owner security approval or any unbounded filesystem/network access. Reassess and split remaining scope at 60 minutes.

## D1-16: Save immutable SQLite revisions with conflict recovery

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-15.

**Why this model:** Atomic revisions, compare-and-swap, and crash recovery span persistence contracts.

**Expected files:** `apps/local-service/src/db/project-repository.ts`, `apps/local-service/src/db/database.ts`, `tests/persistence/revisions.test.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Use the pinned Node SQLite API to store immutable project revisions and an atomic head pointer.
2. Require expectedRevisionId for head updates and retain assets by content hash.
3. Implement bounded backup/recovery behavior and return a typed stale-save conflict.

**Acceptance:** A reopened service restores the saved project, a stale save cannot overwrite a newer head, and an interrupted transaction preserves the last complete revision.

**Tests:** Test create/update/restart/conflict, interrupted transaction, and backup restore using temporary data roots. Commands require their introducing issues to be verified.

**Documentation update:** Document actual persistence, backup location, recovery, and SQLite runtime limitations.

**Stop condition:** Stop if data recovery or transaction semantics are uncertain; do not make destructive automatic migration choices. Reassess and split remaining scope at 60 minutes.

## D1-17: Wire local project save and open controls

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D1-10, D1-16.

**Why this model:** The repository API is established and this slice wires user-visible states.

**Expected files:** `apps/studio/src/components/ProjectMenu.vue`, `apps/studio/src/services/local-api.ts`, `apps/studio/src/stores/project-store.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add named local save/open controls using the authorized service session.
2. Show dirty/saving/saved/conflict/error states and preserve unsaved edits on failure.
3. Offer explicit reload or save-as recovery for stale-revision conflicts.

**Acceptance:** A saved edited project reopens after service restart with camera, geometry, traces, labels, and variant settings intact.

**Tests:** Walk through save/reopen, denied request, stale revision, and retry without silent data loss. Commands require their introducing issues to be verified.

**Documentation update:** Write actual save/open and conflict-recovery instructions.

**Stop condition:** Stop if the UI would discard unsaved changes or hide a persistence error. Reassess and split remaining scope at 60 minutes.

## D1-18: Run cancellable render jobs against a saved revision

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-08, D1-16.

**Why this model:** Job lifecycle and immutable render input bridge storage and child processes.

**Expected files:** `apps/local-service/src/services/job-runner.ts`, `apps/local-service/src/routes/jobs.ts`, `apps/renderer/src/render-job.ts`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Resolve one saved project revision and frozen asset manifest before launching the existing renderer.
2. Track queued/running/completed/failed/canceled states with progress and typed errors.
3. Implement cancellation and partial-output handling without changing the pinned source revision.

**Acceptance:** Editing or saving a newer project cannot change an in-progress export, and cancellation stops owned work without publishing partial output.

**Tests:** Test a successful fixture job, missing asset, child failure, cancellation, and concurrent later save. Commands require their introducing issues to be verified.

**Documentation update:** Document job states, cancellation, and artifact retention.

**Stop condition:** Stop if a job reads mutable editor state or cancellation can terminate unrelated processes. Reassess and split remaining scope at 60 minutes.

## D1-19: Expose export controls and prove the complete local flow

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D1-14, D1-17, D1-18.

**Why this model:** The feature is bounded UI wiring but requires a real end-to-end smoke check.

**Expected files:** `apps/studio/src/components/ExportDialog.vue`, `tests/smoke/day-one.spec.ts`, `package.json`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add saved-revision selection, format controls, progress, cancel, and actionable failure states.
2. Implement test:smoke for import, edit, save, reopen, and both exports using the synthetic fixture.
3. Decode the outputs and compare receipt revision and visible representative frames.

**Acceptance:** The user can produce both required formats from the reopened saved project; every output identifies its pinned revision and failure is visible.

**Tests:** Run Gate C and the smoke command, including canceled export and a stale unsaved editor state. Commands require their introducing issues to be verified.

**Documentation update:** Write verified export instructions and limitations with actual interface labels.

**Stop condition:** Stop if either format fails, a required control is inaccessible, or output cannot be traced to the saved revision. Reassess and split remaining scope at 60 minutes.

## D1-20: Record Day 1 evidence and wire required checks

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** D1-19.

**Why this model:** This is bounded verification bookkeeping and workflow configuration.

**Expected files:** `.github/workflows/check.yml`, `docs/implementation-status.md`, `docs/contributor-guides/development.md`. These are planned paths until created.

The implementer should complete this bounded slice in order.

1. Add the approved continuous-integration workflow for implemented static and unit checks, with explicit manual Windows render evidence when needed.
2. Run the Day 1 gate checklist and record actual receipts, limitations, and unresolved findings.
3. Update the development and user documentation to match the demonstrated flow.

**Acceptance:** Gates A, B, and C have evidence and no placeholder success; the next eligible Day 2 issue is identified. A failed gate remains failed.

**Tests:** Run the implemented root check command and review the workflow definition and local Windows receipts. Commands require their introducing issues to be verified.

**Documentation update:** Update implementation status, runbook gate evidence, and command availability.

**Stop condition:** Stop completion if any required gate is unrun or failing; do not modify branch protections or bypass checks. Reassess and split remaining scope at 60 minutes.
