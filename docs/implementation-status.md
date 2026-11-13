# Implementation status

You can use this record to distinguish inspected repository facts, proposed
behavior, and verified implementation. A written acceptance criterion does not
mean the feature or its test exists.

## Inspected baseline

The planning session inspected the following baseline on November 11, 2026.

| Item | Observed state | Consequence |
| --- | --- | --- |
| Local working directory | Empty before planning files were written; initially no `.git` directory | Historical starting state; initialization and publication are recorded below |
| GitHub repository | Initially public `DallasUrbanists/storytelling-studio`, default branch name `main`, empty tree, no issues or pull requests | Historical starting state; the owner subsequently approved planning publication |
| Local tools | Node `24.22.1`, npm `11.19.1`, Git `2.50.1.windows.1` reported by read-only probes | Compatibility remains unverified until bootstrap and export proof |
| FFmpeg | No `ffmpeg` executable found on `PATH` | Bootstrap must select and verify a supported render/inspection binary path |
| Application and tests | No application code, package manifest, lockfile, scripts, fixtures, or tests | Every command in the runbooks is a future contract until its issue implements it |
| Organization context | The user confirmed Dallas Urbanists is nonprofit/not-for-profit | Exact selected Remotion version and distribution obligations still require recorded review |

## Capability ledger

The following ledger records the initial implementation state. Contributors
should replace a status only with linked commit and verification evidence.

| Capability | Status | Required evidence |
| --- | --- | --- |
| Planning package | Approved and published | Owner's November 11 approval and the baseline commit in the publication record |
| Workspace and local lifecycle | Planned | D1-01 and D1-02 checks on a clean checkout |
| Vue/Remotion deterministic bridge | Planned; critical path | D1-03 through D1-09 frame and export receipts |
| Map editor and local revisions | Planned | D1-10 through D1-19; reopening and conflict checks |
| Geographic storytelling and transit | Planned | Day 2 source, focus, visibility, and export evidence |
| Network walkshed import | Planned | Documented 600-second network method and route barrier checks |
| Portable `.gstory` exchange | Planned | Complete, missing-asset, tampered, and round-trip tests |
| Research and approved snapshots | Planned | Day 3 reproducibility, overlap, review, and comparability evidence |
| Cleared aerial imagery | Conditional; no assets approved by this plan | Per-asset metadata and reuse/export rights |
| Top-down roadway editor | Planned | Day 4 dimensional, lock, segment, and transition tests |
| Final Maple pilot | Planned; no research claims or dimensions verified here | Both decoded videos, editable package, approvals, and playback review |
| GitHub backlog | Published and verified; awaiting implementation kickoff | All 81 complete bodies, dependency links, dispatch rows, labels, and four milestones checked against the approved files |
| Persistent execution controller | Planned separately; not built or activated | Complete readiness receipt, approved configuration, and explicit implementation kickoff |
| Parallel scheduling manifest | Prepared for the 81 application issues | Reviewed schedule hash, matched issue metadata, and verified dependency/resource handling |

## Planning validation

The additional continuous-execution requirement is specified in the
[controller contract](planning/agent-controller.md),
[scheduling manifest](planning/execution-schedule.md), and
[activation plan](planning/orchestration-activation.md). Local CLI discovery and
help output are recorded as capability evidence only; no controller-launched
worker, controller, GitHub decision question, or controller recovery exercise
has been run.

The initial planning review on November 11, 2026, checked 33 Markdown files and 496
local links, including heading anchors. The review found no broken local links,
unbalanced code fences, invalid embedded JSON, or whitespace/encoding errors.
It also checked the issue metadata, dependency references, dependency cycles,
and estimate totals: 81 implementation cards and five publication or optional
evaluation cards. Three Mermaid diagram sources received a source review;
they have not been rendered in this planning session.

Those pre-publication checks used temporary read-only audit commands, not
application test scripts. No application tests, dependency installs, Git
commits, or GitHub mutations were performed during that planning review.
The owner subsequently authorized the publication recorded below.

The continuous-execution amendment adds three planning documents, bringing the
package to 36 Markdown files. Its 81 scheduling rows match the issue bodies'
dependencies, preferred models, and reasoning levels; the six conditional rows
remain separate from the 75 first-film rows. The planning review checked the
21 shared write groups and the acyclic dependency graph. The fourth Mermaid
source describes the controller lifecycle and has not been rendered. These are
documentation checks, not evidence of a running scheduler or a successful
phone-reply/recovery exercise.

## Publication record

The repository owner approved committing and publishing the planning package
and creating the GitHub backlog on November 11, 2026. The same instruction
explicitly prohibited starting application or controller implementation.

| Publication item | Verified evidence |
| --- | --- |
| P01: documentation baseline | [Commit e32f395](https://github.com/DallasUrbanists/storytelling-studio/commit/e32f395caa5b92cd8521a174fd404ba578c33ff1), published normally to the rechecked empty `main`; 38 documentation and license files |
| P02: execution backlog | [81 mapped issues](planning/issue-backlog.md#github-identifier-map), all open with complete approved bodies, linked prerequisites, dispatch metadata, model labels, and `status:awaiting-kickoff` |
| P03: publication audit | Every published title, full body, dependency link, model label, conditional label, and milestone matches the approved source; this receipt and identifier map are published through the documentation follow-up PR |
| Application and controller | Neither implementation has started; no dependencies, runtime scaffold, controller code, CI workflow, or background scheduler was installed or created |

The four milestones preserve the November 11–14 target calendar dates.

| Milestone | Date | Open implementation issues |
| --- | --- | --- |
| [Day 1](https://github.com/DallasUrbanists/storytelling-studio/milestone/1) | November 11, 2026 | 20 |
| [Day 2](https://github.com/DallasUrbanists/storytelling-studio/milestone/2) | November 12, 2026 | 20 |
| [Day 3](https://github.com/DallasUrbanists/storytelling-studio/milestone/3) | November 13, 2026 | 19 |
| [Day 4](https://github.com/DallasUrbanists/storytelling-studio/milestone/4) | November 14, 2026 | 22 |

Six issues carry `scope:conditional`; the required first-film path still has
75 issues. Optional X-01/X-02 evaluations remain documented proposals, and
P01–P03 remain publication records without fabricated implementation issue
numbers. No repository permissions, branch protection, or security settings
were changed for publication.

The publication checks include `git diff --check`, local Markdown links and
anchors, metadata/dependency validation, and a read-back comparison of all
81 GitHub issue bodies and labels. Application tests remain unavailable and
were not run. Independent GPT-6.1 Terra review checked the documentation scope
and publication wording; it is a model review, not a human approval of research
claims or application behavior.

P03 becomes an accepted scheduling prerequisite when this publication receipt
and identifier map are merged into `main`; its evidence is that merged document
commit and the verified baseline above, not a GitHub implementation issue.
After a later explicit implementation kickoff, the first dependency-eligible
tasks are [D1-01](https://github.com/DallasUrbanists/storytelling-studio/issues/1)
and [D2-00](https://github.com/DallasUrbanists/storytelling-studio/issues/21).
Continuous controller execution additionally requires the separately documented
activation evidence. Publication alone starts neither task.

## Record a verified change

The implementing contributor should add a concise entry with the issue
identifier, commit, checked behavior, exact command or manual procedure, result,
artifact path, environment, and limitations. A failed or skipped test should
remain visible; a planned command must never be recorded as run.

The contributor should use `Planned`, `In progress`, `Implemented, verification
pending`, `Verified`, or `Blocked` as the status. A human approval must name its
reviewer, scope, source snapshot, and date; agents must not infer approval from
the presence of a source URL or from silence.

No implementation entries have been recorded in this planning-only package.

## D1-01 supervised attempt: verified locally

Attempt `D1-01-20261111-01` on `codex/d1-01-toolchain`, based on
`2c25993`, completed the Windows clean install, workspace imports, Chromium
launch, synthetic H.264 encoding, inspection, and decoding described in the
[receipt](planning/receipts/D1-01/D1-01-20261111-01.md). The lockfile was
unchanged; npm warned that the `@parcel/watcher` install script was not approved,
so file watching remains unverified. Integration is tracked in [PR #83](https://github.com/DallasUrbanists/storytelling-studio/pull/83).

Remotion identifies its GPL-2.0-or-later FFmpeg as using `fdk-aac-free`;
the installed binary reports GPL-2.0-or-later. The exact tagged source-to-binary
chain has not been independently verified. Redistribution and codec rights
require their own review; no binary is distributed by this change.
## D1-03 supervised attempt: verified locally

Attempt `D1-03-20261111-01` supplies a bounded bridge schema and an explicitly
synthetic fixture. The schema suite passed 21 cases and strict TypeScript
compilation passed on Windows with the pinned toolchain. The independent Terra
review identified unsupported variant overrides being silently accepted; the
validator now rejects unsupported fields, with regression coverage. Full
geometry validation, asset verification, variant-specific framing, and portable
package validation remain future work. See the
[receipt](planning/receipts/D1-03/D1-03-20261111-01.md) for limitations.

## D1-04 supervised attempt: verified locally

The pure bridge evaluator passed 34 core and schema cases and strict
TypeScript checking. Independent Sol review identified a high-latitude trace
fraction error; the implementation was corrected to use spherical rhumb-line
distance and checked against an 84-case numerical sweep. See the
[receipt](planning/receipts/D1-04/D1-04-20261111-01.md). Browser projection,
readiness, and pixel parity remain unverified.

## D1-02 supervised attempt: verified locally

The foreground development stubs, checkout-scoped status and cooperative
stop, and static and unit checks passed the Windows procedures in the
[receipt](planning/receipts/D1-02/D1-02-20261111-03.md). The integrated
`npm run check` passed lint, TypeScript, documentation checks, and 34 core
and schema tests. The npm dependency audit reports seven moderate findings
in the development-only lint chain; ESLint 9 is marked unsupported. No
editor, persistence, or export workflow is implied by these stubs.

## D1-05 supervised attempt: verified locally

The shared map adapter passed seven Chromium cases, including request
supersession, missing resources, deadlines, context loss, viewport failure,
and camera constraints. Independent Sol review reproduced the viewport and
camera problems and verified their fixes. The
[receipt](planning/receipts/D1-05/D1-05-20261111-01.md) records the commands
and limits. Vue and Remotion hosts, full Gate B fixture, parity, and export
remain unverified.
