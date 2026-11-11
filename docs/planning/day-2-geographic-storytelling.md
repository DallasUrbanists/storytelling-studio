# Day 2: build the geographic story and portable project

On Thursday, November 12, 2026, the implementation team targets a flexible
Dallas → Oak Lawn → Maple story with sourced landmarks and transit, persistent
layers, a real ten-minute network walkshed, and portable editable exchange.
The focus sequence must support as many ordered steps as the story needs.

- [Starting conditions](#starting-conditions)
- [Controller execution](#controller-execution)
- [Inputs and source preparation](#inputs-and-source-preparation)
- [Execute the bounded issues](#execute-the-bounded-issues)
- [Run the acceptance procedure](#run-the-acceptance-procedure)
- [Stop and hand off](#stop-and-hand-off)

## Starting conditions

The required Day 1 editor, save/open, and both export gates must be verified
before the complete Day 2 workflow can finish. Independent source and schema
issues can start earlier when their listed prerequisites exist; a date change
does not waive a failed dependency.

The 20 [Day 2 issue bodies](issues-day-2.md), including D2-00 preparation, total
750 target minutes, or 12.5 focused contributor-hours before additional review
and external waits. The source preparation lane should begin during Day 1 where
authorized capacity permits; a roughly state-sized source download and GIS tool
setup cannot be treated as a zero-time prerequisite.

## Controller execution

The activated controller must follow the exact dependencies, conditional flags,
and narrow write leases in [the execution schedule](execution-schedule.md).
It can run focus controls and camera fitting together, or acquire the real
network packet while independent synthetic importer work proceeds; each worker
uses its own worktree, data root, service ports, and outputs.

Source outcomes must use the schedule's typed gate receipts. A blocked network
acquisition or unknown GoLink applicability can be documented without falsely
releasing a real-data consumer, while unrelated package/editor work continues.
Authorized GitHub questions persist across restarts and a valid answer resumes
only the affected work; the single coordinator owns integration and issue closure.

## Inputs and source preparation

The data steward or GIS analyst should stage the external tool and dated
pedestrian graph in D2-00, then produce one result in D2-10 using
[the external network-walkshed procedure](maple-production.md#produce-one-external-network-walkshed).
The handoff includes the polygon, reachable network, origins, source/version
metadata, walking assumptions, 600-second duration, CRS, and limitations.

The geographic source set must cover Maple Avenue between Mockingbird Lane and
Oak Lawn Avenue, with verified Downtown, Love Field, and Parkland references.
An editorial Oak Lawn extent must be labeled editorial. Transit inputs must
retain actual provider, dates, identifiers, and rights for rail stations,
stops/routes, bus layers, and applicable GoLink service polygons. A source-backed
reviewed finding that no GoLink connection applies is a valid factual outcome;
missing or unverified coverage is different and remains unresolved.

The implementer should keep real acquired assets in the documented local data
root and commit only permitted small fixtures or metadata. A missing real source
does not block independent importer/UI work, but the actual production layer
must remain unresolved until it has evidence.

## Execute the bounded issues

The lead should follow the complete dependencies in the
[Day 2 issue bodies](issues-day-2.md). The following sequence shows the main
integration points.

| Lane/order | Issues | Result |
| --- | --- | --- |
| Early data preparation | D2-00, D2-04 | Runnable external GIS tool/graph and verified pilot geography |
| Flexible focus | D2-01 through D2-03 | Ordered reusable focus steps with variant-aware fitting and keyboard reorder |
| Transit | D2-05 through D2-07 | Bounded source adapters and clear station/stop/route/GoLink semantics |
| Persistent presentation | D2-08, D2-09 | Scene settings, Keep visible intervals that retime on reorder, and geometry-aware route traces |
| Real network study area | D2-10 through D2-13 | Actual 600-second result, validated import, technical review, and saved overlay |
| Portable exchange | D2-14 through D2-17 | Complete manifests, security-reviewed extraction, atomic import, and clean-root round trip |
| Story and gate | D2-18, D2-19 | Sourced geographic sequence and Gate D evidence |

Terra should implement known-contract forms and import metadata, while Sol
handles focus geometry, transit joins, real network analysis review, archive
security, and atomic storage integration. The owner must review the concrete
archive security boundary before it merges; ordinary controls do not need
repeated permission requests.

## Run the acceptance procedure

After the introducing issues implement and verify the relevant commands, the
gate owner should use the canonical lifecycle, then run the following checks
from the repository root.

```sh
npm run check
npm run test:core
npm run test:package
npm run test:render-contract
npm run test:smoke
```

The gate owner should then complete the real-pilot walkthrough.

1. Author more than three focus steps, reorder them, and verify Dallas, editorial
   Oak Lawn, Maple, and landmark framing in both variants.
2. Toggle and style transit groups independently, keep a layer visible across
   multiple scenes, reorder/retime scenes, and confirm the saved intervals.
3. Inspect the actual network walkshed's origin and barrier evidence, then reveal
   it with its ten-minute network label and visible method limitations.
4. Save, reopen, export a `.gstory` package, import it into a clean local data
   directory, and verify all editable state and permitted assets.
5. Render both variants from the imported project and compare source, method,
   revision, and frame evidence with the original.

Gate D also requires malicious/invalid archive tests and missing-resource
handling. A radius buffer cannot satisfy the walkshed requirement, and a package
that secretly depends on the original machine's absolute paths is not portable.

## Stop and hand off

The geographic milestone remains partial if a required real layer, network
method, source right, or portable round trip is unavailable. The team can retain
working importer capabilities and the geographic cut, but must name the missing
production evidence and leave the corresponding gate open.

The worker should save, stop its own local services, and submit the actual source
manifest, walkshed bundle/review, project revision, package hash, and test
evidence in its issue receipt. The coordinator promotes the verified immutable
sources and updates [implementation status](../implementation-status.md) and the
shared production ledger in the same reviewed pull request.
The optional in-app generation evaluation must not delay the approved imported
walkshed path or become an unestimated general routing engine.
