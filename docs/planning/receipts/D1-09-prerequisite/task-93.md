# Storytelling Studio #93 synthetic fixture prerequisite

The shared schema, evaluator, and SVG adapter implement the bounded fixture
change locally. Deterministic and static checks pass; the repaired Chromium
suite is **blocked by the environment**, so this receipt does not establish Gate B,
cross-host pixel parity, or permission to begin broad authoring.

The attempt ran on November 13, 2026, in isolated worktree `task-93`, branch
`orchestrator/task-93`, based on `cf1be995073e276f63aae34709aaf893bc4c2dbb`.
Changes remain uncommitted for coordinator review. No worker commit, independent
review, integration acceptance, or human visual review is claimed.

## Implemented slice

The optional scene field `outsideDimming` references a saved polygon revision
and a finite opacity in `[0, 1]`. Evaluation copies and freezes every ring,
independently of trace progress and feature-layer visibility, and clears the
effect in scenes without that field. The SVG draws the even-odd complement
above the basemap and below all feature layers: the polygon body is undimmed,
and interior holes receive the outside dim. Existing polygon fill and trace
behavior and stable feature-layer order are retained.

The optional annotation field `leaderLine.offset` supplies two finite, signed
output-pixel values whose distance exceeds seven pixels, beyond the anchor
dot. The adapter draws white casing and dark leader ink between the anchor
and text position. The entire annotation shares the existing fade opacity.
Documents omitting both new fields retain their previous behavior.

The synthetic project dims outside `area-revision` at opacity 0.45 throughout
the scene and adds `fictional-point-label` at the saved point `[0, 0]`, with
offset `[100, -70]`. Its fade interval is frames 30 through 269. Both existing
Vue and Remotion hosts consume these inputs through their shared evaluator
and adapter; no host implementation, settings, approval controls, font bytes,
or asset hashes were changed. Full parity comparison and authoring remain
with their owning issues.

Changes are limited to `packages/project-schema`, `packages/story-core`,
`packages/map-adapter`, the synthetic fixture, focused tests in `tests/core`,
`tests/project-schema`, `tests/map-adapter`, and this receipt directory.
`verification.json` records the precise source-file hashes, fixture revision,
frame-state hashes, asset manifest, environment, and check outcomes.

## Verification

The following checks passed on Windows, Node 24.22.1 and npm 11.19.1.

| Command | Observed result |
| --- | --- |
| `node --test --test-isolation=none tests/core/*.test.mjs tests/project-schema/*.test.mjs` | 60 tests passed, including asset hashes, shuffled/repeated seeks, dim rings, scene reset, immutable leader offsets, fade boundaries, and invalid inputs |
| `node --test --test-isolation=none tests/renderer/input.test.mjs` | Two existing render-input and state-hash tests passed |
| `node node_modules/eslint/bin/eslint.js packages --ext .ts` | Passed |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `node node_modules/typescript/bin/tsc --noEmit -p apps/renderer/tsconfig.json` | Passed |
| Strict adapter command below | Passed |
| `node scripts/check-docs.mjs` | Passed after receipt creation |
| `node --check` for the three changed/new browser test modules | Passed; syntax only |
| `git diff --check` | Passed |

The strict adapter command checked its imported schema and evaluator too.

```powershell
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --lib es2022,dom,dom.iterable packages/map-adapter/src/mount.ts
```

The initial offline dependency install failed at esbuild's postinstall with
`spawn EPERM`. A subsequent local
`npm ci --offline --ignore-scripts --cache .local/npm-cache --no-audit --no-fund`
installed 477 pinned packages for static checks without running install
scripts. This is not a successful normal install or proof of working build
binaries; the lockfile is unchanged. The copied cache and npm logs remain
inside ignored `.local/npm-cache/`.

The focused Chromium command was attempted with the installed Chrome executable
(file version 157.0.8103.52), existing `swangle` settings, and temporary files
redirected inside the worktree. All three parent tests failed before exercising
the rendering assertions: the adapter and Vue tests at Chromium process launch
with `spawn EPERM`, and the Remotion test at esbuild process launch with the same
error. The earlier attempt before dependencies were available failed module
resolution; it supplied no browser evidence either.

The new browser assertions cover mask/body/hole raster samples, visible leader
ink, layer order, loaded fonts, both fixed dimensions, scene reset, and shuffled
seeks. The Vue regression includes frame 149's dim and cased point leader.
The Remotion check bundles the existing entry point and requests frame 149
in each registered composition, retaining PNG hashes when successful. These
assertions have not passed in Chromium in this attempt.

The failed Remotion receipt and partial bundle are retained at
`.local/d1-09-prerequisite/33d91d74-9527-4f4e-adfe-c6e90846d110/`.
That initial attempt produced no PNG, video, or pixel comparison.
Host permissions and approval controls remain intact; no elevated retry or
sandbox bypass was attempted.

## Bounded repair after host verification

The worktree also retained a subsequent host check in
`.local/fixture-effects-boFuUm/chromium-checks.log`. That log records a passing
Remotion test and failed adapter/Vue checks. The adapter's first case exhausted
the overall 90-second runner deadline; the Vue page exhausted its 30-second
navigation deadline. The adapter's later closed-target failures followed the
parent timeout and do not establish failures in the dim/leader assertions.
The log shows Vue dependency optimization during startup. It does not establish
the root cause of either timeout.

This repair gives each Vite diagnostic server a fresh cache under
`.local/d1-09-prerequisite/`. The native ESM adapter graph disables dependency
discovery; the Vue test explicitly includes Vue, Quasar, and MapLibre with
discovery disabled. This avoids sharing mutable optimizer output or discovering
MapLibre after navigation starts. Adapter case-start diagnostics identify the
active case in a future host log. Application host code, graphics settings,
readiness deadlines, assertion thresholds, and approval controls are unchanged.
These harness changes still require a passing host rerun; they are not a proven
resolution of the retained host timeouts.

The retained Remotion receipt and PNGs are in
`.local/d1-09-prerequisite/53862cdf-bd1e-4d20-ad58-b41f0195ef36/`.
The repair inspected both frame-149 images and verified their file hashes
against that receipt. Both show outside dimming, a clear filled polygon body,
and a readable point label with a white-cased leader. This is an author visual
inspection of retained artifacts, not human approval or a Vue/Remotion pixel
comparison. The retained host version probe reports Chromium 156.0.8078.4;
it must not be conflated with the initial attempt's executable file version.

The repair reran all 60 core/schema tests and both renderer input/hash tests:
all passed. Package lint, root and renderer TypeScript checks, strict adapter
TypeScript checking, browser-module syntax checks, and documentation checks
passed. The URL-based temporary cache creation was also exercised successfully.
The final focused browser command below failed before any rendering assertion:
Chromium launch returned `spawn EPERM` for adapter and Vue; Remotion bundling
returned `spawn EPERM` for esbuild. Its log is retained at
`.local/d1-09-prerequisite/repair-chromium.log`, with a failed Remotion receipt
under `.local/d1-09-prerequisite/f39d801c-4a85-4170-8e18-3d06ed3b5a7a/`.
No host permission or sandbox setting was changed. The remaining technical
blocker in this attempt is the environment; prior host timeouts remain open
until a coordinator reruns the repaired harness.

## Coordinator handoff

Status: **Implemented, browser verification blocked**. The next eligible action
for this prerequisite is a coordinator-approved host check in an environment
that permits the normal install, esbuild, and Chromium child processes.
Reinstall the pinned lockfile normally there and set `GSTORY_CHROME` to the
installed Chromium executable; retain the same existing `swangle` setting.

Run the focused host checks from the worktree root after that setup.

```powershell
$env:TEMP = Join-Path (Get-Location) '.local/browser-tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
node --test --test-isolation=none --test-concurrency=1 tests/map-adapter/bridge.test.mjs tests/map-adapter/vue-preview.test.mjs tests/map-adapter/remotion-fixture.test.mjs
```

Inspect the two retained frame-149 PNGs for a clear polygon interior,
outside dimming, and the readable point label/leader. Only after this
prerequisite is accepted can its owning parity issue use the extended fixture;
the complete Gate B comparison and export procedure remain outstanding.
No human decision key is needed for this tooling blocker.
