# Verify the Vue and Remotion rendering contract

Run this harness to check the actual Vue diagnostic preview and registered
Remotion compositions against one synthetic project revision. The harness is
implemented, but its browser/rendering checks have not passed in the worker
sandbox. Gate B remains unproven until the approved host verifier records a
successful complete run and the coordinator accepts its evidence.

## Run the checks

Use the pinned Windows x64 toolchain and installed Chromium executable. Install
the lockfile without lifecycle scripts, as required by the dependency receipts.
Do not substitute a downloaded browser or change the graphics backend to make a
comparison pass. Set `GSTORY_CHROME` to the approved executable's absolute path.

First confirm the prerequisite behavior in this checkout:

```powershell
npm run check
npm run lint --workspace @gstory/renderer
npm run typecheck --workspace @gstory/renderer
node --test --test-isolation=none tests/core/*.test.mjs tests/project-schema/*.test.mjs tests/renderer/input.test.mjs
node --test --test-isolation=none --test-concurrency=1 tests/map-adapter/bridge.test.mjs tests/map-adapter/vue-preview.test.mjs tests/map-adapter/remotion-fixture.test.mjs
npm run test:render-contract:unit
```

Then run the complete gate:

```powershell
npm run test:render-contract
```

The gate does not accept a reduced format, scaled viewport, or still-only mode.
It invokes D1-08's full fixture runner itself; a prior unrelated export receipt
does not satisfy this run. A missing prerequisite, failed comparison, or failed
video decode makes the command fail. `--help` describes the command without
loading browser tooling. The separate unit command tests the comparator and
the pinned renderer's CDP response handling without launching a browser. It
requires installed dependencies and cannot establish parity or release editor
work.

## What the harness checks

Both hosts use the real shared adapter at 1080 × 1920 and 1920 × 1080, pixel
ratio 1, `swangle`, and one render request at a time. The Vue page uses the
existing component and controls; test CSS removes its display scale and places
only the fixed map surface in the screenshot. The Remotion page uses the
existing registered composition, actual frame context, and delay handles. The
test keeps each host alive through its seek sequence instead of recreating a
map for every frame.

Each format runs two fresh sessions per host. Each session requests 26 ordered
frames around camera, trace, and label boundaries, followed by
`299,0,149,1,299,149,0,149`. Fresh sessions disable the HTTP cache; later seeks
exercise already loaded resources. The current fixture has one scene and two
camera keyframes. Multi-scene resets have separate evaluator/adapter tests;
this fixture does not establish a multi-scene video result.

For every sample, the harness retains the host's canonical state hash, the
independently evaluated expected hash, full-size PNG, isolated SVG PNG, and
decoded RGBA hashes. Repeat captures in the same host must have identical
decoded pixels, including after unrelated seeks and fresh sessions. Cross-host
images must retain at least 99.5% of pixels within 8 per channel. A separate
symmetric Euclidean edge comparison on the isolated authored overlay requires
every detected edge to have a counterpart within one output pixel. Edges use
adjacent-channel changes greater than 8; tiny coverage differences below that
threshold remain subject to the full-image and structural checks.

The harness also checks exact normalized SVG structure, layer order, visible
labels and cased leaders, loaded fonts, text bounds including casing, mask
placement, native basemap ink, and source resource bytes. These checks can fail
even when the aggregate pixel score passes. Only generated font-family IDs are
normalized in the SVG comparison. The declared numerical tolerances are fixed
in `compare.mjs`; a failure does not authorize widening them.

Each host and format must reject missing styles, missing fonts, invalid font
bytes, unsupported tiled styles, and a held font request. The held request
uses the adapter's existing 30-second initialization deadline. Vue must conceal
and announce a failed frame. Remotion must cancel the render and retain its
delay handle. No successful image is captured for a fault case. The separate
adapter prerequisite suite also exercises per-frame deadlines, supersession,
context loss, and recovery. No fixed sleep substitutes for frame readiness.

Finally, the D1-08 runner must produce both 300-frame H.264 videos at 30 fps,
ten seconds, and `yuv420p`, and independently decode every frame. The harness
checks that the video receipt belongs to the same project revision and verifies
the output file hashes. Lossy video samples are playback evidence, not source
PNG parity evidence. Source-file hashes must remain unchanged through the gate.

## Retained evidence and limitations

Every invocation prints a unique directory under
`.local/render-contract/RUN_ID/`. Its checkpointed `receipt.json` contains the
project snapshot hash, source-file manifest, resource/font/worker hashes,
package versions, browser executable hash, observed browser and WebGL details,
timings, frame diagnostics, comparisons, and failure stage. Successful resource
fetches must match the pinned fixture bytes; unexpected remote browser requests
fail the test. Cross-host comparisons retain red-channel difference PNGs beside
the captures. A failure before capture produces no image evidence and remains
explicitly incomplete. D1-08's linked video receipt and outputs remain under
`out/verification/RUN_ID/`; keep all generated output local and out of Git.

The harness uses the installed Remotion `4.0.542` setup/seek internals because
the public still API creates a fresh page per request. The version guard fails
on a different renderer version. A dependency upgrade requires reviewing those
hooks against the installed implementation before relying on the gate.

The accepted test resource profile is a local style with inline fictional
GeoJSON and a local cleared font. It has no tiles, sprites, glyph service,
images, or authored audio/video. Rejection of a tiled style does not establish
production tile-readiness behavior. No static-map fallback is supplied: the
repository has no approved geographically registered static fixture, and such
a draft would not satisfy the moving-map gate. Human visual and playback review,
independent review, and coordinator acceptance remain separate evidence. Broad
editor expansion stays blocked while Gate B is unproven.

The [rendering contract](../../docs/architecture/rendering-contract.md) defines
the tolerances, and the [Gate B procedure](../../docs/planning/testing-and-gates.md#gate-b-deterministic-render-bridge)
defines the required acceptance work.

