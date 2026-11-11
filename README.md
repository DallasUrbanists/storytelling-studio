# Dallas Urbanists Storytelling Studio

Storytelling Studio is a planned local application for researching places and
making editable geographic explainer videos. Its Explore, Research, and Animate
workspaces are designed to reuse the same geographic features and source-backed
research.

The repository contains an **approved planning package**. There is no application
to run yet, and the four-day implementation sprint has not begun. See
[implementation status](docs/implementation-status.md) for the publication record.
The first production target is a Maple Avenue explainer covering Mockingbird
Lane to Oak Lawn Avenue in Dallas.

## Review the implementation plan

The [planning overview](docs/planning/README.md) introduces the architecture,
four-day sequence, risks, unresolved decisions, and proposed issue backlog.
The sprint dates are November 11–14, 2026, in America/Chicago.

Contributors can start with these documents:

- [Documentation index](docs/README.md)
- [Product specification](docs/planning/product-specification.md)
- [System architecture](docs/architecture/system-architecture.md)
- [Issue backlog](docs/planning/issue-backlog.md)
- [Persistent controller plan](docs/planning/agent-controller.md)
- [Implementation status](docs/implementation-status.md)
- [Contributor and agent rules](AGENTS.md)
- [Glossary](docs/glossary.md)

The planned authoring interface uses Vue, TypeScript, Quasar, and MapLibre.
An isolated React and Remotion package renders videos from shared TypeScript
contracts. Local SQLite persistence and portable `.gstory` project packages
support work without a cloud backend, account, or required AI subscription.

The development runbooks support parallel Terra/Sol workers with GitHub decision
replies and one merge coordinator. The controller is a separate proposed
development tool; it is not an application feature or an already running
service.

## Contribute

Beginners can use the [documentation plan](docs/planning/documentation-plan.md)
to find the intended learning path and the
[documentation style guide](docs/contributor-guides/documentation-style-guide.md)
to write or review an improvement. Application setup instructions will be added
alongside working code; proposed command contracts are explicitly marked in the
[testing and completion gates](docs/planning/testing-and-gates.md).

The owner approved publication of the planning package and backlog. A later
explicit implementation kickoff is required before application work begins;
controller development and activation require separate authorization.

Questions and proposals belong in the
[repository's issues](https://github.com/DallasUrbanists/storytelling-studio/issues).
Contributors should distinguish a proposed feature from a working capability and
include the relevant plan or issue reference.

## License

The owner selected the [MIT license](LICENSE) for original Storytelling Studio
work. Adapted documentation, dependencies, geographic data, and imagery retain
their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md).
