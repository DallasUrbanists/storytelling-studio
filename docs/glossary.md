# Glossary

You can use this glossary to understand Storytelling Studio's planning documents
without a software, mapping, or animation background. These are the canonical
meanings for this project; a term's inclusion does not mean its feature is
implemented.

Status: documentation baseline, November 11, 2026. Product terms describe the
planned design. External organization and service descriptions identify their
sources and do not establish that Storytelling Studio integrates with them.

- [Software and local work](#software-and-local-work)
    - [Development basics](#development-basics)
    - [Runtime and libraries](#runtime-and-libraries)
- [Geography and mapping](#geography-and-mapping)
- [Research and evidence](#research-and-evidence)
- [Stories and animation](#stories-and-animation)
- [Streets and transportation](#streets-and-transportation)
- [Dallas Urbanists context](#dallas-urbanists-context)
- [Use these terms consistently](#use-these-terms-consistently)

## Software and local work

The following terms explain both development work and the selected software.
The [system architecture](architecture/system-architecture.md) provides the
full planned boundaries.

### Development basics

The following terms help a first-time contributor understand an implementation
issue without assuming prior experience using development tools.

| Term | Meaning in plain language |
| --- | --- |
| Repository | A project and its tracked file history; a folder of draft files does not have Git history until Git is initialized. |
| Git | A tool that records versions of files and helps combine changes from different contributors. |
| GitHub | A service that hosts Git repositories and provides issues, reviews, and related collaboration tools; it is separate from Git itself. |
| Clone | A local copy of a Git repository and its history, obtained from another location such as GitHub. |
| Checkout | The files selected from a repository version for work on your computer; the term can also mean switching to a selected branch or version. |
| Branch | A named line of work in Git, allowing a change to be prepared before it is combined with the main project. |
| Commit | A recorded set of file changes in Git with an identifier and message; saving a file alone does not create a commit. |
| Pull request (PR) | A proposal on GitHub to review and combine a branch's changes; opening one does not automatically merge it. |
| Code review | Inspection of a proposed change for correctness, clarity, and relevant evidence before acceptance. |
| Merge | Combining accepted changes into another branch, such as `main`. |
| Issue | A tracked task, bug, or question; this planning package contains draft issue bodies that have not automatically been published to GitHub. |
| Dependency | Software the project uses, such as a library needed to display a map. |
| Lockfile | A file recording exact resolved dependency versions so installs can be reproduced; npm commonly uses `package-lock.json`. |
| Package script | A named project command defined in `package.json`, such as a future check or startup task; a planned name is not a runnable command. |
| Terminal | A window where you type commands and read their output. |
| PowerShell | The command shell used for the project's Windows-first instructions; commands written for another shell can require different syntax. |
| Working directory | The folder a terminal command runs from, which affects how relative paths are interpreted. |
| Localhost | A name for your own computer in a local network connection; it is not a public deployment address. |
| Port | A numbered connection endpoint used by a local service; two services can conflict when both try to use the same port. |
| Build | A process that prepares source files into runnable or distributable application files. |
| Test | A check of expected behavior using chosen inputs; a passing test proves only the behavior that check covers. |
| Continuous integration (CI) | Automated checks triggered by repository changes; the project must configure them before claiming they run. |
| Migration | A controlled change to stored data or its structure, with compatibility and recovery considerations. |
| JSON | A text format for structured data using objects, lists, and values; GeoJSON uses that format for geography. |
| Validation | Checking that input or output meets defined rules, such as requiring a polygon's boundary to close. |
| Release | A named, reviewed version offered for use; a local draft or successful build is not automatically a release. |
| Git worktree | A separate folder and working branch that shares a repository's history. Each worker gets its own files; ports, data, credentials, and running processes still need separate controls. |
| Agent controller | A proposed development tool that assigns ready issues to workers and records progress. It is separate from the Storytelling Studio application; see the [controller plan](planning/agent-controller.md). |
| Worker | A Terra or Sol process assigned one bounded implementation or review task. Finishing a worker run does not by itself prove the issue passed. |
| Merge coordinator | The single role allowed to integrate PRs during controller operation, after verifying current checks, reviews, and required decisions. |
| Task dependency | Work that must be accepted before another task can start, such as a saved-project schema before its editor controls. This differs from a software-library dependency. |
| Lease | A temporary reservation for a worker slot or shared resource. An expired lease requires recovery checks; it does not prove the previous process stopped. |
| Fencing token | An attempt number used to reject results from an obsolete worker, so a recovered issue cannot be overwritten by an old run. |
| Idempotent operation | An action that can be retried without producing another result, such as recognizing an already-posted decision question instead of posting a duplicate. |
| Persistent execution state | The durable record of attempts, decisions, PRs, and pending actions that lets a controller recover after restarting. |
| Decision request | A structured question on a GitHub issue with a specific reply format and scope. An authorized reply can resume the affected task while unrelated work continues. |

### Runtime and libraries

The following terms explain the selected stack and what stays on the author's
computer. No listed library is installed merely because it appears in this
glossary.

| Term | Meaning in this project |
| --- | --- |
| Application programming interface (API) | A defined way for one program to request data or actions from another; a public data API can have access conditions even when its data is free. |
| Local-first | The author's computer holds the editable project and can perform the core workflow from acquired local assets; an initial download can still require internet access. |
| Node.js | The selected JavaScript runtime for the local service and development tools. |
| Long-term support (LTS) | A software release line maintained for an extended period; the project must record the selected Node.js version rather than assume every LTS line is compatible. |
| npm | The selected tool for installing JavaScript dependencies and running repository scripts once those scripts exist. |
| Workspace | A related package within one npm-managed repository, or the repository folder itself when discussing local files; context should make the meaning clear. |
| TypeScript | The language selected for the application and shared logic, with types that help describe and check data contracts. |
| Vue 3 | The framework selected for the ordinary application interface. |
| Quasar | The required Vue component framework for ordinary interface controls, layout, and interaction patterns. |
| React | The framework used only at the Remotion video boundary; it is not the general application interface framework. |
| Remotion | The selected video composition and rendering technology, isolated behind a TypeScript data contract. |
| MapLibre GL JS | The selected map display library; using it does not provide imagery, geographic data, or rights to a tile service. |
| Turf | The selected JavaScript geometry toolkit for initial geographic operations, subject to method-specific validation. |
| SQLite | The selected local database for project persistence and related records. |
| Electron | A possible later desktop wrapper; it is not a prerequisite for the four-day browser-and-local-service workflow. |
| DuckDB Spatial | A possible later local analytical engine and spatial extension; it is not the first research pipeline. |
| Schema | The rules that define valid data fields, types, values, and references. |
| Adapter | A boundary that translates an external format or service into the project's own data contract. |
| Fixture | Deliberately chosen test input, often synthetic, used to check a behavior; a synthetic fixture is never evidence about Dallas. |
| Hash | A digest used to identify exact saved content; a matching hash supports reproducibility but does not prove accuracy or permission. |

## Geography and mapping

The following terms separate real-world places from their digital
representations. The [research methods](architecture/research-methods.md)
explain how the project must validate and use them.

| Term | Meaning in this project |
| --- | --- |
| Geographic information system (GIS) | Software and methods for working with data tied to locations. |
| Geometry | The coordinates that describe a point, line, or area. |
| GeoJSON | A JSON-based geographic format for points, lines, polygons, and their properties; coordinates use longitude followed by latitude. |
| Feature | A named geographic object with geometry and properties, such as a corridor, station, or study area. |
| Feature revision | One immutable version of a feature's geometry and provenance, identified separately from the editable feature. |
| Polygon | An area enclosed by a boundary, optionally with interior holes. |
| MultiPolygon | Several polygon parts stored as one geometry, useful for an area with disconnected pieces. |
| Coordinate reference system (CRS) | The reference that gives coordinates their meaning; conversion is necessary when a source does not use the project's geographic coordinates. |
| Projection | A rule for representing the curved Earth on a flat map; a display projection is not automatically suitable for measuring area. |
| Geodesic measure | A distance or area calculation that accounts for the Earth's curved reference surface. |
| Basemap | The geographic background that helps viewers orient themselves, such as roads, water, or imagery. |
| Tile | One piece of a map's geographic content, requested or loaded separately; data rights and the tile server's usage policy are distinct. |
| Vector data | Coordinates and attributes describing geographic objects. |
| Raster data | A grid of pixels or measured cells, such as aerial imagery or an analysis surface. |
| Orthophoto | Aerial imagery corrected to align with map coordinates; correction does not imply survey-grade precision. |
| Corridor | The selected linear extent and related study context along a street or connection. |
| Study area | The exact area selected for a research question or story, which can be editorial rather than an official boundary. |
| Buffer | A distance envelope around a point, line, or area; it does not by itself represent travel through a street network. |
| Walkshed | A modeled area reachable through a pedestrian network within a stated time or distance budget, with origins and assumptions recorded. |
| Multi-origin walkshed | The union of reachable areas from several starting points; the Maple target uses origins along the corridor and a 600-second budget. |
| Network | Connected edges and nodes representing permitted paths; a geometric crossing does not always mean a usable connection. |
| Origin | A starting point for network analysis, selected and connected to the network under documented rules. |
| Vintage | The date or release period represented by a dataset, distinct from the date it was downloaded. |
| TIGER/Line | A Census geographic data product used here as a candidate source of reporting-area boundaries and initial basemap context. |
| NAIP | The National Agriculture Imagery Program, a candidate source of USDA aerial imagery; it is not satellite imagery. |
| Sentinel-2 | A Copernicus satellite mission and data source considered for regional imagery context. |

## Research and evidence

The following terms explain why an area-specific statistic needs more than a
number and a source name.

| Term | Meaning in this project |
| --- | --- |
| American Community Survey (ACS) | The Census sample survey used for the first planned population pipeline; five-year estimates describe a period. |
| Census block | A small Census geographic unit; it is not necessarily a city block. |
| Block group | A collection of Census blocks within a tract and a reporting geography available in ACS five-year data. |
| Census tract | A statistical reporting area containing block groups; it does not necessarily match a neighborhood. |
| Geographic identifier (GEOID) | A string identifying a Census geography; leading zeros and geographic level matter. |
| Universe | The population a measure describes, such as all people, households, or occupied housing units. |
| Additive count | A quantity that can be summed across compatible, nonoverlapping groups, such as a population count. |
| Area-weighted allocation | A model that assigns part of a source area's count according to its proportion of overlapping area, assuming uniform distribution over the chosen support. |
| Dasymetric allocation | Allocation using another spatial dataset to locate likely support for a quantity; the support data and assumptions need their own validation. |
| Rate or percentage | A numerator divided by a compatible denominator; averaging source percentages is not generally a valid way to combine them. |
| Median | The midpoint of an ordered distribution; averaging block-group medians does not yield the selected polygon's median. |
| Margin of error (MOE) | A measure of an estimate's sampling uncertainty at a stated confidence level; it does not automatically cover spatial allocation error. |
| Covariance | How errors or variation in two estimates relate; it matters when combining uncertainty. |
| Harmonization | A documented process for making geographic units, definitions, or units comparable across datasets or periods. |
| Research snapshot | A frozen result with exact area revision, sources, method, parameters, uncertainty, and review information. |
| Source manifest | A record of each source's identity, dates, files, hashes, rights, credit, and transformations. |
| Provenance | The traceable history of where an input came from and how it changed. |
| Stale | A relationship to selected inputs has changed since a result or approval was created; the old snapshot remains readable but requires review for new use. |
| Fact | A claim checked against identified evidence, subject to its scope and date. |
| Estimate | A value inferred from measurements or a model, with assumptions and uncertainty. |
| Interpretation | An author's explanation or judgment about evidence, kept distinct from direct observation. |
| Assumption | A chosen condition that has not been established as an observed fact. |
| Reviewed | Someone recorded a review; the outcome need not be approval. |
| Approved | A named reviewer accepted the stated use of exact inputs or outputs; approval does not silently carry over after those inputs change. |

The Census [five-year data catalog](https://www.census.gov/data/developers/data-sets/acs-5year.html)
and [statistical testing guidance](https://www.census.gov/programs-surveys/acs/guidance/statistical-testing-tool.html)
provide the source context for the ACS definitions. The definitions of the
project's snapshots, approvals, and allocation methods are local design terms.

## Stories and animation

The following terms have distinct roles in the planned editor. The
[rendering contract](architecture/rendering-contract.md) describes how their
saved values must produce frames.

| Term | Meaning in this project |
| --- | --- |
| Project | The editable story, its scenes, sources, geometry, research, and assets. |
| Project revision | One complete immutable saved state of a project. |
| Scene | A timed section of the story with a purpose, camera behavior, visible layers, and annotations. |
| Layer | One ordered visual group, such as roads, a study-area outline, stops, or labels. |
| Focus | A feature or area the author wants a scene to emphasize or frame; it is not automatically a research boundary. |
| Camera | The map view's geographic center, zoom, bearing, and supported orientation. |
| Keyframe | A saved value at a particular animation frame, used to define how a property changes over time. |
| Frame | One still image in a video sequence. |
| Frames per second (fps) | How many frames form one second of video; the first planned format uses 30 fps. |
| Timeline | The sequence and timing of scenes and layer appearances. |
| Easing | A rule describing how a visual change accelerates or slows between saved states. |
| Interpolation | Calculation of an intermediate visual value; it must not imply that unobserved statistical data were measured. |
| Preview | An authoring view used to inspect timing and composition before export. |
| Render | The process of evaluating saved story data and producing frames or video. |
| Deterministic rendering | Producing the same evaluated frame from the same project, frame number, assets, and render environment, within documented tolerances. |
| Output variant | An intended frame shape, such as portrait or landscape, with its own framing and label overrides. |
| Safe area | The region where critical text and credits should remain legible and clear of expected display overlays. |
| Template | A reusable data-only arrangement or style, resolved to saved values for a project. |
| Portable project package | A `.gstory` archive containing the story and permitted assets plus a manifest; a video is a separate output. |

## Streets and transportation

The following terms keep a street-design concept separate from a verified
existing condition or engineering conclusion.

| Term | Meaning in this project |
| --- | --- |
| Roadway segment | A defined length of corridor with its own documented conditions and proposed arrangement. |
| Cross-section | The arrangement and widths of street elements across a selected segment. |
| Top-down view | A plan view looking down at the roadway, used to show how space changes along it. |
| Existing condition | A sourced description of the street at a stated time; an unsourced illustrative starting layout is not an existing-condition record. |
| Proposed condition | An editorial or design concept describing a possible future layout; it is not automatically approved or feasible. |
| Road diet | Reallocation of roadway space, commonly including fewer motor-vehicle through lanes; the pilot explores a four-to-three concept subject to segment evidence. |
| Four-to-three conversion | A concept changing four through lanes to two through lanes and a center turn lane, with other space assigned according to the particular design. |
| Protected bicycle space | Bicycle space separated by a stated physical treatment; a painted line alone must not be described as physical protection. |
| DART | Dallas Area Rapid Transit, the transit provider whose verified rail, bus, stop, and service-area data may support the pilot. |
| General Transit Feed Specification (GTFS) | A format for transit data; the format does not grant a license to a particular feed. |
| GoLink | DART's on-demand service within designated zones, not a fixed scheduled route. |

The official [DART GoLink page](https://dart.org/guide/transit-and-use/golink)
supports the service definition, checked on November 11, 2026. A particular
zone, service date, or geometry still requires separate verification for the
pilot.

## Dallas Urbanists context

The following meanings help contributors understand the pilot's community
context without assuming private organizational knowledge.

| Term | Meaning and source |
| --- | --- |
| Dallas Urbanists | The organization sponsoring this project; its [public site](https://dallasurbanists.org/) describes its work around more walkable neighborhoods. |
| Hyperlocal Conversations | Dallas Urbanists' neighborhood-focused monthly gatherings where neighbors discuss improving walkability, as described on its [official site](https://dallasurbanists.org/hyperlocal). |
| Neighborhood Walk Audit | In this project, a structured neighborhood walk used to record observed walking conditions and possible improvements; this is project usage, not a claim that an organization-wide audit protocol has been verified. |
| Idea Map | Dallas Urbanists' separate community project for sharing and exploring ideas about places, described in its [repository README](https://github.com/DallasUrbanists/idea-map/blob/f9f490e33d29a2acd7ab1ff0d02dc748002a8eb3/README.md); Storytelling Studio borrows its documentation guidance but does not assume its architecture or integration. |
| Maple pilot | The planned first story for Maple Avenue between Mockingbird Lane and Oak Lawn Avenue, with its geography and evidence still requiring validation. |
| Oak Lawn study boundary | The specific area selected for this story; an editorial polygon must not be represented as an official neighborhood boundary. |

The organizational sources were inspected on November 11, 2026. No definition
here establishes participant consent to publish walk-audit notes, photos, or
personal information; actual contributed material needs its own publication
review.

## Use these terms consistently

Authors should define an unfamiliar term briefly where it first matters and
link here when additional context helps. New terms belong in this glossary
only when they clarify a recurring project concept; code identifiers should
continue to follow the canonical schema rather than a prose synonym.

Authors must not use *walkshed* for a plain buffer, *approved* for a review with
no approval outcome, *current population* for an undated period estimate, or
*official boundary* for an editorial study area. These distinctions protect
the meaning of the story, not just its vocabulary.
