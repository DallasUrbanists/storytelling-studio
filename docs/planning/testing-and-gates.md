# Testing and milestone gates

Contributors can use these checks to prove that a saved project produces the
intended editable story and both required videos. The commands in this guide are
proposed contracts; none exists in the planning-only baseline.

- [Command availability](#command-availability)
- [Controller readiness gate](#controller-readiness-gate)
- [Proposed command contracts](#proposed-command-contracts)
- [Local session lifecycle](#local-session-lifecycle)
- [Evidence records](#evidence-records)
- [Gate A: reproducible workspace](#gate-a-reproducible-workspace)
- [Gate B: deterministic render bridge](#gate-b-deterministic-render-bridge)
- [Gate C: saved editor project](#gate-c-saved-editor-project)
- [Gate D: geographic story and exchange](#gate-d-geographic-story-and-exchange)
- [Gate E: defensible research](#gate-e-defensible-research)
- [Gate F: roadway and final film](#gate-f-roadway-and-final-film)
- [Pull-request and release checks](#pull-request-and-release-checks)
- [Failure and recovery](#failure-and-recovery)

## Command availability

D1-01 creates the workspace manifest and lockfile; D1-02 creates the lifecycle
and static-check entry points. Feature issues add the relevant test and render
commands when executable behavior exists. Contributors must inspect
`package.json` and run the documented help or command before changing its status
to available in [implementation status](../implementation-status.md).

An unimplemented test must not be represented by an empty or always-passing
script. A required unavailable command blocks the associated gate; a gate can
only report `passed`, `failed`, or `not run` with evidence and a reason.
Bootstrap can validate implemented subsets, but cannot call them a completed
full gate.

## Controller readiness gate

Continuous unattended execution has a separate development-tool gate. The
[readiness checklist](agent-controller.md#orchestration-readiness-checklist)
and [acceptance exercise](orchestration-activation.md#acceptance-exercise)
require two isolated workers, automatic reassignment, a phone answer on GitHub,
automatic resume, one merge coordinator, bounded retries, and restart recovery.
Controller setup is not an application MVP task or an existing package script.

The activation record must distinguish `dispatchReady` from
`unattendedMergeReady`. Verified workers may run in an explicitly selected
supervised-bootstrap mode through D1-20, while initial integrations receive
coordinator supervision under existing implementation authority. All worker,
decision, isolation, and recovery checks still apply. Full unattended operation
requires the actual target repository's CI and approved protection evidence;
test-repository evidence does not establish that target readiness.

An activation receipt must identify the actual runner version, selected model
and reasoning mapping, approved configuration, execution schedule hash,
authorized owner GitHub IDs, check policy, state location, and tested Windows
account. Credentials and raw authentication files must not enter that receipt.
The receipt must show that ordinary poll and scheduling cycles made no model
calls. A model-generated completion statement does not replace observed state,
remote PR/check evidence, or an independently checked acceptance result.

Failed readiness prevents an unattended-mode claim. A supervised fallback must
be explicit and must preserve all application gates. The controller must not
weaken an application's test requirement to keep its queue moving.

## Proposed command contracts

The following root commands are the canonical contract for future
implementation. Commands run from the repository root in PowerShell or Bash;
the implementation must hide shell-specific process and path handling inside
the scripts.

| Command | Introduced by | Required behavior |
| --- | --- | --- |
| `npm ci` | D1-01 | Install the committed compatible lockfile without changing it |
| `npm run dev` | D1-02 | Start this checkout's studio and loopback service, report readiness and URLs, and retain a checkout-specific process record |
| `npm run dev:status` | D1-02 | Report only this checkout's processes, ports, and readiness; report stopped when none run |
| `npm run dev:stop` | D1-02 | Stop only this checkout's recorded processes and release its ports without deleting project data |
| `npm run check` | D1-02 | Run implemented lint, type, documentation, and required unit checks; fail on missing expected suites after their introducing issues merge |
| `npm run test:docs` | D1-02 | Check local Markdown links, headings, and truthful script references |
| `npm run test:core` | D1-04 | Check schema/evaluator/camera/trace behavior with synthetic fixtures, including invalid input |
| `npm run test:render-contract` | D1-09 | Exercise repeated and shuffled seeks, readiness failures, shared state parity, and image comparison against the pinned environment |
| `npm run render:fixture` | D1-08 | Render the 10-second, 300-frame synthetic fixture at 30 frames per second in both target dimensions, and write a receipt |
| `npm run test:smoke` | D1-19 | Drive create/import/edit/save/reopen/export in the local UI and verify decoded files against the saved revision |
| `npm run test:package` | D2-15 | Check portable archive validation, safe extraction, hash validation, missing assets, and round trip |
| `npm run test:research` | D3-05 | Check synthetic population allocation, provenance, approval invalidation, and later comparability/income cases |
| `npm run test:roadway` | D4-03 | Check dimensional totals, locked widths, infeasibility, segments, and later transition cases |

The `render:fixture` command must accept an optional `--format portrait` or
`--format landscape` argument to render one variant. Its optional `--frames`
argument accepts a comma-separated list of zero-based frame numbers and writes
diagnostic PNG frames without replacing the full-video gate; the contract test
owns the deliberately unsorted seek sequence.

After D1-08 implements and verifies those arguments, a contributor can inspect
five portrait frames with this command.

```sh
npm run render:fixture -- --format portrait --frames 0,1,149,150,299
```

Each invocation must write to a distinct `out/verification/RUN_ID/` directory,
where `RUN_ID` is a generated collision-resistant identifier printed by the
command. The directory must contain `receipt.json`, diagnostic `frames/`, and
any completed `videos/`; partial output must be marked failed and kept separate
from accepted artifacts.

## Local session lifecycle

The following lifecycle becomes runnable only after the introducing issues have
implemented and verified the commands. One-time setup requires the approved
repository checkout, Node 24 LTS and the pinned npm version, the committed
lockfile, compatible Chromium/render dependencies, and the selected local media
inspection binary; D1-01 records exact versions and installation instructions.
No cloud credentials are required for the synthetic fixture.

After bootstrap, the contributor should prepare a new checkout in this order.

1. Run `npm ci` from the repository root and confirm the lockfile is unchanged.
2. Run `npm run check` and inspect its named checks and results.
3. Run `npm run render:fixture` once the renderer issue is merged and verify both
   output dimensions and the receipt.

At the start of each later session, the contributor should run `npm run dev`
and use `npm run dev:status` to confirm both expected services are ready. The
studio URL and loopback service URL must be reported by the scripts, not guessed
from an undocumented port. A failed readiness check must stop dependent browser
tests.

At the end of a session, the contributor should save the active project, stop
the foreground process with Ctrl+C, and run `npm run dev:stop` if managed child
processes remain. The contributor should confirm `npm run dev:status` reports
stopped; projects and saved source assets must persist, while abandoned temporary
render files remain recoverable or are explicitly discarded through the app.

The planning phase creates no running services and requires no shutdown action.

## Evidence records

Every gate receipt must name the issue identifiers, commit, project revision and
content hash, schema/core versions, Node/npm/OS versions, MapLibre/Remotion/
Chromium versions where relevant, font and local asset manifest hashes, command
arguments, status, and missing resources. Render evidence must also retain
requested frame numbers, frame-state hashes, PNG hashes, comparison metrics,
decoded video metadata, and the reviewer's playback notes.

Parallel workers must include attempt ID, worktree, base SHA, proposed tree/diff
hash, and actual checks in their issue-specific completion receipt. The merge
coordinator records the actual head SHA after committing the validated changes,
updates the shared implementation ledger in the same PR, and reruns applicable
checks on the resulting head. Checks and reviews from a previous head must not
be treated as approval of a changed diff.

Contributors should commit small synthetic fixtures and expected results.
Contributors should keep large rendered media and private or restricted source
data outside Git, record content hashes and approved artifact locations, and
attach only cleared evidence to a pull request. A screenshot alone does not
prove a numerical, persistence, or export contract.

## Gate A: reproducible workspace

The gate owner should perform the following checks after D1-01 and D1-02.

1. Verify exact dependency and runtime versions, the lockfile, and the selected
   Remotion and media-binary license record.
2. Confirm the Vue studio cannot import React/Remotion renderer internals and
   shared core code does not depend on the DOM, system clock, network, or storage.
3. Start and stop the local services twice, then confirm no unrelated process
   was stopped and no project data was deleted.
4. Verify a clean checkout can run the implemented static checks without
   secrets, accounts, or undocumented machine state.

Gate A fails if the local workflow requires an unapproved service, uses an
unrecorded executable, or claims a missing script passed. The nonprofit context
does not remove the need to record the license of the actual selected version
and any distribution obligations.

## Gate B: deterministic render bridge

The gate owner must complete this gate before broad editor work. The synthetic
fixture contains a basemap, point, line, polygon, camera movement, line and
outer-ring boundary traces, and animated callout text; the fixture is explicitly
fictional and must never appear as Maple
research evidence.

The gate owner should perform the following checks.

1. Compare the Vue preview and Remotion render at identical project revision,
   frame, viewport, font, and asset inputs using the
   [rendering contract](../architecture/rendering-contract.md).
2. Request frames in order, then in order `299,0,149,1,299`, then repeat the
   same frame after unrelated seeks to detect history-dependent state.
3. Render 1080 × 1920 portrait and 1920 × 1080 landscape videos at 30 frames
   per second, and decode all 300 frames for each 10-second fixture.
4. Compare repeated runs in the same pinned environment and inspect beginning,
   midpoint, end, camera boundaries, text, and traced geometry.
5. Simulate missing tiles, absent fonts, invalid assets, and readiness timeout,
   then confirm explicit failure rather than a blank or partially loaded success.

The gate owner must apply the numerical and image tolerances in the rendering
contract and retain the comparison report. Cross-machine byte-identical MP4
output is not the criterion; deterministic frame state, repeatable pixels under
the same pinned environment, and decoded playback are required.

After plan approval, the specified static-map fallback can be attempted only
within the limits in the
rendering contract, with shared camera evaluation, local cleared assets, and a
declared rendering mode. If neither path passes, the milestone is a documented
rendering spike and blocked editor work, not a successful Day 1 exporter.

## Gate C: saved editor project

The gate owner should import the bounded valid GeoJSON fixture, change focus,
trace timing, labels, and per-variant composition, then save and restart the
local service. The reopened project must preserve every edit, and export must
pin the saved revision even if the user continues editing.

The gate owner should also reject malformed geometry with a usable error,
exercise a stale-revision save conflict without silent overwrite, cancel a
render, recover after an interrupted save, and confirm both output files belong
to the intended revision. The visible export controls, job state, errors,
keyboard access, and aspect-specific safe areas require a UI walkthrough.

## Gate D: geographic story and exchange

The gate owner should build Dallas → Oak Lawn → Maple with more than three
editable focus steps and reordered steps. An editorial Oak Lawn boundary must
carry its editorial label and source note; Downtown, Love Field, and Parkland
must use verified geometry and appropriately framed labels.

The gate owner should verify the following behaviors against saved inputs.

1. Import sourced rail stations, rail/bus routes and stops, and applicable
   GoLink polygons with effective dates, or record a reviewed source-backed
   finding that no GoLink connection applies.
2. Save scene visibility, order, opacity, styles, and Keep visible intervals,
   then reorder/retime scenes, reopen, and verify both render variants.
3. Import a 600-second multi-origin pedestrian-network walkshed and inspect
   barriers, disconnected areas, origin access, and method metadata.
4. Export a `.gstory` archive, import it into a clean data directory, and verify
   editable state, sources, assets, hashes, and deterministic output.
5. Reject path traversal, absolute paths, duplicate entries, unsafe symlinks,
   excessive decompression, unknown schema versions, and mismatched asset hashes.

A transit layer with no verified source must show an explicit unavailable state;
a reviewed finding of nonapplicability is distinct from missing evidence, and
invented routes and polygons do not satisfy the gate. A radius or buffered line
must never be labeled a ten-minute walkshed. A package that depends on an
undisclosed absolute path is not portable.

## Gate E: defensible research

The gate owner should first use small synthetic polygons and counts whose
intersection ratios and totals can be hand-checked. The tests must cover no
overlap, full overlap, partial overlap, holes, invalid geometry, zero or missing
denominators, the selected geodesic area method, overlapping source units, and
missing data.

The real pilot pipeline must follow
[research methods](../architecture/research-methods.md): a source/vintage record,
explicit population universe, network-derived study area, a declared allocation
method, reproducible inputs and rounding, and visible limitations. An estimated
partial allocation must not be described as an exact resident count, and
medians or percentages must not be summed or area-averaged into unsupported
claims.

The gate owner should change a source, study area, method, or parameter after
approving a snapshot and confirm the derived approval becomes stale. Comparable
history must pass geography, universe, method, vintage, and uncertainty checks;
income claims must pass the documented statistical and inflation/comparability
rules before an export can include them as approved facts.

Aerial imagery requires a per-asset rights and acquisition record, actual
coverage, date, attribution, and export/package permission. NAIP and Sentinel-2
are candidate sources, not automatic clearance; unavailable or unsuitable
imagery remains omitted with a recorded reason. Conditional history/imagery and
optional income do not block the first Maple film; the required population
pipeline and any included claim still need their evidence and approval.

## Gate F: roadway and final film

The gate owner should use synthetic dimensions to verify the top-down roadway
solver before importing documented Maple dimensions. The tests must cover an
existing four-lane layout and a proposed two-through-lane plus center-turn-lane
layout, bicycle space, buffers, sidewalks, width locks, segment-specific layouts,
and an infeasible combination that cannot fit its available envelope.

The gate owner should verify the explicit four-to-three band-mapping animation
at every synthetic frame, including finite nonnegative widths, conserved curb
width, ordered cumulative boundaries, exact endpoints, and marking/label
transitions. A wipe or dissolve alone is a partial fallback and cannot pass the
mapped lane-reallocation requirement.

The gate owner should confirm that each longitudinal segment's widths sum to
its declared envelope within the precision contract, locked dimensions remain
fixed, and the renderer never hides a constraint error. Each real dimension
must retain its documented or estimated classification; a conceptual proposal
must not imply an engineered or officially approved design.

The final film gate requires an editable reopened `.gstory` project, integrated
geographic/research/roadway scenes, 1080 × 1920 and 1920 × 1080 decoded videos
at 30 frames per second, captions or equivalent readable narration, source and
imagery credits, and beginning-to-end playback review. Research and rights
approval must match the exact exported revision.

The review should check text clipping, map and roadway legibility, pacing,
audio/caption synchronization when audio exists, transitions, aspect-specific
framing, factual wording, and all labels that distinguish estimates or editorial
boundaries. A polished partial cut does not satisfy the full pilot milestone.

## Pull-request and release checks

The contributor should run static and affected unit checks for every code change
and the relevant integration gates when touching persistence, packaging,
research, or rendering. UI changes need a focused keyboard and visual review;
research and rights changes need their explicit reviewer record.

The proposed continuous integration workflow should run `npm ci`, `npm run
check`, and appropriate deterministic/unit suites on each pull request. A
Windows render job or retained Windows local receipt must verify the target
runtime; a skipped GPU-dependent job must not count as a passed rendering gate.
The initial workflow issue must document which checks are required and which
ones remain manual evidence.

Contributors can merge an authorized implementation pull request only when its
required checks pass, actionable review findings are addressed, documentation
matches behavior, and its human boundaries are satisfied. Contributors must not
disable checks or change branch protections to make a merge possible.

## Failure and recovery

At a failed gate, the owner should preserve the minimal reproduction, pinned
inputs, actual error, and partial outputs, then route the smallest repair issue
using the [model policy](../policies/model-routing-policy.md). The owner should
record the milestone as blocked or partial and continue independent work only
where the dependency graph permits it.

At 60 minutes on an issue, the implementer must reassess, split the remaining
work, and revise the schedule. A failed factual or rights gate requires better
evidence or omission of the affected claim; more model reasoning does not turn
an unsupported fact into an approved result.
