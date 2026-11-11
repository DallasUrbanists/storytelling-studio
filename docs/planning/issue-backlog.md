# Execution backlog and publication procedure

You can use these issue bodies to publish the approved execution backlog and
start a later implementation session without reconstructing the planning chat.
The stable identifiers are local planning IDs; no GitHub issue numbers or pull
requests exist for this backlog until publication occurs.

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

The inspected repository has no established branch or commits, so the first
documentation baseline cannot be opened as an ordinary pull request against an
existing `main`. The lead should recheck remote branches and rules before acting
because another contributor might have initialized the repository after the
inspection.

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

Publication has not occurred in this planning package. The publisher should
replace this paragraph with the actual stable-ID → issue-URL map after P02 and
record failures explicitly; fabricated issue numbers and placeholder URLs are
not acceptable.
