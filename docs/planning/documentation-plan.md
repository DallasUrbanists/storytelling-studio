# Documentation plan

You can use this plan to help a new storyteller or contributor find the next
useful explanation without assuming they know GIS, animation, or the project.
Documentation should grow with verified workflows and provide a recovery path
when an import, analysis, save, or render fails.

Status: planning baseline, November 11, 2026. The repository contains plans and
contracts, not working application tutorials. The proposed guide names in this
document are an implementation backlog; they are not links to existing guides.

- [Reader paths](#reader-paths)
- [Canonical homes and navigation](#canonical-homes-and-navigation)
- [Guides to create with implementation](#guides-to-create-with-implementation)
- [Windows-first contributor guidance](#windows-first-contributor-guidance)
- [User-guide requirements](#user-guide-requirements)
- [Diagrams and visual evidence](#diagrams-and-visual-evidence)
- [Troubleshooting and recovery](#troubleshooting-and-recovery)
- [Documentation completion checklist](#documentation-completion-checklist)
- [Maintenance and ownership](#maintenance-and-ownership)

## Reader paths

The documentation index should offer a recommended route for each audience.
An introduction should explain the outcome in ordinary language before naming
an internal package or implementation concept.

| Reader and goal | Recommended route now | Route after implementation |
| --- | --- | --- |
| Neighbor exploring the project | Root overview, product specification, Maple production plan, and glossary | A short example film and a verified first-story guide |
| Storyteller preparing a film | Maple scene sequence, evidence packet, and research methods | Create a project, import evidence, compose scenes, review, and export |
| Contributor starting development | Repository inspection, implementation status, architecture, and next eligible sprint issue | Verified Windows setup, focused change, relevant checks, and handoff |
| Data steward or research reviewer | Research methods, provider rights matrix, and Maple source tasks | Inspect source details, reproduce a snapshot, record a review, and resolve stale inputs |
| Reviewer checking a release | Testing gates, project and rendering contracts, and implementation status | Open the actual validation receipts, editable package, both videos, and approval record |

The [documentation index](../README.md) is the main navigation page. The
[glossary](../glossary.md) supplies common definitions, while each guide should
still explain a term briefly where it first affects the reader's task.

## Canonical homes and navigation

Each procedure or requirement should have one maintained home. Other pages
should summarize its purpose and link to it instead of copying a procedure
that can drift.

| Location | Responsibility |
| --- | --- |
| Root `README.md` | Explain the project, honest delivery status, and where to start |
| `docs/README.md` | Navigate by reader goal and distinguish existing documents from future guides |
| `docs/implementation-status.md` | Record verified capability, evidence, gaps, and dates |
| `docs/planning/` | Define desired outcomes, sprint sequencing, issue bodies, production tasks, and unresolved scope |
| `docs/architecture/` | Specify system boundaries, portable records, rendering, research methods, and roadway contracts |
| `docs/design/` | Define interaction patterns, accessibility, and ordinary Quasar interface requirements |
| `docs/contributor-guides/` | Explain development, focused validation, writing, and technical recovery once those procedures exist |
| `docs/user-guides/` | Explain one verified user action per guide, using names in the form `how-to-<action>.md` |
| `docs/test-procedures/` | Provide reproducible evaluations with expected outcomes and evidence records |
| `docs/policies/` | Maintain rules such as model routing without copying them into every issue |
| `docs/glossary.md` | Maintain recurring project terminology and its relationship to standard terms |

The author of a new or renamed document should update the documentation index
and repair relative links and heading anchors in the same change. Planned
filenames should remain code-formatted backlog entries until the actual file
exists; an empty user-guide directory needs no speculative instructions.

## Guides to create with implementation

The following inventory describes when a guide becomes useful and what evidence
is needed before it can claim to be runnable.

| Planned guide | Trigger and content | Verification before publication |
| --- | --- | --- |
| `contributor-guides/development.md` | Day 1 establishes actual tool versions, npm scripts, local storage, startup, and shutdown. | A clean Windows checkout can follow every command and identify readiness and persisted data. |
| `contributor-guides/testing-guide.md` | Day 1 introduces meaningful check and test scripts. | The listed commands exist, run from the documented directory, and have actual result records. |
| `user-guides/how-to-create-a-story.md` | A project can be created, saved, reopened, and previewed. | A nontechnical walkthrough follows actual control names without developer knowledge. |
| `user-guides/how-to-import-geographic-data.md` | Day 1 introduces supported GeoJSON in D1-11; Day 2 extends the same guide for additional geographic inputs. | Valid, invalid, missing-source, and wrong-coordinate-system cases have usable explanations. |
| `user-guides/how-to-compose-map-scenes.md` | Focus steps, scene order, layers, and variant framing work. | A walkthrough shows a reusable sequence with more than three focus steps. |
| `user-guides/how-to-use-a-network-walkshed.md` | A verified external analysis packet can be imported and inspected. | The guide explains the 600-second network model and rejects a plain distance buffer. |
| `user-guides/how-to-share-an-editable-project.md` | Portable export and atomic import pass their round-trip checks. | Another local data directory can reopen permitted assets and clearly report missing ones. |
| `user-guides/how-to-review-area-research.md` | Day 3 produces a supported snapshot and review interface. | The reader can inspect the exact area, vintage, method, uncertainty, and review outcome. |
| `user-guides/how-to-update-stale-research.md` | Changed input revisions are detected without losing old results. | The reader can understand the changed dependency and choose a valid recovery route. |
| `user-guides/how-to-explain-a-roadway-change.md` | Day 4 supports segment-aware existing and proposed street data. | The walkthrough distinguishes sourced dimensions from illustrative concepts and checks width totals. |
| `user-guides/how-to-export-a-video.md` | Both output variants and publication gates work. | The guide covers progress, cancel/retry, output discovery, rights blockers, and final playback review. |
| `test-procedures/render-parity.md` | Preview and video share the frame contract. | The procedure reproduces deterministic frame, aspect-ratio, missing-asset, and direct-seek checks. |
| `test-procedures/research-validation.md` | The selected Census method and approval invalidation exist. | Fixtures and one real supported snapshot expose incorrect allocation, missingness, and stale approval. |

The sprint issue that introduces a workflow should create or update its guide.
A day-end documentation task should reconcile navigation and status, not
postpone essential user instructions from every feature to the end of Day 4.

## Windows-first contributor guidance

The future development guide must start with Windows PowerShell and the actual
supported Node.js LTS and npm versions. Contributors should explain a checkout,
terminal, dependency, and package script when first needed, and recommend one
supported path before optional alternatives.

The guide must separate these lifecycle stages.

| Stage | Required explanation |
| --- | --- |
| One-time setup | Tools and versions, how they are obtained, working directory, dependencies, local settings, and safe example values |
| Start of each session | Actual repository startup command, readiness signal, how the browser connects locally, and what to check when startup fails |
| End of each session | How to stop processes, whether Ctrl+C is sufficient, which local services stop, and which project or job data persists |
| Recovery | How to preserve a project before repair, inspect the failed job or source, and restart safely without clearing useful evidence |

Authors must verify copyable commands against existing scripts and the selected
shell. They must not invent commands, ports, output text, screenshots, or UI
labels to make a planned system look complete. A proposed command contract can
remain in [testing and gates](testing-and-gates.md) with its introducing issue
until the implementation exists.

The contributor guide should explain local files without embedding a person's
absolute path. It should identify the project-owned data directory and the
scope of any cleanup operation, and explain backup and recovery before an
action that can discard data. The guide must not treat deleting all local data
as routine troubleshooting.

The [model routing policy](../policies/model-routing-policy.md) is the canonical
home for implementation model assignments. Contributor guides should link to
it rather than reproduce routing tables that can disagree with issue bodies.

## User-guide requirements

A user guide should help a storyteller finish one task. It must describe the
observed application rather than a speculative screen design, and it should
avoid source paths, terminal commands, package names, and architecture details
that do not help the reader choose an action.

The author should include the following in each guide:

- State the outcome, required inputs, and any relevant rights or evidence
  prerequisites before the steps.
- Use sequential steps with one main action each and the actual visible or
  accessible control labels in bold.
- Explain what success looks like and how to recover if the expected result
  does not appear.
- Identify effects on saved work, file inclusion, and publication approval
  before the consequential action.
- Explain unfamiliar mapping or research terms briefly and link to the
  glossary for more context.
- Use synthetic examples where possible, and label any real pilot example
  with its source, date, and evidence status.

The author must record the tested version and walkthrough evidence when a
workflow changes. Screenshots must come from that actual workflow and contain
no private data; mockups must be labeled as design mockups and must not appear
as proof that a feature works.

## Diagrams and visual evidence

The canonical planned user journey belongs in the
[product specification](product-specification.md). The canonical system and
data lifecycle diagrams belong in the
[system architecture](../architecture/system-architecture.md). Both use Mermaid
and must be accompanied by prose that communicates the same essential meaning.

Diagram authors should distinguish intended components from implemented
capabilities through the document's explicit status. A flow from import to
publication must show validation and review without implying that every draft
automatically becomes approved.

Visual evidence should help readers inspect a real result. A render comparison
can show matching frames, a research example can show the exact study boundary,
and a roadway example can show segment changes. Every informative image needs
alternative text; audio and video examples need captions or a transcript.

## Troubleshooting and recovery

The following scenarios define recovery coverage to implement and document.
They are planned behavior requirements, not messages already present in an
application.

| Situation | Information the guide must provide |
| --- | --- |
| Local service does not start | Check the documented runtime, dependencies, working directory, readiness output, and local conflict without losing project data. |
| Imported geometry appears in the wrong place | Inspect coordinate order, coordinate system, and source bounds; preserve original bytes before explicit correction. |
| Source file cannot be found | Identify the missing asset and expected hash, then relink or import a verified copy without substituting unrelated content. |
| Project archive fails validation | Explain the failed structural or asset check, preserve the current project, and provide a corrected-import route. |
| Research is incomplete or stale | Identify missing coverage or changed inputs, preserve the old snapshot, and explain recomputation or deliberate use of matching older revisions. |
| Walkshed is rejected | Identify missing network, origin, time-unit, barrier, or rights evidence and link to the producer handoff requirements. |
| Render stops or is canceled | Explain how to inspect job status and resume or restart from saved inputs, and how partial output is distinguished from final video. |
| Publication is blocked | Identify the precise unapproved claim or asset and its required review; never suggest bypassing the gate. |
| Portrait text is clipped | Inspect the portrait variant's framing and safe areas, then rerender and review that variant. |

Recovery instructions must preserve immutable evidence and avoid silent
replacement. When no supported recovery exists, the guide should name the
missing capability or required human decision and explain what useful work can
continue independently.

## Documentation completion checklist

The author and reviewer should complete this checklist with the actual changed
workflow, applying the full
[documentation style guide](../contributor-guides/documentation-style-guide.md).

1. Confirm that the opening explains the reader's task and the document's
    implementation status without relying on an earlier conversation.
2. Verify that every claimed command, control, screenshot, and result exists
    and matches the tested version, or is explicitly identified as planned.
3. Walk through prerequisites, steps, success indicators, and recovery from the
    reader's starting point.
4. Check source attribution, dates, license notices, and the distinction among
    facts, estimates, interpretations, and assumptions.
5. Check that glossary terms, schema names, and model-routing references agree
    with their canonical homes.
6. Review heading hierarchy, contents links, relative file links, Markdown
    tables, and accessible media in the rendered document.
7. Update navigation, affected guides, and implementation status together,
    recording checks run and remaining gaps.

New test procedures must begin their main sections with **When to use this
guide** and the two-column situation/outcome table required by the style guide.
Documentation-only changes need content and link review; they do not require
an unrelated application build or fabricated test receipt.

## Maintenance and ownership

The contributor changing a workflow should update its documentation in the
same change. The reviewer should reject stale instructions that prevent a
reader from completing the task, while keeping unrelated cleanup out of a
focused change.

The production owner should keep factual evidence and source approvals in the
project's evidence records, then update reusable methodology only when the
method changes. A per-film review does not rewrite the generic user guide into
a history of one work session.

The [documentation attribution record](../contributor-guides/documentation-attribution.md)
preserves the upstream Idea Map and Google notices. Maintainers should retain
those licenses when adapting the guide and add third-party notices when actual
assets or dependencies enter the repository.
