# Implementation status

You can use this record to distinguish inspected repository facts, proposed
behavior, and verified implementation. A written acceptance criterion does not
mean the feature or its test exists.

## Inspected baseline

The planning session inspected the following baseline on November 11, 2026.

| Item | Observed state | Consequence |
| --- | --- | --- |
| Local working directory | Empty before planning files were written; no `.git` directory | Git has not been initialized in this planning session |
| GitHub repository | Public `DallasUrbanists/storytelling-studio`, default branch name `main`, empty repository tree, no existing issues or pull requests | The initial commit and issue publication need the explicit planning approval |
| Local tools | Node `24.22.1`, npm `11.19.1`, Git `2.50.1.windows.1` reported by read-only probes | Compatibility remains unverified until bootstrap and export proof |
| FFmpeg | No `ffmpeg` executable found on `PATH` | Bootstrap must select and verify a supported render/inspection binary path |
| Application and tests | No application code, package manifest, lockfile, scripts, fixtures, or tests | Every command in the runbooks is a future contract until its issue implements it |
| Organization context | The user confirmed Dallas Urbanists is nonprofit/not-for-profit | Exact selected Remotion version and distribution obligations still require recorded review |

## Capability ledger

The following ledger records the initial implementation state. Contributors
should replace a status only with linked commit and verification evidence.

| Capability | Status | Required evidence |
| --- | --- | --- |
| Planning package | Draft for local review | Completed document/link audit; user approval before publication |
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
| GitHub backlog | Prepared locally, not published | Actual issue URLs mapped to stable identifiers after approval |
| Persistent execution controller | Planned separately; not built or activated | Complete readiness receipt, approved configuration, and explicit implementation kickoff |
| Parallel scheduling manifest | Prepared for the 81 application issues | Reviewed schedule hash, matched issue metadata, and verified dependency/resource handling |

## Planning validation

The additional continuous-execution requirement is specified in the
[controller contract](planning/agent-controller.md),
[scheduling manifest](planning/execution-schedule.md), and
[activation plan](planning/orchestration-activation.md). Local CLI discovery and
help output are recorded as capability evidence only; no model worker,
controller, GitHub decision question, or merge exercise has been run.

The initial planning review on November 11, 2026, checked 33 Markdown files and 496
local links, including heading anchors. The review found no broken local links,
unbalanced code fences, invalid embedded JSON, or whitespace/encoding errors.
It also checked the issue metadata, dependency references, dependency cycles,
and estimate totals: 81 implementation cards and five publication or optional
evaluation cards. Three Mermaid diagram sources received a source review;
they have not been rendered in this planning session.

These checks used temporary read-only audit commands, not application test
scripts. No application tests, dependency installs, Git commits, or GitHub
mutations were performed. The package remains local and awaits publication
approval.

The continuous-execution amendment adds three planning documents, bringing the
package to 36 Markdown files. Its 81 scheduling rows match the issue bodies'
dependencies, preferred models, and reasoning levels; the six conditional rows
remain separate from the 75 first-film rows. The planning review checked the
21 shared write groups and the acyclic dependency graph. The fourth Mermaid
source describes the controller lifecycle and has not been rendered. These are
documentation checks, not evidence of a running scheduler or a successful
phone-reply/recovery exercise.

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
