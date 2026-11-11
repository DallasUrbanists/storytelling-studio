# Deterministic preview and rendering

Contributors can use this contract to make a frame mean the same thing in the
Vue editor and the exported video. The first implementation task is a small
shared rendering proof, because an attractive editor is not useful if its
saved camera, layers, or timing produce a different film.

**Status: planned, not implemented.** The following interfaces and acceptance
criteria require implementation and recorded evidence. No successful render,
preview comparison, or performance measurement is claimed here.

- [What deterministic means](#what-deterministic-means)
- [Frame evaluation interface](#frame-evaluation-interface)
- [Timing and camera rules](#timing-and-camera-rules)
- [Geometry, layers, and labels](#geometry-layers-and-labels)
- [Shared browser adapter](#shared-browser-adapter)
- [Readiness for every frame](#readiness-for-every-frame)
- [Export job lifecycle](#export-job-lifecycle)
- [First-day proof and acceptance](#first-day-proof-and-acceptance)
- [Fallbacks and honest completion](#fallbacks-and-honest-completion)
- [Output profiles and receipts](#output-profiles-and-receipts)
- [Verified upstream assumptions](#verified-upstream-assumptions)

## What deterministic means

The same validated project revision, output variant, integer frame, and pinned
resource set must produce the same resolved frame state, regardless of the
previously viewed frame. Rendering frame 149 after frame 299 must match rendering
frame 149 from a fresh start.

The project distinguishes three forms of agreement.

| Level | Required evidence |
| --- | --- |
| Data agreement | Canonical frame-state hashes match exactly between Vue and Remotion. |
| Repeat-render agreement | Repeated renders in the same pinned browser, graphics backend, fonts, and asset environment produce identical decoded image pixels. |
| Preview/export agreement | The isolated Vue preview and Remotion frame match the declared visual tolerance at the same output dimensions. |

The project must not promise identical raster pixels across different graphics
drivers, browsers, or operating systems. It must record those differences in
render receipts and preserve exact project/resource inputs so discrepancies can
be investigated. A video file's compressed bytes are also a different measure
from the decoded pixels of its source frames.

The evaluator must not depend on elapsed wall-clock time, random numbers without
a saved seed, network responses, DOM measurements, browser device size, or
previous state. Input validation and resource resolution must happen before
evaluation; readiness waits must not alter the requested frame's content.

## Frame evaluation interface

The shared core must expose one pure evaluation operation with the following
planned type-level contract. This TypeScript excerpt describes an interface;
it is not application code that already exists.

```typescript
evaluateFrame(
  project: ValidatedProjectDocument,
  variantId: "portrait" | "landscape",
  frame: number
): FrameState
```

The `frame` input must be an integer from 0 through `durationFrames - 1`.
The core must reject invalid frames rather than clamp them differently for
different callers. The project compiler can cache immutable geometry lengths
and scene offsets, but its cache must not affect the result.

The `FrameState` result must contain the following resolved information.

| Field | Meaning |
| --- | --- |
| `frame`, `sceneId`, `variantId` | The exact requested position and output choice. |
| `viewport` | Fixed width, height, and pixel ratio 1 for the output surface. |
| `camera` | Explicit longitude, latitude, zoom, bearing, and pitch values. |
| `mapResourceSetId` | The pinned basemap style and resource mapping. |
| `baseLayerStates` | Complete visibility/opacity for every controlled base layer. |
| `layers` | Ordered authored shapes, trace progress, fill/dim values, and complete visibility state. |
| `annotations` | Resolved text, geographic anchors, output-relative offsets, casing, and timing. |
| `roadway` | Optional evaluated top-down roadway drawing and dimension labels. |
| `credits` | The attribution required by resources visible in this frame or its required credit scene. |

A scene's research annotation must contain the selected snapshot's formatted
text and source reference, not a query that the renderer executes later.
Templates must resolve to saved numeric and textual values before evaluation.
The frame state must remain serializable JSON so the tests can compare and
inspect it without mounting either framework.

The Vue preview controller must call this evaluator as its playhead changes.
The Remotion composition must call it with Remotion's requested frame and the
same pinned document. React components must only host the drawing surface and
coordinate render readiness; they must not recreate timing or camera logic.

## Timing and camera rules

The initial project runs at 30 frames per second. Time intervals use
half-open bounds: a layer with `startFrame: 30` and `endFrameExclusive: 60` is
visible at frames 30 through 59. Scene offsets are the cumulative sum of prior
scene durations, so there is no ambiguous shared boundary frame.

The evaluator must define interpolation as follows.

- A keyframe's exact frame must produce its exact saved value.
- An interval must use normalized progress `(frame - start) / (end - start)`
  between its endpoint keyframes, then apply its saved easing function.
- A property before its first or after its last keyframe must hold that endpoint
  value within the owning scene.
- A zero-duration effect must resolve as an explicit step; the evaluator must
  not divide by zero or substitute a frame-rate-dependent duration.
- Named easing functions must have versioned pure implementations in story-core,
  beginning with linear and cubic ease-in-out.

The camera must interpolate center coordinates in Web Mercator space and zoom
linearly in its saved zoom scale. Bearing must follow the saved direction, with
the shortest turn as the default chosen during authoring; exact 180-degree
ties must use a documented positive direction. The first release uses
`pitch: 0`, flat ground, and no roll.

The core must own pure camera fitting and interpolation. **Fit focus** must
calculate camera keyframes using the selected geometry, fixed viewport,
author padding, and output variant, then store those values. The map adapter
must not call an animated `flyTo` or `easeTo` operation during playback or
export; it applies the resolved camera immediately with `jumpTo`.

The first camera-fit implementation should support unrotated bounds and
flat Mercator projection. Bearing controls can animate already fitted camera
values, but the UI must not claim that arbitrary rotated bounds have been fitted
unless that calculation has its own matching evidence. Pure projection tests
must agree with the adapter's pixel projection within 0.5 output pixels for the
fixture's camera range.

Portrait and landscape share the same scenes, duration, and narrative.
Each variant can override camera keyframes and label positions to preserve the
focus within its frame. Export must not crop a completed landscape video to
produce the portrait version.

## Geometry, layers, and labels

The core must compute trace geometry from saved shapes and absolute frame
progress. A line or corridor trace must use cumulative geographic length;
at progress 0 it must produce an empty visible path, and at progress 1 it must
produce the complete saved path. The zero-progress branch must avoid calling a
line-slice operation with an invalid zero-length range.

Day 1 polygon tracing must trace exterior rings in their saved order, with
cumulative length across multipart exteriors and no artificial connecting line
between parts. Interior rings must remain holes in fills and masks; animating
their borders is deferred unless explicitly implemented and tested. Fill
geometry must remain the original polygon rather than a partially traced open
line, and author controls must specify whether tracing, fill appearance, and
outside dimming occur together or in separate frame intervals.

The core must return complete states for every authored layer on every frame,
including layers that are hidden. Layer order must be stable by `zIndex` and
ID, and visibility must come from explicit intervals. A layer must not remain
visible because it was left on by the preceding scene.

The initial adapter should draw authored polygons, traces, transit, point
markers, leader lines, labels, and masks in one generated SVG overlay above the
MapLibre canvas. The same SVG builder and stable drawing order must serve Vue
and Remotion. This avoids two implementations of label placement or effects.

The adapter must project geographic overlay vertices and anchors through the
resolved map camera. A mask must dim the viewport outside the chosen area while
preserving polygon holes correctly; a corridor can use its explicit polygon
or a recorded, unit-aware buffer as the focus area. The UI must identify an
estimated buffer and keep the original centerline editable.

The export basemap must use a pinned style with native symbol layers disabled
in the first release. Saved labels in the shared SVG overlay replace important
context labels, preventing map-label collision history from changing the film.
Explore can use a richer live style, but Animate's render preview must display
the actual export style and required credits.

Each annotation must have a geographic anchor, a leader-line option, and a
position override for each output variant when needed. The initial label
layout must use explicit offsets and alignment rather than a collision engine
whose result depends on insertion order. A white casing beneath dark or colored
text and lines must remain readable over the basemap, as defined in the
[design system](../design/design-system.md).

The initial animated-label mode must use saved entrance and exit frame
intervals to evaluate opacity for its text, point, and leader line. The default
label group fades together; a later separate leader-line trace is optional and
must not be implied by the first mode. A seek before or after the label interval
must produce its explicit hidden state.

The core must not infer visible layers by querying what happens to be loaded in
the map. Layer content must come from the saved project or pinned data resource
set, so a camera move cannot silently change the underlying transit or research
data selected for a scene.

## Shared browser adapter

The `@gstory/map-adapter` package must own a framework-independent browser
surface with the following planned operations.

| Operation | Responsibility |
| --- | --- |
| `mount(container, resources, viewport)` | Create the MapLibre canvas, SVG overlay, and readiness tracker for explicit dimensions. |
| `applyFrame(frameState, requestId)` | Apply absolute camera, every layer state, and overlay content; resolve only when this request is visually ready. |
| `inspectReadiness()` | Return pending resources, current request ID, and actionable errors. |
| `dispose()` | Release resources when the owning preview surface or render session actually ends. |

The Vue host and React host must pass a container and the same frame state to
these operations. The adapter must bundle its MapLibre worker locally with the
application, resolve assets through the local job resource mapping, and avoid
runtime imports from a public CDN.

The renderer's resource mapping must use the read-only
`GET /api/jobs/:jobId/resources/:resourceId` endpoint defined by the
[local service interface](system-architecture.md#local-service-interface).
Every opaque resource ID must belong to that job's pinned manifest; missing
entries must fail without trying a local file path or arbitrary remote URL.
The editor must resolve its assets through the hash-addressed
`GET /api/assets/:sha256` preview endpoint, without substituting different bytes
for export.

The export surface must use explicit pixel dimensions, pixel ratio 1, disabled
interaction, zero style transition durations, zero symbol fade duration, and
preserved drawing buffers where required by the pinned MapLibre version.
Resize observers and responsive UI containers must not alter export dimensions.
The preview can scale the entire fixed-size surface for display while retaining
the same internal coordinate system.

The adapter must have a render-session lifetime. A React effect that reruns for
each frame must not remove and recreate the map, and cleanup must not release a
map while Remotion still needs its canvas. Vue navigation must still dispose
the preview map when that surface ends; the two hosts must apply the appropriate
lifetime explicitly rather than omit all resource cleanup.

## Readiness for every frame

A loaded map style does not establish that the requested frame is ready. The
adapter must wait for the resources and map update associated with the current
request, including repeated requests for an unchanged camera.

The React host and neutral adapter must perform the following sequence for each
export frame. Remotion handles belong only to the React host; the adapter must
return readiness promises and errors without importing Remotion.

1. The React host must create a request ID and acquire its Remotion delay handle
   before the frame can be captured, then call the adapter's `applyFrame`.
2. The adapter must register map completion and error listeners before changing
   camera, sources, or layers, so a fast completion event cannot be missed.
3. The adapter must apply the entire frame state, render the shared SVG overlay,
   and request a repaint even when camera values equal the preceding request.
4. The adapter must await map idleness for this request, a loaded style and
   required tiles or sources, loaded fonts, decoded images, and any other
   implemented media seek.
5. The adapter must resolve only the matching request's readiness, and the React
   host must release that handle on success or cancel rendering on failure.

The local service must resolve required map style, source, tile, sprite, glyph,
font, and image resources before export where the chosen resource set permits
local capture. A resource set consisting of local GeoJSON and a local style is
an acceptable first implementation and avoids assuming an external tile cache
can be redistributed. Live uncaptured resources must not be presented as a
fully reproducible offline render input.

The readiness tracker must distinguish an expected optional resource from a
required resource. An HTTP error, missing font, absent tile in a required local
set, map error, invalid image, or lost graphics context must fail the frame with
the resource ID and requested frame. An idle event after an error must not turn
that failure into success.

The adapter must treat superseded preview requests explicitly. The interactive
preview can drop old requests and settle on the newest playhead position; a
cancelled request must never acknowledge a newer one. The renderer must render
one frame request at a time initially and must never capture a superseded frame.

The service must apply a bounded per-frame timeout, initially 30 seconds as a
configurable default, and a separate initialization timeout. A timeout must
cancel the render or produce an actionable failed-frame report; it must not
release the delay handle and capture a blank frame. Fixed sleeps, a page `load`
event, a fulfilled network-idle heuristic, or a single initialization delay
are not sufficient success conditions.

The preview must show **Loading frame** or a resource error while readiness is
pending. It must not display a stale frame under a new timecode as though the
new frame were complete. Smooth interactive playback can skip late frames;
an export must preserve every requested frame.

## Export job lifecycle

The local service must run the following stages for a video export.

1. Save or select a committed project revision, and pin its document and asset
   hashes for the job.
2. Validate schema, geometry, frame intervals, variant overrides, source credits,
   asset availability, and video-publication rights.
3. Prepare the immutable local resource mapping and record the renderer,
   browser, font, graphics backend, and output settings.
4. Start the renderer process with structured job input and one rendering
   worker, then report frame progress through the job record.
5. Verify completed outputs for dimensions, frame rate, duration, and nonempty
   content before exposing them as successful downloads.
6. Write the render receipt and retain failed-frame diagnostics when a stage
   fails, without changing the source revision.

The worker must use the installed Remotion rendering APIs and supported bundled
media binaries, verified during setup. It must not depend on an obsolete
`ensureFfmpeg` call or conclude that rendering is impossible solely because a
system `ffmpeg` executable is absent. Any extra binary or codec distribution
must be recorded in the dependency evidence and reviewed before packaging.

The first renderer must use concurrency 1 for the MapLibre composition.
Increasing concurrency requires a new memory and determinism check; it is not
an automatic performance setting. The two output variants can render
sequentially from the same revision and retain independent progress and error
results.

## First-day proof and acceptance

The first fixture must be a 10-second, 300-frame synthetic story with two or
more camera states, a polygon trace, fill and outside dimming, a persistent
route layer, and a point with a leader-line label. The fixture must use locally
available, rights-cleared resources and exercise a real MapLibre surface in
both Vue and Remotion.

The renderer test must request frames in the order `[299, 0, 149, 1, 299]` and
compare repeated requests. It must also request scene and effect boundary
frames, including the frame immediately before and after a visibility change.
The suite must exercise a cold resource load, a warm load, and a missing
required resource that fails visibly.

The gate must record the following checks for both 1080 × 1920 and 1920 × 1080.

| Check | Acceptance criterion |
| --- | --- |
| Pure frame evaluation | Identical canonical frame-state hashes across callers and seek order. |
| Same-environment repeat renders | Identical decoded RGBA pixels for repeated frames; PNG metadata is excluded. |
| Preview/export comparison | At least 99.5% of pixels differ by no more than 8 per channel, with authored geometry/text edges displaced by no more than 1 output pixel. |
| Meaningful visual agreement | No missing layer, clipped required text, misplaced anchor, blank basemap, or incorrectly ordered mask, regardless of aggregate pixel score. |
| Media metadata | Exact requested dimensions, 30 fps, and 300 frames for the fixture video. |
| Failure behavior | Missing required resources and readiness timeouts fail the job; no successful blank output. |
| Runtime record | Browser, renderer, graphics backend, fonts, resources, and duration measurements are saved in the receipt. |

The preview comparison must use the isolated map surface at full output size,
with controls excluded and the browser version pinned as closely as practical
to the rendering browser. The stated tolerance is a proposed initial threshold
that must be agreed before the first comparison; a failing test must not be
made green by widening the threshold after inspection without a documented
decision.

The command names and fixture output location belong to the
[testing and gate plan](../planning/testing-and-gates.md). Its future
`render:fixture` command must write receipts, diagnostic frames, and videos
under `out/verification/<run-id>/`; no such command is claimed to exist before
the relevant task implements it.

## Fallbacks and honest completion

The first gate must distinguish a resource failure, a map engine failure, and a
shared timing or projection failure. Each condition has a different fallback.

| Failure | Bounded fallback | What remains unproven |
| --- | --- | --- |
| Public map resources are unavailable or cannot be redistributed | Use a local style and rights-cleared local geographic features in a real MapLibre map. | The intended production resource set still needs its own validation. |
| A complex base style produces unstable labels or transitions | Remove native labels and animated/custom layers; retain explicit SVG labels and static geographic layers. | Any removed style capability is outside the accepted initial profile. |
| MapLibre capture remains unstable in the available environment | Prepare a clearly labeled draft using a permitted static map image and shared overlay timing. | The required geographic camera/map rendering gate remains failed. |
| A final scene requires an unsupported feature | Preserve its editable data and flag the scene as incomplete. | The complete narrative is not accepted until the feature works or the owner explicitly accepts reduced scope. |

A static image can support an honest pan-and-zoom draft only if its geographic
registration and projected overlays are valid for that camera treatment. It
must not masquerade as a general moving map, and it cannot independently satisfy
the requested shared MapLibre camera bridge. A blank vector fixture proves only
the capabilities it actually exercises.

The sprint must stop adding editor breadth when the core bridge remains
unproven. The acceptable next action is to resolve the bounded failure or make
its impact explicit, not to declare a visually plausible draft a completed
Day 1 or final-film gate.

## Output profiles and receipts

The initial final output profiles are MP4 with H.264 video, 30 fps, and pixel
format `yuv420p`, subject to the pinned renderer's available codec build.
Portrait uses 1080 × 1920; landscape uses 1920 × 1080. The first film can be
silent if no audio is authored; audio import and synchronization must not be
claimed until their format and seek behavior are tested.

The package must retain editable project data separately from media output.
Each export receipt must identify the following information.

- The source project ID, immutable revision ID, document hash, and schema/core
  versions.
- The output variant, dimensions, frame rate, requested frame range, codec,
  pixel format, and source frame count.
- The Remotion, MapLibre, browser, Node, and graphics backend versions, plus
  exact font and required asset hashes.
- The map resource-set hash, required credits, excluded resources, and any
  declared draft limitations.
- The job state, elapsed duration, output hashes, failed frame or resource
  diagnostics, and validation results.

The receipt must not claim a source-frame visual comparison if only video
metadata was checked. Render speed is an observed machine-specific value; the
initial plan does not promise real-time or faster-than-real-time output.

## Verified upstream assumptions

The official [Remotion map guide](https://www.remotion.dev/docs/maps), checked
on November 11, 2026, supports the chosen MapLibre/Turf direction. It describes
render delays around loading and frame changes, disabled map fades,
preserved drawing buffers, repainting unchanged cameras, and single-concurrency
graphics rendering; those instructions inform the adapter but do not replace
its project-specific tests.

MapLibre documents [`jumpTo`](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#jumpto)
as an immediate camera update. Its [`idle` event](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapEventType/#idle)
describes a settled map after requested work, while style-loading events alone
do not establish a completed capture. The adapter adds its own generation,
resource-error, font, and media checks around these engine signals.

Remotion's [`delayRender` documentation](https://www.remotion.dev/docs/delay-render)
requires releasing the associated handle after asynchronous work and provides
render cancellation for unrecoverable failures. The application must not use
that mechanism as a substitute for preview readiness, because preview and
render environments have different delay behavior.

The [dependency evidence](../planning/dependency-evidence.md) records license,
runtime, and binary constraints. The [system architecture](system-architecture.md)
owns the package boundary and local process contract; this document owns frame
semantics and the evidence required to trust an export.
