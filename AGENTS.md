# Contributor and agent instructions

## Integrated delivery direction, November 13, 2026

The repository owner replaced issue-by-issue implementation with one integrated
application deliverable on `codex/integrated-delivery` and one pull request.
For this delivery, the following direction supersedes the issue scheduling,
per-issue branches, leases, timeboxes, intermediate reviews, merges, and closure
rules below. Use all published requirements as a coverage checklist; do not
wait for prerequisite tickets or create more implementation tickets or PRs.
Keep ordinary checkpoints on this branch and verify the combined user workflows.
Do not run the issue dispatcher for this delivery. Existing worker directories
and investigation evidence must remain intact.

Keep the approved application architecture, local-only core, source provenance,
immutable saves, factual accuracy, and honest verification records. A production
fact, asset permission, or human approval must still have actual evidence.
Missing production inputs do not prevent independent application implementation.
The owner requested implementation now; no further routine kickoff is needed.

You can use these instructions to make small, reviewable changes to Storytelling
Studio without losing the distinction between a written plan and working
software. The repository starts with a planning package; implementation has not
begun as of November 11, 2026.

## Read before acting

Contributors and agents should read the [documentation index](docs/README.md),
[implementation status](docs/implementation-status.md),
[model routing policy](docs/policies/model-routing-policy.md), and the relevant
[sprint runbook](docs/planning/README.md) before changing a subject area.
Parallel execution also follows the
[deterministic schedule](docs/planning/execution-schedule.md) and
[controller design](docs/planning/agent-controller.md).
The [documentation style guide](docs/contributor-guides/documentation-style-guide.md)
applies to documentation, issue bodies, review descriptions, and code comments.

Agents must use the implemented/future distinction required by this project,
even where the upstream Idea Map guide assumes the intended system already
exists. A proposed script, screen, API, test, or feature must not be described as
available until implementation and verification evidence support that claim.

## Respect the planning boundary

During the planning phase, agents must limit changes to repository planning and
documentation files. Agents must not initialize Git, create application code,
install dependencies, commit, push, create GitHub issues or pull requests, merge,
publish, or change repository settings before the user approves publication of
this package. That approval authorizes committing and publishing the planning
documents and execution backlog only; it does not start application work.

The user's later explicit implementation kickoff or implementation session is a
second phase boundary, not a request to ask again before every ordinary task.
After that kickoff, workers can edit and test the approved backlog within their
assigned worktrees and scopes. The single coordinator creates branches/worktrees
and owns serialized commits, pushes, pull requests, passing merges, and issue
closure; workers do not receive GitHub mutation credentials. The
[publication procedure](docs/planning/issue-backlog.md#publish-the-approved-backlog)
handles the empty repository's initial documentation commit before branch-based
implementation work begins. The planning/publication session must not
automatically continue into application implementation.

Agents must ask the repository owner before introducing or exposing secrets,
changing security or permissions, accepting unresolved licensing obligations,
or making a substantial architecture change outside the approved alternatives.
Agents must not force-push `main`, bypass failing checks, disable protection, or
claim a review occurred when it did not.

## Coordinate persistent parallel execution

The requested controller is development infrastructure outside the application
minimum viable release. Agents must not build an orchestrator into Storytelling
Studio or describe a controller as available before its
[activation checks](docs/planning/orchestration-activation.md) pass.

After implementation kickoff and explicit approval of the concrete controller
capabilities and credential scopes, the controller can dispatch eligible Terra
and Sol workers in parallel without repeated ordinary permission questions.
Each worker must use an isolated branch/worktree, declared write paths, durable
attempt ID, and the exclusive leases in the execution schedule; workers must not
share mutable application data or untracked output directories.

The controller must use deterministic code for dependency checks, queue order,
lease allocation, heartbeats, retries, GitHub polling, deduplication, and decision
resumption. Routine scheduling must not consume model tokens. The initial limit
is two worker slots, including AI review tasks, plus one controller/merge
coordinator; Windows rendering and Git metadata mutations have separate single
capacity tokens.

Workers must not merge, close issues as completed, promote canonical project
data, or launch untracked sibling workers. The merge coordinator must integrate
one accepted change at a time, validate the final head and scoped approvals,
apply shared documentation updates, and record acceptance before releasing
dependent work.

For an authorized human decision, the controller must post one durable,
deduplicated GitHub question tied to the concrete evidence and affected work.
Only that work and its dependency closure wait; other eligible work continues.
An authorized answer that matches the current decision scope must be persisted
and trigger automatic reevaluation without another ordinary kickoff request.

Agents must not infer approval from silence or issue closure, retry indefinitely,
steal an active lease, or duplicate an attempt after restart. The controller
design defines fencing, bounded retries, durable receipts, and outbox recovery;
unavailable persistence or missing authorization blocks controller activation.

## Implement one bounded issue

Agents must follow the issue's model assignment, dependencies, expected files,
acceptance criteria, tests, documentation update, and stop condition. Each issue
targets 15–45 minutes of focused work; at 60 minutes, agents must record the
remaining work and split or re-scope it before continuing.

Agents must use Terra for routine implementation and Sol for the integration,
geospatial, camera, research, or constraint work identified in the
[routing policy](docs/policies/model-routing-policy.md). Astra is reserved for
the explicitly requested planning phase; agents must not select Astra for
implementation, debugging, or implementation review.

Agents must confirm a dependency's merged behavior and evidence before starting
dependent work. An issue number, a passing placeholder, or a plan paragraph does
not prove the dependency exists. Agents must inspect existing work before
editing and preserve unrelated user changes.

## Keep the system reproducible

The proposed system uses Vue 3, TypeScript, Quasar, MapLibre, and a separate React
Remotion renderer behind shared serializable contracts. Contributors should
follow the [architecture](docs/architecture/system-architecture.md) and prove the
[rendering contract](docs/architecture/rendering-contract.md) before building a
large editor around it.

Agents must keep credentials, unlicensed imagery, large caches, render outputs,
private source data, and machine-specific paths out of Git. Agents must not add
a required cloud service, account, paid API, or AI dependency to the core local
workflow. Contributors should pin compatible dependencies during bootstrap and
document required local binaries and their licenses.

Agents must save and export immutable project revisions and retain provenance
with imported data, research results, roadway dimensions, and media. Agents
must not invent geography, population, income, historical change, transit
service, roadway widths, source approvals, or rights clearance.

## Verify and hand off

Agents must run the checks relevant to the change once those commands exist and
record actual results, skipped checks, limitations, and artifact locations.
The [testing and gates](docs/planning/testing-and-gates.md) document defines the
future command contracts and each day's evidence requirements.

Workers must provide issue-specific receipts and proposed documentation changes
with their pull requests. The merge coordinator owns shared status, indexes,
planning ledgers, and architecture/policy documentation and must include their
reviewed updates in the same pull request before merging; workers must not all
edit `docs/implementation-status.md` concurrently. A feature can move to
implemented only after acceptance evidence exists, and a milestone remains
incomplete while a required factual, rights, export, or recovery gate fails.

Agents must leave a concise handoff stating the issue identifier, branch and
commit when available, files changed, checks performed, remaining blockers, and
next eligible issue. A worker must stop the affected action at a human decision
boundary without substituting a fabricated answer or silently narrowing scope;
the controller must continue independent eligible work.
