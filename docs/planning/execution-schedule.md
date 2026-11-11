# Deterministic execution schedule

The future controller can use this schedule to dispatch the 81 approved product
work items without asking a model to choose the next task. The schedule preserves
the issue bodies' dependencies, model assignments, and bounded scope while
allowing independent workers to run in isolated worktrees.

This is a planning contract, not an installed or running controller. Publication
has been approved; [implementation status](../implementation-status.md) records
its progress. Implementation has not started, and controller activation needs
the separate capability and authorization checks in
[orchestration activation](orchestration-activation.md). The
[controller design](agent-controller.md) defines durable state, retries,
GitHub questions, fencing, and the single merge coordinator.

- [Activation and eligibility](#activation-and-eligibility)
- [Metadata format](#metadata-format)
- [Conditions and priorities](#conditions-and-priorities)
- [Evidence gates for real inputs](#evidence-gates-for-real-inputs)
- [Write leases and artifact ownership](#write-leases-and-artifact-ownership)
- [Dispatch table](#dispatch-table)
- [Parallel examples](#parallel-examples)
- [Receipts and same-pull-request documentation](#receipts-and-same-pull-request-documentation)
- [Decisions and automatic resumption](#decisions-and-automatic-resumption)
- [Validate or change the schedule](#validate-or-change-the-schedule)

## Activation and eligibility

The controller must not dispatch before planning publication, the user's later
explicit implementation kickoff, and a passed controller activation record
authorize the actual host, worker launcher, repository, worktree root, GitHub
actions, model access, and credential scopes. Approval of documents alone does
not authorize workers, background processes, or GitHub questions.

Once activated, the controller must evaluate readiness using durable facts and
ordinary code, not an AI conversation. A candidate needs all `requiresAll`
dependencies accepted and merged, at least one `requiresAny` dependency when
that set is nonempty, a true condition, no unresolved applicable decision, an
available worker slot, and all write leases atomically available.

A dependency is satisfied by its accepted evidence and recorded merged commit,
not merely a closed GitHub issue or a worker's success message. Required real
source or approval evidence cannot be replaced by a receipt saying unavailable;
a reviewed conditional omission can satisfy only the outcome explicitly allowed
by that issue. At activation, P03 must identify the approved published planning
handoff through its durable audit receipt and actual documentation commit. The
[implementation status](../implementation-status.md) records publication evidence.

The initial capacity is two workers, including AI reviewers, plus one
controller/merge coordinator.
The controller must choose the lowest numerical priority first, then the stable
ID in ascending lexical order, skipping candidates that are not eligible. A
stream is an organizational label, not an exclusive worker lane or an extra
dependency; both slots can run Terra or both can run Sol when their rows permit it.

Each worker must receive a distinct branch and worktree based on an accepted
integration commit, the exact dependency commits, issue body, schedule row,
allowed write paths, attempt ID, and fencing token. Workers must not share a
mutable checkout, local project database, output directory, or application
service instance. Git metadata operations are serialized; expensive Windows
render execution uses one separate capacity token only while rendering.

Activation separates `dispatchReady` from `unattendedMergeReady`. The empty
repository uses explicit `supervised-bootstrap` mode: verified workers can run,
but the single supervising coordinator integrates initial work through D1-20
under the implementation authority and bootstrap checks. Unattended merging
cannot begin until the actual target repository has verified required CI,
protection, and current-base merge guards; a test-repository rehearsal is not
sufficient, and no agent may change permissions or protections without approval.

## Metadata format

The table uses plain strings so a deterministic parser can read it without a
model. The controller must reject unknown columns, duplicate IDs, unknown
dependencies, unknown lease or condition values, a cyclic graph, or a mismatch
with the issue bodies.

The exact external-prerequisite allowlist is `externalPrerequisites = {P03}`.
P03 is outside the 81 product issues and must resolve to the actual publication
audit receipt and documentation commit, not a fabricated GitHub issue number.
All other dependency IDs must exist in the product table; an unknown external
identifier fails validation.

The following column rules are normative.

| Column | Meaning |
| --- | --- |
| ID | Exact stable ID in the issue body |
| requiresAll | Comma-separated conjunctive issue IDs; `-` means an empty set |
| requiresAny | Comma-separated alternative issue IDs; `-` means no alternative requirement |
| stream | One of foundation, rendering, editor, persistence, geography, exchange, research, roadway, production, verification |
| model | `terra` or `sol`, mapped to GPT-6.1 Terra or GPT-6.1 Sol |
| reasoning | Exact preferred reasoning level from the issue body |
| priority | Integer; lower values dispatch first among eligible candidates |
| leases | Comma-separated shared write-conflict groups in the registry; `-` means no additional shared group |
| condition | One enum value from the condition registry |

Whitespace around cells and comma-separated values is insignificant. An empty
cell is invalid; the explicit `-` marker must be used for an empty set.
The 81 issue bodies contain conjunctive dependencies only, so every
`requiresAny` cell is `-`; the controller must not invent alternatives or
assume that completing any one prerequisite is sufficient.

The metadata is authoritative for dispatch; the issue body remains authoritative
for acceptance and preferred model/reasoning. A disagreement blocks that issue
until the coordinator reconciles the documents through a reviewed change.
The global authorization conditions are not repeated as fabricated dependency
IDs in every row.

## Conditions and priorities

The activation record must store explicit Boolean `enableHistory`,
`enableIncome`, and `enableImagery` values. The recommended first-film profile
sets all three to false; an owner can enable selected conditional branches
during activation or by a scoped recorded decision. Missing flags fail closed,
and an AI worker must not choose a value from context.

The following conditions are deterministic.

| condition | Evaluation |
| --- | --- |
| baseline | True after the global activation gates; required first-film scope |
| history | `enableHistory == true` |
| income | `enableIncome == true` |
| imagery | `enableImagery == true` |
| imagery-cleared | `enableImagery == true` and the accepted D3-15 receipt records rights approval for the intended actions and useful coverage |

D3-15 can finish its candidate review with a rejected or unsuitable result;
that result cannot make `imagery-cleared` true. Disabled conditional rows are
deferred by scope, not marked implemented, passed, or factually approved.
A false activation flag means not evaluated under the selected scope; it must
not be described as a source-based rejection or an unsupported claim unless that
assessment actually occurred.
A missing clearance can create a scoped GitHub question or source task without
stopping the required population, roadway, or vector-map work.

Priority 10 protects the initial bridge and its bootstrap/persistence
prerequisites. Priority 20 covers the remaining first-film work, including early
source preparation and independent roadway work; priority 30 covers the six
conditional history/income/imagery items. Calendar day labels do not impose
additional barriers: an eligible Day 4 schema task can run before Friday.

The total remains 81 planned items and 51.5 focused contributor-hours, with a
75-item, 48-hour first-film path. Controller activation, adapter configuration,
credentials review, and recovery rehearsal add separate work; this schedule does
not absorb that overhead into the product estimates or authorize an orchestrator
application inside the product minimum viable release.

## Evidence gates for real inputs

The controller must distinguish merged status documentation from a satisfied
dependency. A blocked, unavailable, denied, stale, or deferred receipt can be
published honestly, but cannot set a success predicate for a consumer that needs
the real asset or approval. Synthetic importer, schema, UI, and solver work can
still start according to the dispatch table when it does not consume that input.

Each typed gate receipt must record the producing issue, gate type, outcome,
artifact and relevant input hashes, reviewer identity and reviewer type,
intended actions, and associated scoped decision when human approval is required.
The allowed gate outcomes are `accepted`, `blocked`, `unavailable`, `denied`,
`stale`, `deferred_scope`, and `not_applicable_verified`; worker lifecycle states
remain those in the controller design and are not replaced by these outcomes.

The following registry defines the additional factual/resource predicates at
the point of consumption. These predicates refine acceptance of the existing
dependency or final production input; they do not add a blanket day-level gate.

| Gate type | Producer and required evidence | Consumer and pass predicate |
| --- | --- | --- |
| geography | D2-04: sourced corridor/landmark geometry, dates, geometry roles, rights, and hashes | Real geographic production in D2-18 requires `accepted` with matching referenced geometries |
| transit | D2-05 and D2-07: service-date, source/provenance, geometry, applicable rights, and GoLink applicability record | D2-18/D2-19 require `accepted` applicable transit and either accepted GoLink coverage or `not_applicable_verified`; unknown coverage cannot pass |
| network_packet | D2-10: actual polygon, reachable network, origins, 600-second duration, graph/tool versions, assumptions, and hashes | D2-12 consumes an `accepted` complete packet; a blocked acquisition report cannot release technical review as completed |
| network_review | D2-12: technical suitability, barrier/access checks, and the exact network-packet hash | D2-13 and the real D3-17 calculation require `accepted` matching geometry/method; D2-11 synthetic importer work remains independent |
| population_source | D3-02: exact Census/boundary snapshot, table/universe/period, rights, joins, missingness, and hashes | The real D3-17 calculation requires an `accepted` matching source snapshot; synthetic D3-04/D3-05 tests do not establish a Maple fact |
| population_approval | D3-17: reproducible result, current study-area/source/method hashes, named human review, and intended factual-export scope | D3-18 requires `accepted` and nonstale approval of the exact included result; implementing D3-09's review mechanism is insufficient |
| imagery_rights | D3-15: actual asset/date/coverage, named reviewer, action-specific display/video/package rights, and asset hash | D3-16 requires `imagery-cleared` plus `accepted` for each intended action; a denied or unsuitable candidate does not pass |
| dimension_review | D4-13: per-segment widths/envelopes, documented/estimated/proposed classification, source/method/precision, and review | D4-16 requires `accepted` matching dimension inputs and visible estimate/concept labels; a generic preset is insufficient |
| final_revision_approval | D4-19: exact saved film revision, included claim/asset/dimension hashes, action-specific rights, and named human review | D4-20 requires `accepted` current approval for both exports; conditional omissions must distinguish scope deferral from evaluated rejection |

The coordinator must validate a gate receipt against the producing issue's
actual checks and review evidence before marking it accepted. The controller
can compare hashes, enums, authorized reviewer IDs, intended-action sets, and
decision state mechanically; it must not ask a model to infer approval from
free-form prose or a GitHub closed label.

Changing a relevant input invalidates the matching gate and all dependent
factual approvals before the next gated action. The controller must record the
specific stale predicate and resume only after a new matching receipt or scoped
decision; unrelated code or source work continues. Optional history and income
require their own approved matching snapshots only when included in the film.

## Write leases and artifact ownership

The controller must acquire all required conflict-group and exact-file leases
atomically before allowing edits. A lease protects a specific write conflict;
it is not a blanket lock on a day, stream, model, package, or the repository.
Workers can read their immutable dependency snapshots without acquiring a write
lease on every file they inspect.

The following registry identifies shared code and fixture paths.

| Lease group | Exclusive write scope |
| --- | --- |
| manifest | Root and workspace package manifests/lockfile, root runtime/version/TypeScript setup files, and root `.gitignore` |
| schema-root | `packages/project-schema/src/project.ts`, `validation.ts`, `api.ts`, `migrations.ts`, and shared public export/index files |
| core-frame | `packages/story-core/src/evaluate-frame.ts` |
| core-camera | `packages/story-core/src/camera.ts` |
| core-geometry | `packages/story-core/src/geometry.ts` |
| core-labels | `packages/story-core/src/labels.ts` |
| core-roadway | `packages/story-core/src/roadway.ts` |
| map-host | Shared `packages/map-adapter/src/mount.ts`, `apply-frame.ts`, and `readiness.ts` |
| map-svg | `packages/map-adapter/src/svg-overlay.ts` |
| map-resources | `packages/map-adapter/src/resources.ts` |
| renderer-composition | `apps/renderer/src/index.tsx`, `StoryComposition.tsx`, and `MapFrameHost.tsx` |
| renderer-job | `apps/renderer/src/render-job.ts` and its shared receipt contract |
| service-http | `apps/local-service/src/server.ts`, `security.ts`, and binding/origin/session configuration |
| project-storage | `apps/local-service/src/db/database.ts`, `project-repository.ts`, and their migration contract |
| job-runner | `apps/local-service/src/services/job-runner.ts` and shared job-state contracts |
| studio-store | `apps/studio/src/stores/project-store.ts` |
| research-route | `apps/local-service/src/routes/research.ts` |
| research-sources | `apps/local-service/src/research/source-adapters.ts` |
| fixture-story | `tests/fixtures/synthetic-story/` |
| fixture-roadway | `tests/fixtures/roadway/` |
| pilot-project | Promotion of changes to the canonical editable Maple project and its scene/timeline state |

Every issue also reserves its exact unique component, adapter, test, and receipt
paths from the issue's scoped write manifest. A `-` in the table does not waive
this check. A directory shown in an issue body is an area to inspect, not a
license to reserve or rewrite the whole directory; the worker must name concrete
existing files and issue-specific new files before editing.

A worker that discovers an additional shared file must request an atomic lease
extension with the exact path and reason. The controller can compare paths and
known groups mechanically; if the extension conflicts, the worker must checkpoint
and yield rather than write without a lease or repeatedly ask a model to poll.
A change to scope, dependencies, or a substantial contract still follows its
review or human-decision boundary.

The controller retains branch conflict reservations from dispatch through merge
or an explicitly parked decision, with the heartbeat/expiry and fencing rules
in the controller design. A blocked worker releases its worker slot and render
capacity; a stale reservation must not be stolen while the previous worker can
still write. The coordinator can park or supersede an attempt only through the
recorded recovery procedure.

Workers must stage acquired sources and computed outputs in their own attempt
area with content hashes. The coordinator promotes verified immutable assets and
merges source-manifest entries; workers must not concurrently mutate the shared
pilot source manifest or reuse another attempt's local SQLite database.
A `pilot-project` holder edits a private saved copy and proposes a new revision;
only the coordinator promotes the accepted canonical project.

Canonical shared documentation is coordinator-owned: implementation status,
the documentation index, issue/backlog mappings, the Maple production ledger,
and shared architecture/policy contracts. These documents do not create a global
worker lease. Workers provide issue-specific evidence and proposed documentation
changes, and the coordinator includes the reviewed update in the same pull
request before merging.

## Dispatch table

The following rows are the complete product schedule. Publication items P01–P03,
optional evaluations X-01/X-02, and separately authorized controller activation
items are outside this 81-row table.

| ID | requiresAll | requiresAny | stream | model | reasoning | priority | leases | condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1-01 | P03 | - | foundation | terra | high | 10 | manifest | baseline |
| D1-02 | D1-01 | - | foundation | terra | medium | 10 | manifest,service-http | baseline |
| D1-03 | D1-01 | - | foundation | terra | high | 10 | schema-root,fixture-story | baseline |
| D1-04 | D1-03 | - | rendering | sol | high | 10 | core-frame,core-camera,core-geometry,core-labels | baseline |
| D1-05 | D1-04 | - | rendering | sol | high | 10 | map-host,fixture-story | baseline |
| D1-06 | D1-02,D1-05 | - | editor | terra | medium | 10 | - | baseline |
| D1-07 | D1-04,D1-05 | - | rendering | sol | high | 10 | renderer-composition | baseline |
| D1-08 | D1-07 | - | rendering | sol | high | 10 | manifest,renderer-job | baseline |
| D1-09 | D1-06,D1-08 | - | verification | sol | high | 10 | manifest | baseline |
| D1-10 | D1-09 | - | editor | terra | medium | 20 | studio-store | baseline |
| D1-11 | D1-10 | - | geography | sol | high | 20 | - | baseline |
| D1-12 | D1-11 | - | editor | terra | medium | 20 | studio-store | baseline |
| D1-13 | D1-12 | - | editor | terra | medium | 20 | studio-store | baseline |
| D1-14 | D1-13 | - | editor | terra | medium | 20 | - | baseline |
| D1-15 | D1-01,D1-03 | - | persistence | sol | high | 10 | service-http | baseline |
| D1-16 | D1-15 | - | persistence | sol | high | 10 | project-storage | baseline |
| D1-17 | D1-10,D1-16 | - | editor | terra | medium | 20 | studio-store | baseline |
| D1-18 | D1-08,D1-16 | - | rendering | sol | high | 10 | job-runner,renderer-job | baseline |
| D1-19 | D1-14,D1-17,D1-18 | - | editor | terra | high | 20 | manifest | baseline |
| D1-20 | D1-19 | - | verification | terra | medium | 20 | - | baseline |
| D2-00 | P03 | - | geography | terra | high | 20 | - | baseline |
| D2-01 | D1-09 | - | geography | sol | high | 20 | - | baseline |
| D2-02 | D2-01,D1-10 | - | editor | terra | medium | 20 | studio-store | baseline |
| D2-03 | D2-01 | - | geography | sol | high | 20 | core-camera | baseline |
| D2-04 | D1-03 | - | geography | terra | high | 20 | - | baseline |
| D2-05 | D1-11,D2-04 | - | geography | sol | high | 20 | - | baseline |
| D2-06 | D2-05 | - | editor | terra | medium | 20 | - | baseline |
| D2-07 | D2-05 | - | geography | terra | high | 20 | - | baseline |
| D2-08 | D2-06,D2-07,D1-17 | - | editor | terra | medium | 20 | - | baseline |
| D2-09 | D1-13,D2-05 | - | geography | sol | high | 20 | core-geometry | baseline |
| D2-10 | D2-00,D2-04 | - | geography | sol | high | 20 | - | baseline |
| D2-11 | D1-11 | - | geography | terra | high | 20 | - | baseline |
| D2-12 | D2-10,D2-11 | - | geography | sol | high | 20 | - | baseline |
| D2-13 | D2-08,D2-12 | - | editor | terra | medium | 20 | - | baseline |
| D2-14 | D1-16,D2-08 | - | exchange | terra | high | 20 | - | baseline |
| D2-15 | D2-14 | - | exchange | sol | high | 20 | manifest | baseline |
| D2-16 | D2-15,D1-16 | - | exchange | sol | high | 20 | - | baseline |
| D2-17 | D2-13,D2-16 | - | verification | terra | high | 20 | - | baseline |
| D2-18 | D2-02,D2-03,D2-04,D2-09,D2-13 | - | production | terra | medium | 20 | pilot-project | baseline |
| D2-19 | D2-17,D2-18 | - | verification | sol | high | 20 | - | baseline |
| D3-01 | D1-03 | - | research | terra | high | 20 | schema-root | baseline |
| D3-02 | D3-01,D2-04 | - | research | sol | high | 20 | research-sources | baseline |
| D3-03 | D3-01 | - | research | terra | high | 20 | research-route | baseline |
| D3-04 | D3-03 | - | research | sol | high | 20 | core-geometry | baseline |
| D3-05 | D3-02,D3-04 | - | research | sol | high | 20 | manifest | baseline |
| D3-06 | D3-05 | - | research | sol | high | 20 | - | baseline |
| D3-07 | D3-06,D1-18 | - | research | terra | high | 20 | research-route,job-runner | baseline |
| D3-08 | D3-07 | - | editor | terra | medium | 20 | - | baseline |
| D3-09 | D3-08 | - | research | sol | high | 20 | - | baseline |
| D3-10 | D3-01,D3-06 | - | research | sol | high | 30 | - | history |
| D3-11 | D3-10 | - | research | terra | high | 30 | - | history |
| D3-12 | D3-01,D3-06 | - | research | sol | high | 30 | - | income |
| D3-13 | D3-12 | - | research | sol | high | 30 | research-sources | income |
| D3-14 | D3-09 | - | rendering | terra | medium | 20 | core-labels,map-svg | baseline |
| D3-15 | D3-01 | - | research | terra | high | 30 | - | imagery |
| D3-16 | D3-15,D1-05 | - | rendering | sol | high | 30 | map-resources | imagery-cleared |
| D3-17 | D3-09,D2-12 | - | research | sol | high | 20 | - | baseline |
| D3-18 | D3-14,D3-17,D2-18 | - | production | terra | medium | 20 | pilot-project | baseline |
| D3-19 | D3-18 | - | verification | sol | high | 20 | - | baseline |
| D4-01 | D1-03 | - | roadway | terra | high | 20 | schema-root | baseline |
| D4-02 | D4-01,D1-04 | - | roadway | sol | high | 20 | core-roadway | baseline |
| D4-03 | D4-02 | - | verification | sol | high | 20 | manifest,fixture-roadway | baseline |
| D4-04 | D4-01,D4-02 | - | roadway | terra | high | 20 | map-svg | baseline |
| D4-05 | D4-04 | - | roadway | terra | medium | 20 | fixture-roadway | baseline |
| D4-06 | D4-03,D4-04,D1-10 | - | editor | terra | high | 20 | - | baseline |
| D4-07 | D4-02 | - | roadway | sol | high | 20 | core-roadway,schema-root | baseline |
| D4-08 | D4-06,D4-07 | - | editor | terra | medium | 20 | - | baseline |
| D4-09 | D4-07,D4-04 | - | roadway | sol | high | 20 | core-roadway,map-svg | baseline |
| D4-10 | D4-09,D1-04 | - | roadway | sol | high | 20 | core-roadway,core-frame | baseline |
| D4-11 | D4-10,D4-08 | - | editor | terra | medium | 20 | - | baseline |
| D4-12 | D4-01,D3-01 | - | roadway | terra | high | 20 | schema-root | baseline |
| D4-13 | D4-12,D2-04 | - | roadway | sol | high | 20 | - | baseline |
| D4-14 | D4-11,D4-12,D1-17 | - | persistence | terra | high | 20 | studio-store,project-storage | baseline |
| D4-15 | D4-09,D4-14,D1-09 | - | rendering | sol | high | 20 | renderer-composition,map-svg | baseline |
| D4-16 | D4-13,D4-15 | - | production | terra | high | 20 | pilot-project | baseline |
| D4-17 | D2-18,D3-18,D4-16 | - | production | terra | high | 20 | pilot-project | baseline |
| D4-18 | D4-17 | - | production | terra | medium | 20 | pilot-project | baseline |
| D4-19 | D4-18,D3-19 | - | verification | sol | high | 20 | - | baseline |
| D4-20 | D4-19,D2-17 | - | rendering | sol | high | 20 | - | baseline |
| D4-21 | D4-20 | - | verification | terra | high | 20 | - | baseline |
| D4-22 | D4-21 | - | verification | terra | medium | 20 | - | baseline |

## Parallel examples

The controller can use the following examples as scheduling test cases; they
describe eligible pairs after the named dependencies and global gates pass.

| Work | Decision |
| --- | --- |
| D1-01 and D2-00 | Can run together after P03 and activation: workspace setup and external source preparation have separate write scopes |
| D1-06 and D1-07 | Can run together after their prerequisites: Vue and Remotion hosts share read-only contracts but write separate hosts |
| D2-02 and D2-03 | Can run together: editor/store work and camera fitting have distinct leases |
| D3-04 and D4-02 | Can run together: geodesic intersection and the roadway width solver write distinct core modules |
| D4-04 and D4-07 | Can run together against their pinned accepted inputs: SVG presentation and roadway segment/schema changes are separately leased |
| D2-09 and D3-04 | Cannot run concurrently because both need core-geometry |
| D3-14 and D4-04 | Cannot run concurrently because both need map-svg |
| D3-01 and D4-01 | Cannot run concurrently because both need schema-root |
| A blocked D1-15 and ready D1-07 | The unrelated rendering work continues while the owner considers the local-service boundary |
| A blocked D3-17 and ready D4-02 | Synthetic roadway work continues while the required factual review is pending |

Parallel work must still be rebased or integrated against the accepted current
base and pass its affected checks before merge. Isolated worktrees prevent
working-directory collisions; they do not prove semantic compatibility or waive
review of shared contracts.

## Receipts and same-pull-request documentation

Each worker must submit an issue-specific receipt containing issue/attempt IDs,
base and dependency commits, proposed tree/diff hash, changed paths, tests and results,
artifact hashes, model/reasoning, remaining acceptance criteria, proposed
documentation edits, and any decision request. The controller stores the durable
receipt under its configured `.local/agent-controller/` state root outside the
worker worktrees, following the controller design.

A concise reviewed repository receipt can be committed under
`docs/planning/receipts/ISSUE_ID/ATTEMPT_ID.md`. `ISSUE_ID` is the exact stable
issue identifier; `ATTEMPT_ID` is the controller-assigned immutable attempt
identifier. This path is a future convention, not an existing artifact.

The coordinator records the actual head commit after committing the validated
worker changes; a worker must not invent a head SHA for an uncommitted result.
The coordinator owns serialized Git/worktree administration, commits, pushes,
pull requests, and merges, and workers do not receive GitHub mutation credentials.

Workers must freeze their worktree at handoff and must not merge, close issues as
completed, promote canonical project data, or change another worker's files.
The merge coordinator alone validates the receipt, resolves the current-base
integration, applies the reviewed canonical-documentation delta to that same
pull request, and reruns affected checks on the final head.

A coordinator-authored integration commit changes the reviewed head and
invalidates old head-specific checks until they rerun. Only after required
checks, factual/security/rights decisions, and review pass can the coordinator
merge, update the durable acceptance record, close the issue, release leases,
and make dependent work eligible. This preserves same-pull-request documentation
without making every worker edit `docs/implementation-status.md`.

## Decisions and automatic resumption

A worker must prepare the concrete change or evidence before requesting a
decision. After the GitHub decision capability is authorized, the controller
posts one deduplicated issue/comment with the question, affected issue IDs,
reviewable commit or evidence hashes, permitted answer choices, and the precise
reason that a human decision is required.

The controller must mark only the affected work and its dependency closure as
blocked. Other eligible rows continue automatically; routine polling, comment
deduplication, retry timers, lease renewal, dependency checks, and queue selection
must not consume model tokens. AI work is reserved for implementation, technical
review, or a bounded substantive recovery task.

The controller accepts an answer only from an authorized decision maker, with
the decision ID and scope still matching the current evidence. It persists the
answer and event cursor, reevaluates eligibility, and resumes affected work
without another ordinary kickoff question. Ambiguous, stale, unauthorized, or
conflicting answers require clarification on that decision; elapsed time,
silence, an unrelated issue closure, or a worker's inference is not approval.

A crash or transient tool failure must resume from persisted attempts, receipts,
leases, GitHub outbox state, and event cursors under the bounded retry policy in
the controller design. The scheduler must not launch a duplicate attempt or
repeat a GitHub message because it lost an in-memory response.

## Validate or change the schedule

Before activation and after a schedule change, the coordinator must validate all
81 IDs, exact conjunctive dependency sets, model/reasoning matches, enum values,
acyclicity, lease registry entries, condition branches, and path overlap rules.
It must prove that the parallel and conflicting pairs in this document behave
as stated and that a human decision blocks only the relevant closure.

The controller must fail closed on metadata drift for affected rows and continue
validated independent work when safe. The coordinator must record any row
change in a reviewed planning update and synchronize its copied GitHub fields;
a worker must not silently bypass a prerequisite or change its dispatch priority.

The controller's maintained schedule and state machine belong to development
operations, outside the Storytelling Studio application. A missing execution
adapter, persistent host, or authorization is a setup blocker, not permission to
build an orchestrator into the four-day product.
