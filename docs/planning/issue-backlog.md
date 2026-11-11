# Execution backlog and publication procedure

You can use these issue bodies to understand the approved execution backlog and
start a later implementation session without reconstructing the planning chat.
The stable planning IDs are mapped to published GitHub issues in the
[identifier map](#github-identifier-map); [implementation status](../implementation-status.md)
records publication progress and verified work.

- [Read an issue](#read-an-issue)
- [Inherited controller metadata](#inherited-controller-metadata)
- [Queue and capacity](#queue-and-capacity)
- [Publish the approved backlog](#publish-the-approved-backlog)
- [Publication work items](#publication-work-items)
    - [P01: publish the approved documentation baseline](#p01-publish-the-approved-documentation-baseline)
    - [P02: create and crosslink the execution issues](#p02-create-and-crosslink-the-execution-issues)
    - [P03: audit the published handoff and end planning](#p03-audit-the-published-handoff-and-end-planning)
- [Start and close implementation work](#start-and-close-implementation-work)
- [Optional follow-up work](#optional-follow-up-work)
    - [X-01: evaluate one local network-walkshed generation path](#x-01-evaluate-one-local-network-walkshed-generation-path)
    - [X-02: evaluate one additional imagery or historical source](#x-02-evaluate-one-additional-imagery-or-historical-source)
- [GitHub identifier map](#github-identifier-map)

## Read an issue

Each body contains a concrete objective in its title, preferred model, reasoning
level, target time, dependencies, expected files, ordered steps, acceptance,
tests, documentation change, and stop condition. Expected paths describe files
to create or edit during implementation; they do not claim those files exist.
All package commands remain unavailable until their introducing issue verifies
them under [testing and gates](testing-and-gates.md).

The publishing lead should use the title `[ID] Title`, copy the complete body,
and add the milestone and labels from the following convention. The lead should
include the relevant day runbook and canonical contract links in the published
body so that it can stand alone.

| Field | Convention |
| --- | --- |
| Milestone | `Day 1 — 2026-11-11`, `Day 2 — 2026-11-12`, `Day 3 — 2026-11-13`, or `Day 4 — 2026-11-14` |
| Type | `type:implementation`, `type:research`, `type:verification`, or `type:documentation` according to the body |
| Model | `model:terra` or `model:sol`; reasoning stays explicit in the body |
| Priority | `priority:critical-path` for a gate dependency; `priority:parallel` for an independent lane; `priority:optional` for X items |
| State | Open until accepted and merged, with `blocked` plus the named dependency when necessary |
| Evidence | Actual command/manual procedure, result, environment, revision, and artifact receipt |

The target is a focused 15–45 minute slice, not a promise that a new unknown can
be solved in that time. At 60 minutes, the implementer must split remaining
scope into a new stable ID, link it, and revise the forecast; tests, review,
documentation, and integration must not disappear from the estimate.

## Inherited controller metadata

All 81 issue bodies inherit their exact dispatch row from
[the deterministic execution schedule](execution-schedule.md), plus the worker,
receipt, decision, and merge rules in [the controller design](agent-controller.md).
The existing bodies remain the acceptance contract; the schedule supplies
`requiresAll`, `requiresAny`, stream, model/reasoning, priority, write leases, and
conditional-branch predicates without inventing additional feature scope.

The publisher should append each schedule row and the controller-rule links to
the complete GitHub issue body. The inherited worker instruction is explicit:
use the assigned isolated branch/worktree and write leases, submit a durable
issue-specific receipt, and never merge or close the issue as completed.
Only the single merge coordinator can accept and integrate the final checked
head, update shared records, and release dependent work.

Expected-file and documentation-update fields that name shared status, indexes,
the Maple ledger, or architecture/policy documents mean the worker must supply a
proposed delta in its receipt. The coordinator applies the reviewed canonical
documentation update to the same pull request before merge; those paths are not
an instruction for every concurrent worker to edit shared files directly.

Controller activation is separately scoped in
[orchestration activation](orchestration-activation.md). The product estimates
remain unchanged, and no issue authorizes building an orchestrator into the app.
After the later implementation kickoff and approved activation, ordinary ready
workers can start automatically; scoped human questions go to GitHub, only the
affected dependency closure waits, and valid answers trigger automatic resumption.

## Queue and capacity

The following files contain the complete issue bodies. The target totals are
the arithmetic sum of the body estimates, before extra integration/review time,
external waits, or issue splits.

| Queue | Issue IDs | Count | Target total |
| --- | --- | --- | --- |
| [Day 1 bodies](issues-day-1.md) | D1-01 through D1-20 | 20 | 810 minutes / 13.5 hours |
| [Day 2 bodies](issues-day-2.md) | D2-00 through D2-19 | 20 | 750 minutes / 12.5 hours |
| [Day 3 bodies](issues-day-3.md) | D3-01 through D3-19 | 19 | 675 minutes / 11.25 hours |
| [Day 4 bodies](issues-day-4.md) | D4-01 through D4-22 | 22 | 855 minutes / 14.25 hours |
| All planned implementation items | D1–D4 | 81 | 3,090 minutes / 51.5 hours |
| First-film path | All except D3-10–D3-13 and D3-15/D3-16 | 75 | 2,880 minutes / 48 hours |

Publication work adds about one hour after approval. A 25–40% allowance gives
roughly 64–73 contributor-hours for all planned work or 60–68 hours for the
first-film path, before long source or render waits;
[risks and critical path](risks-and-critical-path.md) explains why two contributors
in four eight-hour days have little margin.

D3-10 through D3-13 form the conditional history/income capability branch, and
D3-15/D3-16 form the conditional imagery branch. The publisher should label those
six issues `scope:conditional`; unsupported history or imagery can be omitted
with documented reasons, and income is optional for the first Maple film.
All 81 bodies can be published without making every branch a first-film gate.

The lead should preserve the approved IDs when splitting work, using a suffix
such as `D1-09A` for a concrete follow-up rather than renumbering already
published issues. A source-acquisition issue can record a useful blocked
outcome, but an unmet production requirement must remain open in its gate or
linked follow-up; it must not vanish because an importer passed synthetic tests.

## Publish the approved backlog

The user must approve publication of this concrete planning package before the
lead performs any step in this section. Publication approval authorizes the
documentation commit/push and issue creation only; the planning session ends
after the publication audit. Application implementation requires a later
explicit kickoff or implementation session.

At the initial inspection, the repository had no established branch or commits,
so the first documentation baseline could not be opened as an ordinary pull
request against an existing `main`. The baseline has since been published; see
[implementation status](../implementation-status.md) for the record. The lead
should recheck remote branches and rules before acting because repository state
can change after an inspection.

After publication approval, the lead should complete these steps in order.

1. Recheck the local files, remote repository, default branch, branches, and
   applicable rules; resolve any unexpected existing history through a normal
   fetched checkout instead of overwriting it.
2. Review the documentation-only file list, links, source attribution, and
   phase boundaries, then complete P01 using a normal initial `main` commit only
   if the remote remains empty and its rules permit the approved bootstrap.
3. Create the four date-labeled milestones and useful labels, then publish P02's
   complete issue bodies with dependency links and stable IDs.
4. Record the actual issue URLs and commit, publish that documentation update
   through a normal documentation pull request against the established `main`,
   and complete P03 without starting application work.

If repository rules block the initial commit, the lead must ask the owner to
provide an approved bootstrap route. The lead must not change permissions,
disable rules, force-push, or invent a pull request base. Once `main` exists,
all implementation changes follow feature branches and pull requests.

## Publication work items

### P01: publish the approved documentation baseline

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 15 minutes.

**Dependencies:** explicit user approval to publish the reviewed package.

**Expected files:** `README.md`, `AGENTS.md`, `LICENSE`,
`THIRD_PARTY_NOTICES.md`, `docs/`, and `LICENSES/`; the
publisher should stage only reviewed planning and attribution files.

The publisher should complete the following bounded procedure.

1. Recheck that the local directory and remote remain without Git history, and
   verify the documented remote and branch rules.
2. Initialize a normal `main` history only for that still-empty state, stage the
   reviewed documents explicitly, and inspect the staged diff for unrelated or
   sensitive files.
3. Create the approved documentation commit and push it normally, then record
   the actual commit URL and branch.

**Acceptance:** the published baseline matches the approved local planning
package and contains no application scaffold or dependency installation.

**Tests:** check Markdown links/anchors, whitespace, file scope, attribution, and
the published tree; use `git diff --check` once Git exists.

**Documentation update:** record the actual baseline commit and publication
state in implementation status.

**Stop condition:** stop for unexpected history, absent publication approval,
restricted bootstrap, or unrelated changes; never force-push or change rules.
Reassess remaining scope at 60 minutes.

### P02: create and crosslink the execution issues

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 30 minutes.

**Dependencies:** P01.

**Expected files:** `docs/planning/issue-backlog.md` and the four issue-body files;
GitHub milestones, labels, and issue bodies are the approved publication output.

The publisher should complete the following bounded procedure.

1. Search existing issues for each stable identifier to avoid duplicates, then
   create the four milestones and necessary labels if missing.
2. Publish all 81 planned implementation bodies with the exact model,
   reasoning, dependencies, expected files, steps, acceptance, tests,
   documentation update, and stop condition.
3. Resolve stable-ID dependencies to actual issue links and append each exact
   schedule row plus controller/runbook links without replacing the complete
   bodies with summaries.

**Acceptance:** the planned backlog is complete and its dependencies resolve;
conditional branches and optional X items are clearly distinguished from the
first-film path and the four-day target.

**Tests:** compare published IDs, titles, fields, milestone assignments, and
dependency edges with the local files; inspect representative full bodies.

**Documentation update:** fill the identifier map with actual issue URLs and
record any failed publication attempts for safe retry.

**Stop condition:** stop and preserve the successful ID map if publication is
partial or permission fails; do not duplicate already created issues or start
implementation. Reassess remaining scope at 60 minutes.

### P03: audit the published handoff and end planning

**Preferred model:** GPT-6.1 Terra. **Reasoning:** medium. **Target:** 15 minutes.

**Dependencies:** P02.

**Expected files:** `docs/implementation-status.md`,
`docs/planning/issue-backlog.md`, and the published planning baseline.

The publisher should complete the following bounded procedure.

1. Verify that all actual issue links, dependencies, model assignments, and
   milestone dates match the approved package.
2. Record the published document commit, actual issue URL map, unresolved
   decisions, and first eligible work, then commit/push that documentation-only
   update through a reviewed passing pull request against `main`.
3. Finish the planning/publication session with the verified publication result
   and no application changes.

**Acceptance:** a later implementer can follow the handoff, and no future command
or feature is presented as already implemented.

**Tests:** rerun the documentation audit and compare the published backlog with
all local issue IDs.

**Documentation update:** set planning publication to verified with actual
evidence while keeping application capabilities planned.

**Stop condition:** stop for missing issue bodies, broken dependency links, or
misleading implementation claims. Reassess remaining scope at 60 minutes.

## Start and close implementation work

A later implementation session must begin with the user's explicit kickoff and
the relevant [runbook](README.md), [AGENTS.md](../../AGENTS.md), and
[model policy](../policies/model-routing-policy.md). That kickoff authorizes
ordinary worker edits and tests plus coordinator-owned branches, commits,
pushes, pull requests, passing merges, and issue closure; it does not
substitute for approval of actual controller capabilities and credential scopes.

After controller activation, deterministic code selects an eligible issue and
assigns an isolated worktree/branch, attempt, scoped leases, and the preferred
Terra or Sol model. The worker should complete the issue's tests and proposed
documentation delta before requesting a specific human security, licensing,
permission, factual, or architecture decision on a concrete reviewable result.

The reviewer should inspect the acceptance evidence and actual changes rather
than the presence of a checkmark. The coordinator alone can merge when required
checks pass on the final head, review findings are resolved, and scoped human
approvals match the evidence; it then closes the issue, records acceptance, and
updates the capability ledger through the same-pull-request procedure.

Initial integration through D1-20 uses the explicit supervised-bootstrap mode
because the empty repository has no established implementation CI guards.
Unattended merging starts only after the actual target repository's required
checks, protection, and current-base guards pass the activation evidence; a
test-repository rehearsal alone does not establish that authority or readiness.

For a blocked issue, the worker should leave the exact dependency, failed
evidence, next repair/acquisition step, and scoped GitHub question when needed.
The controller must persist that state, continue independent eligible work, and
resume the affected work after a valid authorized answer; workers must not
bypass checks, change branch rules, invent missing facts, or report a partial cut
as the full pilot.

## Optional follow-up work

These bounded evaluations are separate from the required sprint. They must not
delay the imported-network baseline or first defensible population pipeline.

### X-01: evaluate one local network-walkshed generation path

**Preferred model:** GPT-6.1 Sol. **Reasoning:** high. **Target:** 45 minutes.

**Dependencies:** D2-00, D2-10, D2-12; owner selection of this optional work.

**Expected files:** `docs/architecture/research-methods.md` and a small synthetic
comparison fixture under `tests/fixtures/walkshed/`.

The implementer should test one local algorithm/tool against the already
reviewed graph, origins, duration, and assumptions, compare the synthetic
reachability cases, and write a bounded implementation recommendation. The
implementer should split any production generator into separately estimated
issues; this evaluation does not authorize a general routing engine.

**Acceptance:** the recommendation includes actual reproducibility,
barrier behavior, limitations, dependency/license evidence, and an independent
comparison; failure is a valid evaluation result but not a completed generator.

**Tests:** reproduce the synthetic reachability cases with the candidate tool,
compare the reachable edges and barrier behavior against the reviewed baseline,
and record the tool version, inputs, procedure, and differences.

**Documentation update:** record the evidence and proposed follow-up scope.

**Stop condition:** stop at missing source/tool evidence or the 60-minute
reassessment; keep the external import path as the required baseline.

### X-02: evaluate one additional imagery or historical source

**Preferred model:** GPT-6.1 Terra. **Reasoning:** high. **Target:** 30 minutes.

**Dependencies:** D3-11 or D3-15; owner selection of this optional work.

**Expected files:** the Maple evidence ledger and the corresponding local source
manifest; no unrelated data catalog or application redesign is included.

The implementer should inspect one named candidate source, preserve its metadata
and rights, and run the applicable comparability or imagery-clearance checklist.
The implementer should route statistical or geospatial uncertainty to Sol with
the exact evidence rather than widening the source search indefinitely.

**Acceptance:** the candidate is accepted for a specific reviewed use
or rejected with a concrete reason; no unsupported image or historical claim is
added to the film.

**Tests:** apply the existing historical-comparability or imagery-clearance
checklist to the candidate, retain the source evidence for each result, and
verify that any accepted use matches the scope of its review.

**Documentation update:** record the actual candidate, decision, and remaining
requirement.

**Stop condition:** stop for unresolved rights, incompatible geography/period,
or the 60-minute reassessment; do not substitute a new claim silently.

## GitHub identifier map

The approved 81-item backlog was published on November 11, 2026. Each issue
contains its complete source body, actual dependency links, and exact dispatch
row. All issues are open and labeled `status:awaiting-kickoff`; publication does
not authorize application or controller execution.

P01–P03 are publication work records rather than GitHub implementation issues.
The [publication receipt](../implementation-status.md#publication-record)
records P03's external prerequisite. X-01 and X-02 remain optional proposals in
this document and were not added to the four-day execution queue.

| Stable ID | GitHub issue | Preferred model | Scope |
| --- | --- | --- | --- |
| D1-01 | [#1: Pin the minimal workspace and rendering toolchain](https://github.com/DallasUrbanists/storytelling-studio/issues/1) | terra | First film |
| D1-02 | [#2: Create checkout-scoped lifecycle and static-check scripts](https://github.com/DallasUrbanists/storytelling-studio/issues/2) | terra | First film |
| D1-03 | [#3: Define the minimum versioned project and synthetic fixture](https://github.com/DallasUrbanists/storytelling-studio/issues/3) | terra | First film |
| D1-04 | [#4: Implement pure frame, camera, trace, and label evaluation](https://github.com/DallasUrbanists/storytelling-studio/issues/4) | sol | First film |
| D1-05 | [#5: Build one MapLibre frame adapter with explicit readiness](https://github.com/DallasUrbanists/storytelling-studio/issues/5) | sol | First film |
| D1-06 | [#6: Mount the shared fixture in a Vue preview harness](https://github.com/DallasUrbanists/storytelling-studio/issues/6) | terra | First film |
| D1-07 | [#7: Mount the shared fixture in a Remotion composition](https://github.com/DallasUrbanists/storytelling-studio/issues/7) | sol | First film |
| D1-08 | [#8: Render and decode the synthetic fixture in both formats](https://github.com/DallasUrbanists/storytelling-studio/issues/8) | sol | First film |
| D1-09 | [#9: Prove Vue-to-Remotion parity before editor expansion](https://github.com/DallasUrbanists/storytelling-studio/issues/9) | sol | First film |
| D1-10 | [#10: Create the minimal Quasar authoring shell](https://github.com/DallasUrbanists/storytelling-studio/issues/10) | terra | First film |
| D1-11 | [#11: Import bounded GeoJSON with usable validation errors](https://github.com/DallasUrbanists/storytelling-studio/issues/11) | sol | First film |
| D1-12 | [#12: Edit a camera focus with variant-specific framing](https://github.com/DallasUrbanists/storytelling-studio/issues/12) | terra | First film |
| D1-13 | [#13: Edit line and boundary trace timing and appearance](https://github.com/DallasUrbanists/storytelling-studio/issues/13) | terra | First film |
| D1-14 | [#14: Edit animated labels and safe-area placement](https://github.com/DallasUrbanists/storytelling-studio/issues/14) | terra | First film |
| D1-15 | [#15: Implement the narrow loopback service boundary](https://github.com/DallasUrbanists/storytelling-studio/issues/15) | sol | First film |
| D1-16 | [#16: Save immutable SQLite revisions with conflict recovery](https://github.com/DallasUrbanists/storytelling-studio/issues/16) | sol | First film |
| D1-17 | [#17: Wire local project save and open controls](https://github.com/DallasUrbanists/storytelling-studio/issues/17) | terra | First film |
| D1-18 | [#18: Run cancellable render jobs against a saved revision](https://github.com/DallasUrbanists/storytelling-studio/issues/18) | sol | First film |
| D1-19 | [#19: Expose export controls and prove the complete local flow](https://github.com/DallasUrbanists/storytelling-studio/issues/19) | terra | First film |
| D1-20 | [#20: Record Day 1 evidence and wire required checks](https://github.com/DallasUrbanists/storytelling-studio/issues/20) | terra | First film |
| D2-00 | [#21: Stage the external GIS tool and dated pedestrian graph](https://github.com/DallasUrbanists/storytelling-studio/issues/21) | terra | First film |
| D2-01 | [#22: Extend scenes to an ordered list of focus steps](https://github.com/DallasUrbanists/storytelling-studio/issues/22) | sol | First film |
| D2-02 | [#23: Add, duplicate, reorder, and delete focus steps](https://github.com/DallasUrbanists/storytelling-studio/issues/23) | terra | First film |
| D2-03 | [#24: Fit camera extents independently for both output variants](https://github.com/DallasUrbanists/storytelling-studio/issues/24) | sol | First film |
| D2-04 | [#25: Prepare verified Dallas, Oak Lawn, Maple, and landmark sources](https://github.com/DallasUrbanists/storytelling-studio/issues/25) | terra | First film |
| D2-05 | [#26: Normalize one verified transit dataset into project layers](https://github.com/DallasUrbanists/storytelling-studio/issues/26) | sol | First film |
| D2-06 | [#27: Expose transit layer groups and source details](https://github.com/DallasUrbanists/storytelling-studio/issues/27) | terra | First film |
| D2-07 | [#28: Import and label verified GoLink service polygons](https://github.com/DallasUrbanists/storytelling-studio/issues/28) | terra | First film |
| D2-08 | [#29: Persist layer visibility and Keep visible intervals across scenes](https://github.com/DallasUrbanists/storytelling-studio/issues/29) | terra | First film |
| D2-09 | [#30: Trace verified routes with geometry-aware progress](https://github.com/DallasUrbanists/storytelling-studio/issues/30) | sol | First film |
| D2-10 | [#31: Acquire one reproducible 600-second pedestrian-network walkshed](https://github.com/DallasUrbanists/storytelling-studio/issues/31) | sol | First film |
| D2-11 | [#32: Validate and import network walkshed packages](https://github.com/DallasUrbanists/storytelling-studio/issues/32) | terra | First film |
| D2-12 | [#33: Review the real walkshed's corridor access and barriers](https://github.com/DallasUrbanists/storytelling-studio/issues/33) | sol | First film |
| D2-13 | [#34: Add the walkshed overlay to saved story scenes](https://github.com/DallasUrbanists/storytelling-studio/issues/34) | terra | First film |
| D2-14 | [#35: Write portable project archives with a complete asset manifest](https://github.com/DallasUrbanists/storytelling-studio/issues/35) | terra | First film |
| D2-15 | [#36: Validate archive safety before extraction](https://github.com/DallasUrbanists/storytelling-studio/issues/36) | sol | First film |
| D2-16 | [#37: Import validated archives atomically with asset hash checks](https://github.com/DallasUrbanists/storytelling-studio/issues/37) | sol | First film |
| D2-17 | [#38: Prove portable round trip in a clean data directory](https://github.com/DallasUrbanists/storytelling-studio/issues/38) | terra | First film |
| D2-18 | [#39: Assemble the sourced Dallas-to-Maple geographic sequence](https://github.com/DallasUrbanists/storytelling-studio/issues/39) | terra | First film |
| D2-19 | [#40: Record the geographic and portable-project gate](https://github.com/DallasUrbanists/storytelling-studio/issues/40) | sol | First film |
| D3-01 | [#41: Extend source, method, and result provenance records](https://github.com/DallasUrbanists/storytelling-studio/issues/41) | terra | First film |
| D3-02 | [#42: Acquire and map the selected ACS population and boundary snapshot](https://github.com/DallasUrbanists/storytelling-studio/issues/42) | sol | First film |
| D3-03 | [#43: Bind research runs to the reviewed study-area snapshot](https://github.com/DallasUrbanists/storytelling-studio/issues/43) | terra | First film |
| D3-04 | [#44: Compute bounded polygon intersections and geodesic areas](https://github.com/DallasUrbanists/storytelling-studio/issues/44) | sol | First film |
| D3-05 | [#45: Allocate one population measure across partial overlaps](https://github.com/DallasUrbanists/storytelling-studio/issues/45) | sol | First film |
| D3-06 | [#46: Aggregate allocated population with reproducible rounding and diagnostics](https://github.com/DallasUrbanists/storytelling-studio/issues/46) | sol | First film |
| D3-07 | [#47: Run the bounded population analysis as a local job](https://github.com/DallasUrbanists/storytelling-studio/issues/47) | terra | First film |
| D3-08 | [#48: Display research results with source and limitation details](https://github.com/DallasUrbanists/storytelling-studio/issues/48) | terra | First film |
| D3-09 | [#49: Record explicit review and invalidate stale research approvals](https://github.com/DallasUrbanists/storytelling-studio/issues/49) | sol | First film |
| D3-10 | [#50: Enforce historical comparability before calculating change](https://github.com/DallasUrbanists/storytelling-studio/issues/50) | sol | Conditional |
| D3-11 | [#51: Find one defensible historical comparator or record its absence](https://github.com/DallasUrbanists/storytelling-studio/issues/51) | terra | Conditional |
| D3-12 | [#52: Enforce valid income measures and comparisons](https://github.com/DallasUrbanists/storytelling-studio/issues/52) | sol | Conditional |
| D3-13 | [#53: Prepare one income source snapshot for review](https://github.com/DallasUrbanists/storytelling-studio/issues/53) | sol | Conditional |
| D3-14 | [#54: Render research cards from approved snapshot references](https://github.com/DallasUrbanists/storytelling-studio/issues/54) | terra | First film |
| D3-15 | [#55: Review one candidate aerial image for rights and usefulness](https://github.com/DallasUrbanists/storytelling-studio/issues/55) | terra | Conditional |
| D3-16 | [#56: Import one cleared georeferenced image for deterministic scenes](https://github.com/DallasUrbanists/storytelling-studio/issues/56) | sol | Conditional |
| D3-17 | [#57: Run and review the first real Maple population result](https://github.com/DallasUrbanists/storytelling-studio/issues/57) | sol | First film |
| D3-18 | [#58: Assemble approved population and conditional research scenes](https://github.com/DallasUrbanists/storytelling-studio/issues/58) | terra | First film |
| D3-19 | [#59: Record the research mechanism gate and real-content status](https://github.com/DallasUrbanists/storytelling-studio/issues/59) | sol | First film |
| D4-01 | [#60: Define roadway bands, dimensions, and provenance fields](https://github.com/DallasUrbanists/storytelling-studio/issues/60) | terra | First film |
| D4-02 | [#61: Implement a width solver that preserves locked dimensions](https://github.com/DallasUrbanists/storytelling-studio/issues/61) | sol | First film |
| D4-03 | [#62: Add meaningful roadway constraint tests](https://github.com/DallasUrbanists/storytelling-studio/issues/62) | sol | First film |
| D4-04 | [#63: Render top-down roadway bands and readable dimensions](https://github.com/DallasUrbanists/storytelling-studio/issues/63) | terra | First film |
| D4-05 | [#64: Add editable four-lane and three-lane concept presets](https://github.com/DallasUrbanists/storytelling-studio/issues/64) | terra | First film |
| D4-06 | [#65: Edit band widths, order, types, and locks](https://github.com/DallasUrbanists/storytelling-studio/issues/65) | terra | First film |
| D4-07 | [#66: Represent longitudinal segments with varying roadway layouts](https://github.com/DallasUrbanists/storytelling-studio/issues/66) | sol | First film |
| D4-08 | [#67: Edit and inspect roadway segment ranges](https://github.com/DallasUrbanists/storytelling-studio/issues/67) | terra | First film |
| D4-09 | [#68: Render variable segments in a continuous top-down roadway view](https://github.com/DallasUrbanists/storytelling-studio/issues/68) | sol | First film |
| D4-10 | [#69: Animate a mapped four-to-three-lane reallocation by frame](https://github.com/DallasUrbanists/storytelling-studio/issues/69) | sol | First film |
| D4-11 | [#70: Edit roadway transformation timing and annotations](https://github.com/DallasUrbanists/storytelling-studio/issues/70) | terra | First film |
| D4-12 | [#71: Attach source evidence and uncertainty to each roadway dimension](https://github.com/DallasUrbanists/storytelling-studio/issues/71) | terra | First film |
| D4-13 | [#72: Verify the Maple segment dimensions or record bounded estimates](https://github.com/DallasUrbanists/storytelling-studio/issues/72) | sol | First film |
| D4-14 | [#73: Persist roadway edits in projects and portable archives](https://github.com/DallasUrbanists/storytelling-studio/issues/73) | terra | First film |
| D4-15 | [#74: Integrate roadway scenes into the shared renderer](https://github.com/DallasUrbanists/storytelling-studio/issues/74) | sol | First film |
| D4-16 | [#75: Author the reviewed Maple roadway transformation](https://github.com/DallasUrbanists/storytelling-studio/issues/75) | terra | First film |
| D4-17 | [#76: Assemble the full geographic, research, and roadway story](https://github.com/DallasUrbanists/storytelling-studio/issues/76) | terra | First film |
| D4-18 | [#77: Add captions, source credits, and final variant-specific framing](https://github.com/DallasUrbanists/storytelling-studio/issues/77) | terra | First film |
| D4-19 | [#78: Obtain final factual, dimension, and rights review of the pinned revision](https://github.com/DallasUrbanists/storytelling-studio/issues/78) | sol | First film |
| D4-20 | [#79: Render and decode both final video variants](https://github.com/DallasUrbanists/storytelling-studio/issues/79) | sol | First film |
| D4-21 | [#80: Review full playback and reopen the final portable project](https://github.com/DallasUrbanists/storytelling-studio/issues/80) | terra | First film |
| D4-22 | [#81: Close the sprint with accurate guides and delivery evidence](https://github.com/DallasUrbanists/storytelling-studio/issues/81) | terra | First film |
