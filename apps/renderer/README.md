# Remotion bridge host

You can inspect the D1-07 composition inputs and run the renderer's static and
input checks from the repository root. The host is implemented, but browser
readiness, PNG output, and the deliberate missing-font render remain unverified
in this attempt. This diagnostic host is not the completed video exporter.

## Composition inputs

The entry point is `src/index.tsx`. It registers `StoryPortrait` at 1080 by 1920
and `StoryLandscape` at 1920 by 1080, both at 30 frames per second. The default
synthetic project has 300 frames. Each registration validates supplied project
data and calculates its duration from the saved scenes.

Both compositions accept one JSON-serializable input object:

| Field | Contract |
| --- | --- |
| `project` | A document accepted by the existing bridge `parseProject` validator; no Vue state or running editor is used. |
| `resources.style` | `{ id, url }` identifying the pinned, same-origin bridge style with inline GeoJSON. |
| `resources.font` | `{ id, url }` identifying the pinned, same-origin WOFF2 font. |
| `workerUrl` | A same-origin HTTP URL for the installed MapLibre 6.17.0 worker. |

The registration fixes the variant; passing a different variant in input props
does not change its output profile. The fixture defaults resolve
`assets/bridge-style.json`, `assets/Inter-Regular.woff2`, and
`maplibre-gl-worker.mjs` through Remotion's `staticFile` mapping. A prepared
bundle's public directory must supply these files from the fixture's `assets`
directory and `node_modules/maplibre-gl/dist/`, preserving the exact bytes.
The fixture's font license remains alongside its source asset.

Resource URLs identify already resolved bytes; this host does not verify their
content hashes, retrieve new geography, or implement the future job-resource
service. The caller remains responsible for the pinned manifest. Synthetic
fixture asset hashes are checked by the existing schema suite.

## Frame readiness and diagnostics

`useCurrentFrame()` supplies the absolute requested frame to `evaluateFrame`.
The React host owns one fixed-size adapter surface across frame requests. It
remounts for changed resources or dimensions and disposes the surface at the
end of that session. It does not recreate camera, trace, or label calculations.

Each committed request acquires its own Remotion delay handle in a layout
effect, applies the evaluated state, and computes its diagnostic hash. The
handle is released only after the returned request and inspected adapter
readiness match that request. Errors call `cancelRender`; a failed request
does not release its handle as a successful frame. Cleanup releases only the
replaced request's handle and ignores its later asynchronous completion.

The adapter retains its separate 30-second initialization and frame deadlines.
The outer Remotion deadline is 65 seconds with no retry, allowing those typed
failures to arrive first. Deadlines limit waiting; elapsed time does not advance
the animation.

The diagnostic hook is `window.__GSTORY_BRIDGE__`, with `requestedFrame`,
`variantId`, `requestId`, `status`, `stateHash`, and an optional structured
`error`. The element `[data-testid="bridge-frame"]` also exposes requested
frame, variant, request ID, readiness, and hash as data attributes. The hash is
SHA-256 of UTF-8 JSON with recursively sorted object keys and unchanged array
order; a pending request has a null hash. D1-06's Vue hook is absent from this
base, so cross-host hook agreement still needs D1-09 verification.

## Checks and still-render prerequisites

The following scoped checks passed in this attempt:

```sh
npm run lint --workspace @gstory/renderer
npm run typecheck --workspace @gstory/renderer
npm run test:input --workspace @gstory/renderer
```

The still test requires a bundle prepared from the entry point with matching
Remotion 4.0.542 bundling tooling, the public resources above, and an environment
that permits Chromium child processes. The matching bundler is not installed
by this change: it is unavailable in this environment's package cache, and
registry access was blocked during the original worker attempt. The later Windows host run used the matching bundler.
D1-08 still owns the repeatable bundle/video-export command.

After a coordinator prepares a bundle inside the worktree and supplies an
installed browser, run the still acceptance test as follows in PowerShell.
The default bundle location is `.local/renderer-bundle`; the optional bundle
variable must also resolve inside this worktree.

```powershell
$env:GSTORY_REMOTION_BUNDLE = '.local/renderer-bundle'
$env:GSTORY_CHROME = '<absolute path to installed Chromium>'
npm run test:stills --workspace @gstory/renderer
```

This test uses Remotion's `renderStill` for frames 299, 0, and 149, each on an
independent render page, in both compositions. It checks PNG dimensions and
distinct hashes and expects missing-font renders to fail without producing
an output file. A distinct `.local/d1-07-stills/` directory retains its PNGs,
temporary browser data, and result receipt. Review those PNGs visually as well;
these checks do not establish Vue parity or a full-video gate. All test-owned
browser processes close at the end of a run; no background service is started.

See the [D1-07 Windows host verification receipt](../../docs/planning/receipts/D1-07/D1-07-20261113-host.md) for the passing still and missing-font checks.
