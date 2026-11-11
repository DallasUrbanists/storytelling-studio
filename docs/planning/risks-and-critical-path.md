# Risks and critical path

The implementation lead can use this guide to decide which uncertainty to
resolve next and which milestone remains achievable. The four-day target begins
with an empty repository, so the plan must prove the rendering bridge before
committing to editor breadth.

- [Critical path](#critical-path)
- [Capacity and calendar](#capacity-and-calendar)
- [Risk register](#risk-register)
- [Partial milestones](#partial-milestones)
- [Unresolved decisions](#unresolved-decisions)
- [Reassess the plan](#reassess-the-plan)

## Critical path

The required dependency sequence is publication approval and repository
bootstrap → implementation kickoff → pinned
workspace → shared schema/evaluator → MapLibre readiness → Vue/Remotion parity →
both decoded exports → saved revisions → geographic story and portable package
→ approved research snapshot → dimension-aware roadway sequence → integrated
revision and final playback review.

The following work can proceed independently once its stated inputs stabilize.

| Lane | Work that can overlap | Required shared input |
| --- | --- | --- |
| Runtime and rendering | Bootstrap, shared evaluator, bridge, export jobs | Approved architecture and selected dependency versions |
| Sources and research | Source inventory, geometry verification, rights records, synthetic method cases | Source record contract and pilot boundaries |
| Editor and persistence | Bounded forms, layer controls, saved revisions, package handling | Stable project schema and proven render adapter |
| Roadway and production | Synthetic width solver, segment UI, narration and caption draft | Roadway schema; verified factual content before final assembly |

The [execution schedule](execution-schedule.md) makes these lanes concrete with
per-issue dependencies and exclusive resource groups. After implementation
kickoff and controller readiness, the controller automatically assigns eligible
work within the approved concurrency limit. It must not dispatch overlapping
contract writers or treat an unmerged dependency as available.

## Capacity and calendar

The issue list is deliberately more detailed than four daily headline tasks.
Its 15–45 minute estimates are focused coding or review slices with known
inputs; time to obtain missing evidence, solve an unknown compatibility issue,
or wait for a full render is additional.

The following totals are the sum of the scoped issue targets. They exclude
publication approval, additional integration/review, source response delays, and
long render waits.

| Day | Focused target | Schedule implication |
| --- | --- | --- |
| Day 1 | 13.5 contributor-hours | The bridge dominates; a single eight-hour day is a stretch even before editor integration |
| Day 2 | 12.5 contributor-hours | Transit/source work can overlap the package UI after contracts stabilize |
| Day 3 | 11.25 contributor-hours | Includes 3.5 hours of conditional history/income/imagery branches; the first-population path is 7.75 hours |
| Day 4 | 14.25 contributor-hours | Roadway constraints and final dual-format review need separate protected time |
| All 81 planned items | 51.5 contributor-hours | Add 25–40% integration/review contingency: roughly 64–73 hours |
| First-film path, 75 items | 48 contributor-hours | Excludes D3-10–D3-13 and D3-15/D3-16; with contingency, roughly 60–68 hours |

Controller adoption and activation are additional operational work. The
[activation plan](orchestration-activation.md) budgets 3.5 focused hours of
evaluation for an already suitable runner; new controller development has not
been estimated or authorized. Continuous scheduling reduces idle handoffs but
does not remove source waits, resource limits, review, or the merge bottleneck.

These estimates do not establish a guaranteed completion time. Two contributors
across four days offer about 64 nominal hours, leaving little margin even for
the first-film path; critical-path work, review, and external evidence still
constrain the result. A solo 32-hour window cannot responsibly promise every required
deliverable; the owner should choose a verified partial milestone or extend the
schedule if no additional authorized capacity is available.

## Risk register

The lead should keep the following risks visible until their evidence closes
them. A risk's presence is not proof that the failure will occur.

| Risk | Early signal | Mitigation and stop condition |
| --- | --- | --- |
| Vue/MapLibre and React/Remotion disagree | Camera or labels move after repeated seeks; blank frames | Prove Gate B first with one fixture; use only the approved static fallback, otherwise stop dependent editor expansion |
| WebGL or font readiness varies | Timeouts or image diffs after identical input | Pin environment and resources, wait on explicit readiness, retain failing frames; do not increase sleeps until output appears |
| Render/codec binary unavailable on Windows | Fixture cannot decode or inspect | Select and document a compatible local binary during bootstrap; do not call a file's existence a valid export |
| Save/export races | Export uses unsaved or changing data | Pin immutable revisions and content-addressed assets; reject stale saves and test recovery |
| Archive import exposes filesystem paths | Traversal or oversized package passes validation | Implement extraction limits and hash checks before general import; get owner review of the security boundary |
| Transit or GoLink data unavailable or stale | No authoritative geometry/date/reuse record | Record unavailable evidence and continue independent authoring; a reviewed source-backed finding of no applicable GoLink connection is valid, while an unknown is not |
| Walkshed method is not reproducible | Polygon supplied without origins, duration, graph, or barrier assumptions | Require metadata and inspect external network result; label a buffer as a buffer and leave the walkshed gate incomplete |
| Population allocation overstates precision | Partial Census units counted in full or simple areas called exact | Use the declared estimation method with overlap accounting and limitations; reject unsupported exact claims |
| History or income is incomparable | Different universes, boundaries, overlapping estimates, or summed medians | Enforce comparability gates and omit affected claims pending evidence |
| Imagery cannot be redistributed or is unsuitable | Missing acquisition/rights metadata, poor scene resolution | Use only cleared usable assets, or record the conditional omission and retain the open vector-map baseline |
| Roadway dimensions are unverified | Generic widths silently become Maple facts | Separate documented, estimated, and proposed dimensions and label each; no implied engineering approval |
| Roadway layout is infeasible | Locked widths exceed the envelope | Show unsatisfied constraints and require a deliberate edit; never shrink locked widths silently |
| Issue scope expands | The first slice exceeds 45 minutes or touches unrelated subsystems | Reassess at 60 minutes, split, and recalculate the milestone forecast |
| Human decisions delay merge | Security/license/source approval absent | Prepare the concrete evidence and draft change first, then request the specific decision; continue only independent work |
| Full film review is squeezed out | Both files exist but no full playback | Reserve review and rerender time; label the result a candidate until playback and factual gates pass |
| Controller assumed to exist | CLI help succeeds but no end-to-end dispatch/recovery evidence | Pass the separate readiness checklist; do not hide controller construction in application bootstrap |
| Host sleeps, restarts, or loses network | Missed heartbeats or GitHub poll failures | Persist state and reconcile on restart; keep the authorized host awake during the run, and disclose that replies cannot be processed while it is offline |
| Duplicate writers or merges | Old worker survives a lease timeout or a second coordinator starts | Fence attempts, verify process termination, quarantine uncertain worktrees, and enforce one integration owner |
| GitHub reply is untrusted or stale | Answer comes from another account or references an obsolete decision revision | Parse only the exact reply protocol from approved numeric GitHub user IDs; bind approvals to the reviewed scope and preserve an audit receipt |
| Retry loop consumes resources | Repeated unchanged error, model relaunches, or API throttling | Persist bounded attempt counters and backoff; block the affected issue, then continue other eligible work |
| Shared machine capacity is exceeded | Concurrent renders, reused ports, or test data collisions | Use isolated checkout data and ports, two worker slots initially, and a singleton render lease |

## Partial milestones

The implementation lead should select the highest fully verified state when
capacity or evidence is insufficient. The following states keep useful work
without claiming the full request is complete.

| Verified state | Useful deliverable | Still incomplete |
| --- | --- | --- |
| Render proof | Small reproducible fixture and both decoded videos | Usable authoring, saving, Maple content, and later features |
| Day 1 editor | Saved editable map story and both formats | Transit, network walkshed, package exchange, research, and roadway tools |
| Geographic cut | Verified geographic/transit sequence and portable project | Approved quantitative/historical claims and roadway redesign |
| Research cut | Geographic cut plus approved first population result | Required roadway tooling, mapped reallocation, and final integration; unsupported conditional scenes can be omitted with reasons |
| Roadway demonstration | Editable synthetic or clearly estimated conceptual layout | Verified Maple dimensions and a complete fact-cleared pilot |
| Candidate pilot | Both full videos and editable project | Any missing approval, source, dimension, rights, or full-playback gate |

The lead must keep omitted required work open in the backlog. The first film
requires the geographic story, applicable transit, network walkshed, approved
population result, mapped roadway reallocation, and both outputs; conditional
history and imagery can be omitted with evidence-based reasons, and income is
optional for this film. An unsupported optional capability remains accurately
deferred without becoming a new first-film blocker.

## Unresolved decisions

The following decisions require evidence or owner judgment before the affected
gate. Ordinary implementation choices inside the approved contracts do not need
repeated approval.

| Decision | Owner and latest useful point | Proposed default |
| --- | --- | --- |
| Approve documentation publication and backlog creation | Repository owner before initial commit/backlog creation | Publish the reviewed package, then end the planning phase |
| Start implementation | Repository owner in a later explicit kickoff or implementation session | Activate the approved branch/PR/merge/close workflow without repeated ordinary confirmations |
| Select and activate the persistent runner | Implementation lead after documented readiness; owner for concrete permissions and any new controller build | One local supervisor, two worker slots, one merge coordinator, GitHub polling; no cloud webhook service |
| Confirm sprint capacity and acceptable partial milestone | Repository owner before committing to calendar dates | Preserve correctness gates; extend time or accept a named partial state |
| Select exact dependency, Remotion, Chromium, and media-binary versions | Implementer during D1-01, owner for unresolved license obligations | Node 24 LTS with a tested compatible pinned set |
| Accept loopback-service and archive-import security controls | Repository owner on concrete D1-15 and D2-15 review | Loopback only, narrow origins/session authorization, bounded extraction, no secrets in packages |
| Confirm Maple study-area/editorial boundary and research review authority | Pilot owner before approving Day 3 results | Clearly labeled editorial geography and a named reviewer |
| Accept measured versus estimated roadway dimensions | Pilot owner before final roadway factual approval | Publish estimates only when visible as estimates, never as surveyed facts |
| Clear each imagery asset for display, export, and package redistribution | Asset/research reviewer before imagery import approval | Omit unverified assets |

## Reassess the plan

At each day's start, the lead should verify the predecessor gate and identify
the next critical-path issue. At each 60-minute issue reassessment, the lead
should record elapsed time, remaining work, any new evidence dependency, and a
revised target without rewriting failed history as success.

At each day's end, the lead should record the highest passed gate, actual
artifacts, pending human decisions, and the next eligible issue in
[implementation status](../implementation-status.md). The next runbook should
begin from that evidence even if the calendar day has advanced.
