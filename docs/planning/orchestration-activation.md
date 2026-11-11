# Prepare the sprint controller

The implementation lead can use this plan to choose and verify the smallest
controller that can keep the sprint moving while the owner answers decisions
through GitHub. This is a proposed development tool, separate from Storytelling
Studio and its 81 application implementation issues. No controller has been
built, installed, or started during planning.

- [Recommended implementation](#recommended-implementation)
- [Evidence available now](#evidence-available-now)
- [Adoption and activation sequence](#adoption-and-activation-sequence)
- [Acceptance exercise](#acceptance-exercise)
- [If readiness fails](#if-readiness-fails)

## Recommended implementation

The smallest proposed implementation is one local Node.js supervisor with a
durable SQLite state file, a GitHub REST client, a subprocess adapter for the
installed Codex CLI, two worker slots, and one serialized merge coordinator.
The controller is ordinary software: it applies the dependency table, acquires
leases, polls GitHub, records events, and starts eligible work without asking a
model to choose the next issue. Terra and Sol perform bounded implementation
and substantive review work. The
[controller contract](agent-controller.md) defines behavior, and the
[execution schedule](execution-schedule.md) defines the 81 issue assignments.

Prefer adapting an already maintained local supervisor if it passes the same
readiness checks. No suitable installed supervisor has been verified here.
The Codex CLI alone does not supply this repository's scheduler, decision
protocol, merge policy, or durable execution database. A persistent chat is not
a replacement for a supervised operating-system process.

Keep any newly authorized runner in a separate development-tool location,
outside `apps/`, the application service, its database, and its npm workspaces.
Its configuration may reference this repository's reviewed schedule; its state,
credentials, and worktrees must stay outside tracked application files. Do not
add Redis, a cloud server, a public webhook endpoint, a dashboard, a general
agent framework, or a multi-host scheduler for the four-day sprint.

The owner must explicitly authorize building a controller before new controller
code is written. Approving this planning package does not supply that separate
authorization. A later application kickoff can use an existing verified runner
without turning controller development into an application issue. Permissions,
credentials, and human approval boundaries still follow
[AGENTS.md](../../AGENTS.md).

## Evidence available now

The following checks were read-only planning probes on November 11, 2026. No
authenticated model job or GitHub mutation was attempted.

| Probe | Observed result | Still to prove before activation |
| --- | --- | --- |
| Local command discovery | `codex.ps1` and `gh.exe` are on `PATH` | The intended unattended Windows account can invoke the resolved executables |
| `codex --version` | `codex-cli 0.163.0` | Version remains pinned and compatible with the chosen adapter |
| `codex exec --help` | Explicit model, working directory, JSONL events, final-output schema, output file, sandbox, and resume-by-ID options are present | A bounded sandboxed worker completes, produces valid output, and exits without a terminal prompt |
| CLI startup diagnostics | Help returned, with access-denied warnings for temporary alias directories | Resolve the actual runtime permission/path issue before calling the runner ready; help output is not a successful worker launch |
| Model documentation | The published model IDs are `gpt-6.1-terra` and `gpt-6.1-sol` | This account and CLI support both requested models and reasoning settings; no silent substitution |

The [official non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode)
describes JSONL events and schema-constrained final output. The adapter must
still validate process exit, output schema, files, and acceptance evidence;
a completion event alone cannot prove that an issue is finished. The
[Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra) and
[Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) API catalog
entries establish model identifiers, not account-specific CLI access.

Use the owner's existing authorized local authentication where supported.
Do not copy authentication files into the repository or a public CI runner.
Public issue text and fork code are untrusted inputs; an owner-controlled
implementation queue must not become an arbitrary-code execution service.
Do not launch a worker with sandbox or approval bypass flags to avoid solving
an unattended-operation limitation.

## Adoption and activation sequence

These operational timeboxes are separate from the application backlog. They
describe evaluation and acceptance of a candidate controller, not an estimate
for building a production-quality controller from scratch. No application
script or controller command is introduced by this document.

| Stage | Preferred model and reasoning | Inputs | Action and required output | Timebox |
| --- | --- | --- | --- | --- |
| A: inspect the candidate | Terra, medium | Approved planning package and a named existing runner, if available | Record implementation/version/license, worker adapter, storage, and every missing controller capability | 30 minutes |
| B: prepare activation configuration | Terra, high; owner for permissions | Stage A and controller contract | Prepare concrete worktree/state roots, owner GitHub ID allowlist, GitHub permissions, process identity, polling/retry limits, model mapping, execution scope, and resource limits; obtain required security approval on that configuration | 30 minutes |
| C: prove worker isolation | Sol, high | B accepted; disposable trusted test repository | Run two bounded synthetic jobs, validate exact models and structured results, isolate files/ports/data/processes, and prove that a third job queues | 45 minutes |
| D: prove GitHub decisions | Terra, high | B accepted and C passed | Exercise the phone-reply, unauthorized-answer, stale-answer, duplicate-answer, and downtime catch-up cases below | 45 minutes |
| E: prove integration and recovery | Sol, high | C and D passed | Exercise one merge coordinator, failed checks, changed heads, worker death, controller restart, and ambiguous API responses; retain receipts | 45 minutes |
| F: activate the approved queue | Terra, medium | All readiness evidence, publication complete, and explicit application kickoff | Start the supervised process, confirm durable state and queue hash, and dispatch only eligible issues; record how to stop and recover it | 15 minutes |

The sequence adds up to 3.5 focused hours of evaluation and activation when a
suitable implementation already exists. Repairs, new controller development,
permission decisions, and integration overhead are additional. If Stage A
finds no usable controller, report the missing capabilities and a separate
bounded implementation proposal before writing code. Do not hide that work
inside D1-01 or silently reduce the video requirements to make room for it.

The lead must use the complete
[orchestration readiness checklist](agent-controller.md#orchestration-readiness-checklist)
as the activation gate. Routine checks and dispatch do not need repeated owner
confirmation once the approved configuration and implementation kickoff exist.

Record worker dispatch readiness separately from unattended merge readiness.
The target repository starts without CI; D1-20 establishes the application check
workflow. The recommended initial route is explicitly selected supervised
bootstrap through D1-20: verified workers and GitHub decisions can run under
the controller while a supervising coordinator validates the initial merges
under the existing implementation authority. This supervision is technical
verification, not a new owner approval for every ordinary passing PR.

Unattended merges start only after the actual target checks and approved
protection configuration are verified. A successful exercise in a disposable
repository cannot stand in for those target controls. An owner-authorized
earlier guard setup is an alternative, separately scoped operational task;
do not silently add it to application bootstrap or claim full unattended
operation before it exists.

## Acceptance exercise

Use a disposable trusted repository and synthetic work. Obtain authorization
for that repository and any real comments before performing the exercise.
The proposed workflow should demonstrate the following sequence without a
second chat prompt from the owner.

1. Start two independent jobs in separate worktrees. One requests a decision;
   the other continues. Record the blocked issue and the exact GitHub question.
2. Finish the independent job and automatically assign another eligible job
   to its free slot while the decision is still pending.
3. Answer the decision from GitHub on a phone using the displayed reply line.
   Confirm the controller records the authorized answer once and resumes the
   affected issue when its dependencies and required leases permit.
4. Submit an answer from an unapproved account, then a duplicate and a stale
   answer. Confirm none grants a new permission or launches duplicate work.
5. Stop the controller while the owner posts another valid answer. Restart it
   and verify catch-up without losing the answer or restarting a live worker.
6. Present two ready PRs. Confirm only the coordinator integrates them,
   current-head checks are required, and the second PR is updated and checked
   against the first merge before it can merge.
7. Interrupt execution after a question post and after a merge response but
   before the local receipt commits. Confirm reconciliation discovers the
   actual remote result instead of repeating the operation blindly.
8. Kill a worker and simulate an unreachable old process. Confirm its attempt
   is fenced and its worktree is quarantined until process termination is
   verified; an expired timer must not create two writers.
9. Exhaust one issue's retry limit. Confirm only that issue and its dependents
   stop, independent work continues, and the persistent counters survive a
   controller restart.

Retain configuration and schedule hashes, sanitized event logs, model/attempt
identifiers, comment and PR URLs, commit SHAs, check results, and the actual
reviewer for each assertion. Mark failed or unperformed cases explicitly.

## If readiness fails

A missing worker model, unsupported unattended permission mode, invalid state
store, or failed recovery exercise prevents unattended activation. Preserve
the result and prepare the smallest correction; do not launch a partially
verified controller and describe it as persistent execution.

The owner may accept a supervised manual-dispatch fallback with the same
worktrees, dependency graph, PR checks, and GitHub decision record. That fallback
does not satisfy automatic reassignment or automatic resume and must be labeled
accordingly. If controller readiness remains a required prerequisite, keep the
unattended sprint blocked while continuing separately authorized planning,
source preparation, or supervised work.
