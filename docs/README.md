# Storytelling Studio documentation

You can run the integrated application, inspect its evidence, or review the
remaining product requirements using this index. [Implementation status](implementation-status.md)
is the canonical record of verified behavior. The [integrated delivery](planning/integrated-delivery.md)
replaces issue-by-issue execution for the current branch.

## Start with your task

| Your task | Start here |
| --- | --- |
| Make a geographic story | [User guide](user-guides/how-to-make-a-story.md) |
| Run and verify the application | [Repository quickstart](../README.md) |
| Assess the integrated deliverable | [Delivery and remaining production inputs](planning/integrated-delivery.md) |
| Review the planning package | [Planning overview](planning/README.md) |
| Check coverage of the requested handoff | [Deliverables map](planning/deliverables.md) |
| Understand the product and scope | [Product specification](planning/product-specification.md) |
| Continue implementation | [Agent rules](../AGENTS.md), then [integrated delivery](planning/integrated-delivery.md) |
| Coordinate continuous parallel work | [Controller contract](planning/agent-controller.md), [execution schedule](planning/execution-schedule.md), and [activation plan](planning/orchestration-activation.md) |
| Understand the technology boundaries | [System architecture](architecture/system-architecture.md) |
| Check a term | [Glossary](glossary.md) |
| Write or review documentation | [Documentation style guide](contributor-guides/documentation-style-guide.md) |
| Find evidence behind a dependency choice | [Dependency evidence](planning/dependency-evidence.md) |

## Four-day runbooks

The runbooks preserve the original sprint requirements. Implementation now
continues as one integrated change; their acceptance criteria are not themselves
claims of completed work.

- [Day 1: Functional MVP](planning/day-1-mvp.md)
- [Day 2: Geographic storytelling](planning/day-2-geographic-storytelling.md)
- [Day 3: Research and production](planning/day-3-research-production.md)
- [Day 4: Roadway transformation and production](planning/day-4-roadway-production.md)
- [Issue backlog and publication procedure](planning/issue-backlog.md)
- [Controller readiness and activation](planning/orchestration-activation.md)
- [Testing strategy and daily gates](planning/testing-and-gates.md)
- [Risks, fallbacks, and critical path](planning/risks-and-critical-path.md)

## Architecture and production contracts

The following specifications define the proposed behavior for implementation.

- [Repository and package architecture](architecture/system-architecture.md)
- [Project schema and portable package format](architecture/project-format.md)
- [Geographic rendering and video export](architecture/rendering-contract.md)
- [Research methods and provenance](architecture/research-methods.md)
- [Dimension-aware roadway editor](architecture/roadway-editor.md)
- [Quasar authoring design system](design/design-system.md)
- [Maple Avenue production and verification plan](planning/maple-production.md)

## Contributor guidance and project records

Contributors should keep user-facing instructions separate from implementation
contracts and historical evidence.

- [Model-routing policy](policies/model-routing-policy.md)
- [Documentation work and glossary maintenance](planning/documentation-plan.md)
- [Documentation attribution](contributor-guides/documentation-attribution.md)
- [Repository inspection](planning/repository-inspection.md)
- [Dependency and license evidence](planning/dependency-evidence.md)
- [Implementation status and next handoff](implementation-status.md)
- [Third-party notices](../THIRD_PARTY_NOTICES.md)

## User guides and screenshots

[Make a geographic story](user-guides/how-to-make-a-story.md) covers the current
authoring, research, roadway, recovery, and export controls. The delivery record
identifies the synthetic walkthrough and its limits.

The architecture contains Mermaid diagrams for system boundaries, user journeys,
and project lifecycle. Each diagram has a prose explanation so that its meaning
does not depend on visual rendering.
