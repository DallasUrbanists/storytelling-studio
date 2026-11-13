# Project format and portable packages

Contributors can use this contract to preserve an editable story across saves,
exports, and another person's computer. A `.gstory` file contains project data,
permitted assets, research snapshots, and source records; a rendered video is a
separate output of that project.

**Status: bounded bridge schema implemented; portable format planned.** The
version 1 bridge parser includes the research records described below. The full
portable format, package tests, and import/export implementation remain
planned. The illustrative excerpt describes the intended format, not an
importable bridge document.

- [Document and revision identities](#document-and-revision-identities)
- [Project document records](#project-document-records)
- [Schema invariants](#schema-invariants)
- [Illustrative project excerpt](#illustrative-project-excerpt)
- [Source records and lineage](#source-records-and-lineage)
- [Research snapshots](#research-snapshots)
- [Scenes, layers, and templates](#scenes-layers-and-templates)
- [Archive layout and manifest](#archive-layout-and-manifest)
- [Asset rights and missing resources](#asset-rights-and-missing-resources)
- [Safe import procedure](#safe-import-procedure)
- [Versioning and migration](#versioning-and-migration)
- [Round-trip acceptance](#round-trip-acceptance)

## Document and revision identities

The first format separates three identities that serve different purposes.

| Identity | Meaning | Changes when |
| --- | --- | --- |
| Project ID | The local editable story | The author imports a package as a new local project or duplicates a story. |
| Project revision ID | One complete immutable save | The author commits any project change. |
| Feature revision ID | One immutable geographic geometry | The author changes that feature's geometry or its geometry provenance. |

The project document must contain a stable project ID, while its saved revision
ID belongs to the storage envelope. The package manifest must record the source
revision ID and document hash. Importing a package must create a new local
project ID and retain the original project and revision identities in an
`origin` record, so repeated imports do not overwrite existing work.

A feature is an editable named object, such as a neighborhood, corridor, route,
or point. Its `currentRevisionId` identifies the geometry currently selected for
new work. Scenes and research snapshots must reference explicit feature
revision IDs; changing a boundary must not silently change an already approved
statistic or an exported film.

The studio must offer a deliberate **Use updated geometry** action for scenes
that reference an older revision. That action creates a new project revision
and marks affected research relationships for review. The initial build must
retain referenced older geometries rather than attempt automatic history
compaction.

## Project document records

The `ProjectDocument` object is the portable source of truth. The local service
stores complete copies of it as described in
[persistence and revisions](system-architecture.md#persistence-and-revisions).

| Field | Planned contents |
| --- | --- |
| `schemaVersion` | Integer `1` for the first implemented document schema. |
| `id`, `title`, `createdAt`, `updatedAt` | Stable project identity, human title, and ISO 8601 UTC timestamps. |
| `origin` | Optional source project, revision, package hash, and import date. |
| `fps` | Integer `30` for the initial release. |
| `projection` | `mercator`, with flat ground and no terrain in the initial release. |
| `outputVariants` | `portrait` at 1080 × 1920 and `landscape` at 1920 × 1080, each with safe-area settings. |
| `features` | Named feature records, kind, current geometry revision, and optional grouping. |
| `featureRevisions` | Immutable GeoJSON geometry, canonical hash, source references, and geometry lineage. |
| `layers` | Feature or asset references, style values, ordered drawing position, and attribution dependencies. |
| `layerTracks` | Explicit visibility intervals and entry/exit effects in project frame numbers. |
| `scenes` | Ordered scene records, duration, camera tracks, focus references, annotations, and variant overrides. |
| `researchSnapshots` | Frozen measures, source vintages, methods, geometry identity, uncertainty, and review state. |
| `roadways` | Existing/proposed segment and cross-section data from the roadway contract. |
| `templates` | Data-only style and scene presets, their versions, and resolved values used in this project. |
| `assets` | Asset descriptors with hashes, media metadata, provenance, rights, and inclusion status. |
| `sources` | Dataset, document, imagery, map, and font source records. |
| `mapResourceSets` | Style/resource mappings for a live exploratory view or a pinned render resource set. |
| `requiredCapabilities` | Features a reader must support to edit and render the project correctly. |
| `extensions` | Optional namespaced, inert JSON for future readers; never executable code. |

The first implementation should use arrays of records with unique string IDs
and build lookup maps after validation. IDs must be treated as opaque values;
their text must not encode filesystem paths or imply chronology. List order is
meaningful only where the contract says so, such as scene order and a roadway's
left-to-right elements.

The project format must not contain credentials, local absolute paths, browser
storage keys, application window state, executable expressions, module imports,
or shell commands. Optional editor preferences such as panel widths belong in
local UI storage, not a portable story.

## Schema invariants

The validator must reject a document before saving or rendering if it violates
any of the following structural rules.

- Every record ID must be unique within its collection, and every required
  reference must resolve to a record of the correct kind.
- A feature's current revision must belong to that feature, and every pinned
  scene or research geometry must exist in `featureRevisions`.
- Coordinates must use GeoJSON longitude, latitude order in WGS 84; finite
  numeric values and valid geometry types are required.
- Polygon rings must be closed and have at least four positions, and lines
  must have at least two distinct positions; invalid self-intersections must
  be rejected or repaired through a reviewed operation that records its method.
- The renderer must reject unsupported antimeridian-spanning geometry and
  coordinates outside Web Mercator's supported latitude range with a clear
  message, rather than wrap or clip them without disclosure.
- `fps` must equal 30, scene durations must be positive integers, and all keyframe
  positions and visibility intervals must use integer frame numbers.
- The project duration must equal the sum of its scene durations; duration is
  derived, not a second independently editable stored value.
- A scene's first camera keyframe must be at local frame 0, keyframe positions
  must increase, and every keyframe must lie inside that scene.
- Output dimensions must match the two supported variants, and variant
  overrides must reference existing scenes, labels, and layers.
- Every layer interval must satisfy `0 <= startFrame < endFrameExclusive <=
  projectDuration`, and layers must have a stable ordering key.
- Asset hashes must identify exact bytes; a declared media type or filename
  alone must not establish that an uploaded file is acceptable.
- A research snapshot must pin its geometry, sources, method version, parameters,
  source content hashes, units, and any uncertainty statement; a numeric result without those fields
  must not be treated as verified research.

The validator must normalize geometry for hashing through a versioned,
deterministic process. Version 1 must use canonical JSON key ordering, finite
numbers, and the saved coordinate order; it must not silently simplify,
reproject, round, reverse rings, or reorder multipart geometry during hashing.
An intentional normalization or repair creates a new geometry revision and
records both the input hash and method.

The initial render camera supports longitude, latitude, zoom, and bearing with
`pitch: 0`. The story core must reject unsupported camera fields instead of
letting preview and export choose different defaults. City-agnostic operation
means any supported place can supply project data; the first release does not
promise globe, terrain, or antimeridian editing.

## Illustrative project excerpt

The following JSON excerpt shows a shared geometry used by a scene and a
research snapshot. It intentionally omits the other required collections and
uses a digest placeholder, so it is documentation rather than an importable
fixture; the Day 1 fixture must contain complete validated records and computed
hashes.

```json
{
  "schemaVersion": 1,
  "id": "project-example",
  "title": "Example corridor story",
  "fps": 30,
  "projection": "mercator",
  "outputVariants": {
    "portrait": {"width": 1080, "height": 1920},
    "landscape": {"width": 1920, "height": 1080}
  },
  "features": [
    {
      "id": "area-example",
      "name": "Example study area",
      "kind": "area",
      "currentRevisionId": "geometry-example-1"
    }
  ],
  "featureRevisions": [
    {
      "id": "geometry-example-1",
      "featureId": "area-example",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-96.82, 32.80],
            [-96.81, 32.80],
            [-96.81, 32.81],
            [-96.82, 32.81],
            [-96.82, 32.80]
          ]
        ]
      },
      "geometrySha256": "COMPUTED_GEOMETRY_SHA256",
      "sourceIds": ["source-author-drawing"]
    }
  ],
  "scenes": [
    {
      "id": "scene-area",
      "kind": "map",
      "durationFrames": 180,
      "focusFeatureRevisionId": "geometry-example-1",
      "cameraTrack": [
        {
          "frame": 0,
          "center": [-96.815, 32.805],
          "zoom": 13,
          "bearing": 0,
          "pitch": 0,
          "easing": "linear"
        }
      ],
      "variantOverrides": {},
      "annotations": []
    }
  ],
  "researchSnapshots": [
    {
      "id": "research-example",
      "featureRevisionId": "geometry-example-1",
      "geometrySha256": "COMPUTED_GEOMETRY_SHA256",
      "methodId": "manual-source-transcription",
      "methodVersion": 1,
      "parameters": {},
      "sourceInputs": [
        {
          "sourceId": "source-example-table",
          "contentSha256": "COMPUTED_SOURCE_SHA256",
          "version": "illustrative-only",
          "referencePeriod": "illustrative-only",
          "boundaryVintage": null
        }
      ],
      "reviewState": "draft",
      "measures": [],
      "warnings": ["Illustrative record; no factual measure is supplied."]
    }
  ]
}
```

These coordinates are an example drawing, not an asserted neighborhood,
corridor, or administrative boundary. Production geometry must carry its actual
origin and the author's chosen geographic definition.

## Source records and lineage

The D3-01 bridge parser accepts `author-origin` sources and dataset sources.
A dataset has an ID, title, publisher, nullable version, reference period,
boundary vintage, content SHA-256 and universe, plus separate `localUse`,
`publication`, and `redistribution` rights states (`unknown`, `allowed`, or
`restricted`). Unknown rights remain unknown; the parser does not enforce
publication or redistribution rights. The broader source lineage below is
planned. See the [D3-01 receipt](../planning/receipts/D3-01/D3-01-20261113-01.md)
for verification and limits.

The `SourceRecord` object must identify the exact evidence used by a feature,
measure, or asset. A URL is a locator, not a frozen source identity; a corrected
file published at the same URL and vintage must receive a distinct content hash
and source revision.

Referenced source records must be immutable. Changed source bytes or a revised
source identity must create a new source record ID; updating a URL or cached
file must not change the meaning of an older approved snapshot.
The project must retain referenced old source metadata and any lawfully stored
supporting bytes for as long as a retained revision or snapshot needs them;
package redistribution exclusions remain a separate decision.

The source record must include the following fields when they apply.

| Field | Required meaning |
| --- | --- |
| `id`, `title`, `publisher`, `sourceKind` | Stable reference, human title, responsible issuer, and dataset/document/imagery/map/font/author-origin classification. |
| `canonicalUrl`, `retrievedAt` | Source locator and actual UTC retrieval time; an author drawing uses an explicit author-origin record instead of an invented URL. |
| `version`, `effectiveDate`, `referencePeriod`, `boundaryVintage` | Published release, service/acquisition/effective date, measured period, and geographic vintage as separate concepts. |
| `contentSha256`, `supportingAssetIds` | Exact retrieved bytes and any retained files; missing original bytes must be disclosed rather than assigned a fabricated hash. |
| `coverage`, `coordinateReferenceSystem` | Geographic/time coverage and the original spatial reference when relevant. |
| `licenseName`, `termsUrl`, `termsAssetId` | Identified terms and retained evidence of the applicable version. |
| `permittedUses`, `rightsReview` | Separate local-use, video-publication, and package-redistribution decisions, with reviewer, time, and evidence. |
| `attributionText`, `attributionPlacement`, `attributionStatus` | Required credit, where it must appear, and whether it is unresolved, prepared, or verified in output. |
| `transformations` | Ordered input hashes, tool/method versions, parameters, output hashes, and author decisions for conversions or edits. |

A feature revision's geometry lineage must retain its source record IDs and
input hashes, parent geometry revision when edited, transformation method and
parameters, and whether the geometry is analytical or a display simplification.
A manually drawn study boundary must identify its author, date, and editorial
rationale; it must not be relabeled as an official boundary.

The importer must retain the original coordinate reference system and an
explicit recorded conversion when a source was transformed to WGS 84 GeoJSON.
The first app importer can require already converted GeoJSON; an external GIS
preparation step must still appear in lineage rather than becoming an invisible
change to the source.

## Research snapshots

The optional `researchSnapshots` collection in the bridge schema uses `inputs`,
`result`, `status`, and `reviews`. Inputs identify a feature revision and its
matching geometry hash, dataset source inputs matching their source records,
method ID and positive integer version, and JSON parameters. Results distinguish
`raw-input`, `estimate`, and `unavailable`; statuses are `draft`, `approved`,
`stale`, and `unavailable`. An unavailable result has a null value and must
have unavailable status, and conversely.

For an approved snapshot, the parser requires at least one dataset input with
content hash, version, reference period, and source universe; a non-null result
with a universe; and an approving review with matching copies of the inputs and
result. Reviews include reviewer, UTC time, decision, and independently
validated input and result copies. Historical copies may differ from current
records, but cannot approve a changed snapshot. Approval does not change an
estimate into a fact. The parser checks hash syntax and matching references; it
does not recompute hashes, authenticate reviewers, or derive staleness. The
canonical digest protocol and richer fields described below remain planned.

A `ResearchSnapshot` must preserve enough context to explain a measure after
its source website changes. Its identity must include the geometry hash, source
IDs, exact source content hashes and vintages, method ID and version, and
canonical method parameters.
The service must treat that combination as a research cache key; a feature name
alone is not a valid cache key.

The planned snapshot fields have the following meanings.

| Field | Meaning |
| --- | --- |
| `featureRevisionId`, `geometrySha256` | The exact area, corridor, point, or walkshed evaluated. |
| `sourceInputs`, `retrievedAt` | Records pairing `sourceId`, `contentSha256`, `version`, `referencePeriod`, and `boundaryVintage`, plus actual retrieval time. |
| `methodId`, `methodVersion`, `parameters` | The reproducible computation or documented manual transcription. |
| `measures` | Named values with claim kind, units, universe, denominator, geographic basis, precision, source MOE, and uncertainty treatment. |
| `coverage` | Covered area or features, exclusions, unmatched records, and important gaps. |
| `warnings` | Limits such as estimated allocation, stale source data, or incomplete network coverage. |
| `inputDigest`, `snapshotDigest` | Hashes of exact inputs and the complete result/text/limitations respectively. |
| `reviewState`, `reviews` | `draft`, `reviewed`, `approved`, or `rejected`, plus named reviewer decisions tied to exact digests. |
| `supportingAssetIds` | Permitted local tables, extracts, or images needed to inspect or reproduce the result. |

Each `sourceInputs` entry must match an immutable `SourceRecord` by ID and exact
content hash, with compatible release and period fields. The validator must
reject duplicate or conflicting entries; parallel arrays whose relationship
depends on an unchecked index are not the snapshot representation.

The `inputDigest` must hash a canonical payload containing the geometry identity
and hash, source input records sorted by source ID and content hash, method ID
and version, and canonical parameters.
The `inputDigest` payload must exclude all digest fields, review fields,
generated display timestamps, and derived staleness.

The `snapshotDigest` must hash `inputDigest` plus the measures, claim kinds,
coverage, uncertainty, warnings, and presentation text/credits being reviewed.
It must exclude `snapshotDigest` itself, `reviewState`, `reviews`, and derived
staleness, so recording an approval does not invalidate that approval through
self-reference or a changing digest.

Each measure must classify its claim as `fact`, `estimate`, `interpretation`,
`assumption`, or `unverified`. An approval does not convert an estimate or
assumption into a fact, and an unverified claim must not appear as an approved
factual statement. Source margins of error must remain separate from uncertainty
introduced by spatial allocation; the first `area-weighted-count` method,
version `1`, must preserve source MOEs and identify combined uncertainty as
not quantified.

Each review record must identify `reviewer`, `reviewedAt`, `decision`,
`reviewedInputDigest`, `reviewedSnapshotDigest`, and any note or limitation.
`reviewed` means inspected; `approved` means that the named reviewer accepted
the exact result and presentation limitations for the intended publication.
An approved-publication export must require matching approval for its research
claims and separate rights approval for its assets.

Staleness must be derived relative to the selected current geometry, source
content hashes, requested method versions, and parameters. A stale snapshot remains readable and retains its
original value; the UI must show why it is stale and offer recomputation or
deliberate use of its pinned older geometry. Rendering must use only the
snapshot selected by the scene and must not recompute it from changing data.
Approval must not transfer to a changed digest; deliberately using an older
approved snapshot requires its original matching geometry and dated context.

Arbitrary-area population methods, coverage, density denominators, and walkshed
qualifications belong in the [research methods](research-methods.md)
document. A package must preserve those method details; it must not turn a
method-qualified estimate into an unqualified factual label.

## Scenes, layers, and templates

The ordered `scenes` array defines the story sequence. Each scene has a local
frame range from `0` through `durationFrames - 1`; the compiler derives its
project start frame from preceding scene durations. The first release uses
nonoverlapping scenes, with within-scene entrance and exit effects instead of a
general overlapping clip compositor.

The scene kinds are `map`, `image`, `title`, and `roadway`. A map scene can focus
on any saved geometry and is not constrained to a city-neighborhood-street
hierarchy. The Dallas-to-Oak-Lawn-to-Maple sequence is a project, not a schema
rule or a hardcoded navigation path.

Each map scene must store explicit camera keyframes. **Fit focus** is an author
action that computes camera values from geometry and the chosen output frame;
the resulting keyframes are saved. Changing a geometry does not cause hidden
camera refitting during export.

The base scene stores its shared timing and content. `variantOverrides` can
replace that scene's camera keyframes, label offsets, and selected layout
values for portrait or landscape; it must not duplicate research, change
scene duration, or create different factual text between the two variants.
The renderer must resolve a base value and its override before evaluating the
frame.

Every layer must have explicit visibility intervals in `layerTracks`.
**Keep visible** extends an interval through a chosen later scene or the end of
the project; it does not create an implicit state inherited from prior playback.
The core must evaluate each layer's visibility from the requested frame alone.

Reordering or changing scene lengths must retime attached intervals through one
validated editor operation. The UI must preview the affected ranges and retain
their scene attachment where possible; it must not leave out-of-range tracks or
silently turn persistent transit off. Raw frame intervals remain the portable
representation after the operation completes.

The data-only template record must contain a template ID and version plus the
resolved colors, typography, effect parameters, and layout defaults used by the
project. Import must not require downloading a template or running template
JavaScript. A renderer must use the frozen resolved values, even if a local
template with the same name has changed.

The [roadway contract](roadway-editor.md) defines the dimensions and segment
records stored in `roadways`. The project format must retain original units,
meters used for calculation, evidence status, locked widths, and both existing
and proposed arrangements.

## Archive layout and manifest

A `.gstory` file is a ZIP archive with a required manifest and project document.
Assets use content hashes in their paths so that renaming an image does not
break references or create duplicate copies of identical bytes.

```text
example.gstory
  manifest.json
  project.json
  assets/<sha256>.png
  assets/<sha256>.jpg
  assets/<sha256>.woff2
  assets/<sha256>.json
  assets/<sha256>.csv
  licenses/<asset-id>.txt
  previews/portrait.png
  previews/landscape.png
```

The paths containing angle brackets are layout notation, not literal filenames.
Each `<sha256>` must be a 64-character lowercase hexadecimal digest, and each
`<asset-id>` must resolve to an asset descriptor. Preview images are optional
conveniences; they must not replace editable geometry or scene records.

The manifest must contain the following fields.

| Field | Required meaning |
| --- | --- |
| `format` | Literal `gstory`. |
| `containerVersion` | Integer `1`; changes when the archive structure changes. |
| `projectSchemaVersion` | The schema version required by `project.json`. |
| `projectPath` | Literal `project.json` in container version 1. |
| `sourceProjectId`, `sourceRevisionId` | Exported local identities, retained as provenance on import. |
| `producer` | Application name and exact build/version identifier. |
| `exportedAt` | UTC timestamp; metadata, not a playback input. |
| `mode` | `portable` or `references`, as defined in the asset policy. |
| `entries` | Every archive file except `manifest.json`, each with normalized path, SHA-256, byte count, and media type. |
| `contentSha256` | SHA-256 of canonical JSON for the path-sorted `entries` array. |
| `omittedAssets` | Asset IDs, rights or availability reason, original source, and replacement guidance. |

The exporter must hash exact uncompressed file bytes. The manifest must not hash
itself; its `contentSha256` summarizes the checked entry list, and an optional
download receipt can hash the complete ZIP file. These hashes detect content
changes and corruption but do not authenticate the author or prove licensing.

The exporter must use canonical JSON for project and manifest files. It should
sort archive entries and normalize ZIP metadata where the chosen library
allows, but byte-identical ZIP files are not the acceptance criterion because
export timestamps differ. A successful round trip must preserve semantic data,
geometry hashes, resource bytes, and the resolved frame states.

## Asset rights and missing resources

Each asset descriptor must keep its original name, media type, byte count,
content hash when available, source URL or author statement, creator,
license/terms reference, required attribution, and retrieval date. Rights must
be represented separately for local use, video publication, and redistribution
inside a project package; one permission must not imply another.

The following statuses make packaging decisions reviewable.

| Status | Packaging behavior |
| --- | --- |
| `allowed` | Include bytes with required credit and license information. |
| `restricted` | Exclude bytes unless a recorded permission explicitly covers redistribution. |
| `unknown` | Exclude bytes and retain a source reference until the author establishes permission. |
| `author-owned` | Include bytes with the author's ownership and intended sharing statement. |

The `portable` mode must include every resource required to reproduce the story
offline under permitted terms. If a required resource cannot be included, the
exporter must explain why and offer a `references` package or replacement; it
must not label the incomplete result fully portable.

The `references` mode must preserve all editable data, allowed asset bytes,
source metadata, and a complete omitted-asset list. On import, the studio must
show missing-asset placeholders and allow **Locate replacement**, **Replace**,
or an explicit scene edit that removes the dependency. It must not fetch a
restricted asset automatically or substitute a different image without review.

The final video preflight must block any required missing asset and any asset
whose video-publication permission is unresolved. A draft preview can show a
clearly labeled placeholder, but a draft placeholder must not silently become
the published film. Credits required in the video must appear in the output,
not only inside the package manifest.

The initial accepted media types should be raster images, validated data JSON
and CSV, plain text, locally licensed fonts, and any audio format actually
implemented and tested. User-provided SVG, HTML, executable files, and nested
archives are outside the initial asset import surface; the app's own generated
SVG overlay is not a user-uploaded asset.

Map resources require the same review as other assets. A permissive map library
does not grant permission to cache, bulk-download, or redistribute a tile
provider's data, glyphs, sprites, or imagery. A render resource set must identify
the style and all resolved resources; public demo tile URLs must not be treated
as a production or offline redistribution license.

## Safe import procedure

The local service must perform the following sequence before committing an
import. The staging directory is disposable, and the existing project library
must remain unchanged when any step fails.

1. Inspect the ZIP directory and manifest under resource limits before extracting
   entry contents.
2. Reject unsafe paths, duplicate entries, unsupported archive features, and
   undeclared files before writing them to staging.
3. Stream permitted entries into staging while enforcing actual expanded-byte
   limits and computing their hashes.
4. Verify each declared length and hash, then validate the document's schema,
   references, required capabilities, and media contents.
5. Apply supported migrations to a new document, retaining the original package
   and a migration report until the author reviews the import.
6. Present missing assets, rights exclusions, unsupported features, and naming
   conflicts, then commit the reviewed import atomically as a new project.

The importer must reject absolute paths, drive letters, UNC paths, `..`
segments, NUL characters, Windows alternate data streams, reserved device
names, and path components with trailing spaces or periods. It must treat
case-folded or Unicode-normalized path collisions as duplicates on every
platform, reject symbolic links and hard links, and verify that every resolved
target stays inside staging. Rewriting an unsafe path into a safe-looking path
is not an acceptable substitute for rejecting it.

The importer must reject encrypted ZIP entries and unsupported compression
methods. It must count streamed bytes rather than trust ZIP metadata, reject
CRC or manifest mismatches, and cancel decompression when a limit is exceeded.
The archive library selection must be reviewed against these requirements;
calling a general unzip command is not the import implementation.

The following values are proposed configurable guardrails for the first build,
not promises that every machine can process files of these sizes.

| Resource | Initial limit |
| --- | --- |
| Compressed package | 1 GiB |
| Total expanded bytes | 4 GiB, also bounded by available staging disk space |
| Entry count | 20,000 |
| One expanded asset | 512 MiB |
| `project.json` | 32 MiB |
| JSON nesting depth | 64 |
| Expansion ratio | 200:1 per entry and overall |

The service must reject oversized input with a clear diagnostic before a
partial project appears in the library. Threshold changes belong in
configuration and a focused resource-limit test; they do not justify a
general storage-management subsystem during the sprint.

## Versioning and migration

The project schema version, container version, and local SQLite schema version
are independent integers. A database migration must not quietly rewrite the
portable format, and a project migration must not require replacing a person's
entire local database.

The first reader must accept its supported version exactly. A later reader can
support an ordered series of pure, deterministic project transformations such
as `1 -> 2`; each transformation must validate its input and output and record
its version in the migration report. The original package and prior saved
revision must remain recoverable until the migrated copy passes validation.

An unknown future container version must fail before extraction. An unknown
future project schema or required capability must open an inspection report
without permitting edits or rendering; the app must not save a partially
understood document and discard fields. Unknown optional namespaced extension
data must remain inert and survive re-export unchanged.

The importer must never run code, fetch remote schema files, evaluate template
expressions, or load executable plugins named by a package. A newer capability
is data to report to the author, not an instruction to expand the application's
privileges.

## Round-trip acceptance

The first package gate must exercise a saved synthetic project through export,
fresh import, edit, save, and re-export. The fixture must include an editable
polygon, a line, a point label, two aspect ratios, a pinned research example,
one permitted local asset, and a reference-only missing asset case.

The gate must establish the following outcomes.

- The imported project has a new local identity while retaining its source
  identity, geometry hashes, scene order, timing, template values, and research
  provenance.
- Both output variants evaluate to the same frame states before and after a
  complete portable export; expected identity metadata is excluded from that
  comparison.
- An edited imported geometry remains editable and creates a new revision
  without rewriting the original research snapshot.
- Missing or excluded assets have useful placeholders and block a final export
  that still depends on them.
- Corrupt hashes, path traversal, duplicate paths, unsupported versions, and
  resource-limit violations leave no partially imported project.
- A portable package can reopen and render its rights-cleared fixture with
  external networking disabled.

The [testing and gate plan](../planning/testing-and-gates.md) owns command names
and evidence locations. A package that preserves only images or videos must
fail this gate even if its preview looks correct.

## Implemented bridge subset

D1-03 defines a bounded shared schema and a
[synthetic fixture](../../tests/fixtures/synthetic-story/README.md) for the
initial rendering bridge. Its parser validates supported fields, IDs,
references, finite values, geometry shape, and integer frame intervals, and
rejects unsupported fields. It is not the complete portable project validator:
asset bytes and provenance, polygon self-intersections, variant-specific
framing, migration, and archive validation remain future gates. See the
[attempt receipt](../planning/receipts/D1-03/D1-03-20261111-01.md).

## Implemented roadway schema

The project parser accepts optional roadway records with ordered segments and
existing and proposed cross-sections. Stations use meters within an authored
extent. Each cross-section has ordered bands with explicit placement, locks,
and evidence. Known dimensions retain original units and normalized meters.
Unknown dimensions carry no numeric value. Documented and estimated widths
require source references and provenance.

The schema tests use synthetic roadway layouts. The width solver, editor,
rendering, and verification of real-world measurements remain future work.
