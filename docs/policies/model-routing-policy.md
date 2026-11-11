# Model routing policy

Contributors can use this policy to choose the smallest suitable implementation
model and recognize when a task needs a different approach. The user requested
Astra at maximum reasoning for planning; implementation uses Terra or Sol.

The persistent controller uses deterministic code for routine scheduling and
state management. It does not call a model to select each issue, poll GitHub,
renew leases, count retries, deduplicate messages, or recognize a structured
authorized decision.

## Assign work by its uncertainty

The following assignments apply to every backlog issue, including its review
and follow-up fixes unless the evidence changes the task's uncertainty.

| Model | Reasoning | Assignment |
| --- | --- | --- |
| GPT-6.1 Terra | Medium by default | Bounded components, forms, tables, scripts, fixtures, documentation, and known-contract wiring |
| GPT-6.1 Terra | High when identified | Persistence adapters or validators with a clear existing contract and meaningful edge cases |
| GPT-6.1 Sol | High by default | Vue/Remotion integration, deterministic camera and rendering behavior, geospatial methods, research validity, and roadway constraints |
| GPT-6.1 Sol | Maximum only when justified | A reproducible cross-boundary failure remains unresolved after a focused high-reasoning attempt |
| GPT-6 Astra | Maximum, planning only | The user-authorized initial architecture, research, sprint, and governance planning package |

Agents must not select Astra for implementation, implementation review, or
debugging. Exhausting a timebox or finding a difficult bug does not change the
Terra/Sol implementation policy.

The [execution schedule](../planning/execution-schedule.md) copies each issue's
preferred model and reasoning into deterministic dispatch metadata. The
controller must reject a mismatch instead of choosing between documents; actual
model identifiers and access are verified during
[controller activation](../planning/orchestration-activation.md).

## Change an assignment with evidence

An implementing agent must start with the issue's preferred model and reasoning
level. The agent can move a Terra task to Sol when a reproducible failure crosses
the listed integration, geospatial, research, camera, or constraints boundaries.
The agent must record the failure, attempted correction, affected contract, and
reason in a structured routing request before doing the deeper work. The
coordinator records an allowed Terra-to-Sol assignment change in durable state;
the deterministic scheduler then dispatches that bounded attempt under the same
issue's acceptance contract and capacity limits.

An agent must not increase model size to compensate for an oversized issue.
At 60 minutes, the agent must split unresolved scope into a new stable local
identifier, preserve the passing slice if useful, and update dependencies and
the milestone forecast. The agent should reduce the reasoning level when the
remaining work becomes mechanical.

## Keep a complete handoff

The receiving agent must get enough context to resume without reconstructing a
conversation. The handoff must contain the following information.

- The stable issue identifier, objective, and preferred model and reasoning.
- The current commit or uncommitted state, relevant files, and dependency state.
- The reproduction, attempted changes, actual verification, and evidence paths.
- The remaining acceptance criteria, next action, and explicit stop condition.

Agents must use repository documents as the durable authority and keep private
credentials and unrelated personal context out of handoffs. The user requested
persistent parallel implementation workers; after the later implementation
kickoff and approved controller activation, the controller can dispatch them
without asking repeatedly. A worker must not create untracked child or sibling
agents that bypass the durable queue, write leases, or capacity limit.

The initial two-slot limit includes implementation and AI review workers. A
controller tick, waiting for a human answer, and ordinary status reconciliation
use no model worker; a substantive code review or conflict diagnosis uses Terra
or Sol and occupies a recorded worker slot.

## Review the result

A review should assess behavior, relevant tests, documentation, and the issue's
explicit evidence. A reviewer should use Sol for changes to research methods,
geometry, deterministic rendering, package security, or roadway constraints;
Terra can review bounded presentation and documentation changes.

The review record must name the actual reviewing model or human and list its
findings. An author must not describe a self-check as independent review. The
repository owner remains the decision maker for the human boundaries in
[AGENTS.md](../../AGENTS.md).

Only the single merge coordinator can accept the reviewed result, merge its
final checked head, close its issue, and release dependent work. A human question
blocks only the affected scope; the controller continues other eligible work
and resumes automatically after a valid scoped answer under the
[controller protocol](../planning/agent-controller.md).
