# Produce the Maple Avenue pilot

You can use this production plan to build a geographic story about Maple Avenue
between Mockingbird Lane and Oak Lawn Avenue in Dallas. The pilot should help
neighbors understand the corridor's context, nearby connections, a defensible
walking-access estimate, and a clearly labeled street-design concept.

Status: planned production, November 11, 2026. The corridor endpoints describe
the intended scope; their exact coordinates, imagery, alignments, boundaries,
statistics, and existing street dimensions remain unverified. No film,
approved source packet, or working authoring interface exists in this baseline.

- [Story and audience](#story-and-audience)
- [Scene sequence](#scene-sequence)
- [Evidence packet and owners](#evidence-packet-and-owners)
- [Prepare the geography and imagery](#prepare-the-geography-and-imagery)
- [Produce one external network walkshed](#produce-one-external-network-walkshed)
    - [Tool and data preflight](#tool-and-data-preflight)
    - [Analyst preparation recipe](#analyst-preparation-recipe)
    - [Required handoff and cutoff](#required-handoff-and-cutoff)
- [Prepare population and historical claims](#prepare-population-and-historical-claims)
- [Prepare the roadway concept](#prepare-the-roadway-concept)
- [Compose portrait and landscape outputs](#compose-portrait-and-landscape-outputs)
- [Four-day production gates](#four-day-production-gates)
- [Review the publication candidate](#review-the-publication-candidate)

## Story and audience

The audience is a neighbor joining a local conversation, not a GIS specialist.
The story should move from recognizable city context to a corridor-scale
question: how could Maple connect nearby people and destinations more
comfortably? The film should explain the evidence behind that question without
presenting an editorial concept as an adopted project.

The author should distinguish facts, estimates, interpretations, and assumptions
using the [research methods](../architecture/research-methods.md). A persuasive
sequence still requires geographic and statistical accuracy. Missing evidence
is a reason to change or hold a claim, not a reason to supply plausible numbers.

The initial production should use the local Vue/Quasar authoring workflow and
the separate Remotion rendering boundary described in the
[system architecture](../architecture/system-architecture.md). A working pilot
does not depend on cloud hosting, an application account, a paid map API, or AI.

## Scene sequence

The sequence is a target storyboard. Timing, final wording, and framing should
follow the verified assets; the table does not assert that any named place,
line, boundary, or statistic has been validated for use.

| Scene | Intended visual and story beat | Evidence and acceptance condition |
| --- | --- | --- |
| 1. Dallas context | Open with rights-cleared Dallas aerial or satellite imagery and orient the viewer. | Record imagery provider, acquisition date, geographic bounds, and derivative-video rights; label aerial imagery accurately. |
| 2. Landmarks | Establish Downtown Dallas, Dallas Love Field, and Parkland as recognizable context. | Verify point or footprint locations and the relevant institution or facility; avoid invented distances or service relationships. |
| 3. DART context | Introduce relevant verified rail geography before moving closer. | Use a dated source with confirmed rights and actual route geometry; no stylized guessed alignment. |
| 4. Oak Lawn study area | Reveal the area used for this story and explain its role. | Label an editorial study boundary as editorial; call it official only with authority evidence. |
| 5. Stations and buses | Reveal verified rail stations, bus routes, and stops around the study area. | Check source dates, route variants, identifiers, service applicability, locations, and rights; treat GoLink separately if included. |
| 6. Maple corridor | Trace the selected Maple Avenue extent from Mockingbird Lane to Oak Lawn Avenue. | Verify endpoints, continuity, and geometry against real source material; preserve the exact feature revision. |
| 7. Ten-minute network walkshed | Reveal the union of network-reachable areas from multiple corridor origins. | Approve the 600-second model, network date, origins, assumptions, and polygonization; a buffer cannot substitute. |
| 8. Residents and change | Present approved population context and only defensible historical comparisons. | Link labels to approved research snapshots of that exact area; omit unsupported history or income instead of filling gaps. |
| 9. Connections | Connect the corridor story to verified destinations and transportation links. | Distinguish observed connections from proposed links and avoid implying a continuous accessible route without evidence. |
| 10. Street-design concept | Transition to a top-down four-to-three lane reallocation concept with bicycle space, showing segment variation. | Document the selected existing condition or label it as an illustrative starting condition; verify widths and constraints before any site-specific claim. |
| 11. Return and invitation | Return to the map, summarize the proposal's question, and invite discussion. | Keep editorial conclusions distinct from adopted policy and provide readable sources, credits, and limitations. |

A gap in required evidence can produce a shorter, honestly labeled progress cut,
which does not complete the full publication milestone. Historical trends are
conditional on support, and income is not required for this first film; a
documented decision to omit either does not block completion. An unverified
walkshed or transit layer must not survive merely because it fits the sequence.

## Evidence packet and owners

The production owner should assign actual people to the following roles before
Day 1 ends. A role name in this document is not evidence that a person has
accepted the work.

| Role | Accountable output |
| --- | --- |
| Story author | Narration draft, scene order, intended claims, editorial boundary rationale, and output review |
| Data steward / GIS analyst | Acquired source files, source manifest, validated geometries, network analysis packet, and documented transformations |
| Research reviewer | Population allocation, uncertainty statement, comparability decision, and approved snapshot inputs |
| Roadway reviewer | Existing-condition evidence, proposed segment dimensions, and concept labels |
| Publication reviewer | Asset rights, on-screen credits, claim wording, output quality, and approval of the exact final revision |

The data steward should keep the working handoff under a project-owned local
folder named `.local/storytelling-studio/pilot/`. This is a planned producer folder, not an
existing repository asset or a portable-package schema. On import, the studio
must copy or reference files through the project's
[asset and source contract](../architecture/project-format.md).

The packet must contain original bytes and hashes, source and license records,
normalized geographic files, analytical outputs, review evidence, and a list
of unresolved claims. Large datasets and personal field notes do not belong in
Git by default; a portable project can include only assets whose redistribution
terms allow it.

## Prepare the geography and imagery

The first vector background uses the selected
[local TIGER/Line basemap](../architecture/research-methods.md#initial-local-vector-basemap).
The data steward should prepare the named Dallas County road and water layers
and Texas place boundaries, then verify the pilot's corridor geometry against
independent evidence. A road name match alone does not establish the requested
endpoint-to-endpoint segment.

Original USDA NAIP imagery is the preferred candidate for local aerial context;
Sentinel-2 is a candidate for broader regional context. The author must not
call NAIP satellite imagery, and must not infer lane widths from imagery that
lacks adequate resolution or geolocation accuracy. A specific acquisition
date and source credit are required, even for a public-domain asset.

The data steward must use the
[provider rights matrix](../architecture/research-methods.md#provider-rights-matrix)
to select actual assets. Google imagery is excluded. Public OSM tiles are
excluded from the offline render resource set; their attribution does not
authorize prefetching or headless capture.

The transit preparation task must record DART source rights separately from
whether the feed can be downloaded. DART's public GTFS link does not prove
permission to redistribute the archive or publish every derived image.
Stations, routes, stops, and any GoLink area require real geometry, a usable
effective date, and an explicit review decision.

GoLink belongs in the pilot only where an applicable zone or connection is
supported. A documented source review finding that none applies is a valid
completion decision for that conditional layer; missing data or unknown rights
is not evidence of nonapplicability. The generic GoLink polygon-import
capability remains part of the planned product independently of this film.

## Produce one external network walkshed

Day 2 imports a result prepared outside Storytelling Studio. That result is
not assumed to exist: the data steward owns acquisition and analysis, while
the implementer owns the importer. Building a general network-generation
feature inside the app remains optional and is not a prerequisite for the
import path.

### Tool and data preflight

The preparation candidate is local QGIS 3.44 with a compatible network-analysis
plugin. The official plugin registry checked on November 11, 2026 lists
QNEAT3 1.0.8 for QGIS 3.x; its source includes **Iso-Area as Polygons (from
Layer)**. The author's website now describes a successor QNEAT 4 workflow,
so its labels and defaults must not be copied into a 1.0.8 procedure without
checking the installed tool. [QGIS plugin registry](https://plugins.qgis.org/plugins/QNEAT3/)

The analyst must record the exact installed QGIS, plugin, and supporting
library versions and pass a known-distance/time fixture before processing
Maple. The registry and source were inspected during planning, but no local
GIS installation or algorithm run was tested. If compatibility or the polygon
tool is unavailable, the acquisition task is blocked until a verified external
result or working local toolchain is available.

The analyst can obtain an OSM source extract from the
[Geofabrik Texas download page](https://download.geofabrik.de/north-america/us/texas.html),
whose provider documents ODbL reuse and source acknowledgment. The public PBF
extract is a candidate input, not a ready pedestrian network; its size makes
Day 1 acquisition important. The analyst must save the extract timestamp,
download URL, content hash, and terms. [Geofabrik download and license guidance](https://www.geofabrik.de/data/download.html)

The analyst must preserve tags needed to assess walking access, barriers,
crossings, bridges, tunnels, and direction. A simplified roads-only export that
discards those attributes is not sufficient evidence. No paid routing API or
account is required by this planned preparation route.

### Analyst preparation recipe

The following procedure is a specification for the assigned GIS analyst, not
a verified application tutorial. The analyst must record deviations and the
actual local tool behavior in the handoff.

1. Acquire the network extract and a verified Maple corridor revision during
    Day 1, and retain their original bytes and source notices.
2. Clip a working network to an extent large enough for the corridor and its
    complete 600-second reach, retaining a margin beyond the maximum reachable
    edge before approving the extent.
3. Build pedestrian-eligible linework using recorded access rules and inspect
    crossings, prohibited roads, private access, stairs, and disconnected paths.
4. Preserve real network connections and grade separation, and record any
    topology repairs; geometric line crossings alone must not create a crossing.
5. Create uniquely identified origin points at verified public corridor access
    locations, including the extent's ends and relevant crossings.
6. Add origins where needed to represent the corridor between those access
    points, and record the spacing, exclusion decisions, and actual snapping
    distance without jumping barriers.
7. Run the analysis in a suitable projected coordinate system with meter units,
    recording its identifier and transformations; export GeoJSON only after
    the analysis has finished.
8. Set a 600-second time budget and an explicitly assumed walking speed of
    1.2 meters per second, equivalent to 4.32 kilometers per hour, with no
    car-speed field inherited from the road data.
9. Compute the union of reachable results from the full origin layer, retaining
    reachable-node or edge evidence as well as the derived polygon.
10. Record interpolation method, raster cell size, interval, off-network costs,
    topology tolerance, and any smoothing or manual corrections.
11. Compare the polygon with the network at barriers and disconnected places,
    rerun with denser origins and finer interpolation to assess sensitivity,
    and reject unexplained land bridges or large changes.
12. Export the approved geometry and provenance packet, then have a second
    reviewer verify the intended claim and its limitations before import.

The selected walking speed is a modeling assumption, not a measured speed for
all users. The analyst must record whether travel is from or to the corridor,
how entry or exit cost is treated, and whether delay at crossings is modeled.
If no delay model is supported, the film must not imply that one is included.

Time units require a deliberate check. QGIS's built-in **Service area (from
layer)** uses hours for its fastest-path travel cost, so 600 seconds is
`600 / 3600` hours there; another plugin can use different units. The analyst
must test the selected algorithm against a known-length network before using
its reported travel cost. [QGIS 3.44 network analysis](https://docs.qgis.org/3.44/en/docs/user_manual/processing_algs/qgis/networkanalysis.html)

The QNEAT3 polygon algorithm's source describes projected-coordinate analysis
and an interpolated raster that becomes cost polygons. Those polygons require
independent barrier checks; interpolation does not prove off-network access.
The analyst should retain the intermediate raster and reachable points so a
reviewer can inspect what the boundary represents.
[QNEAT3 polygon algorithm source](https://github.com/root676/QNEAT3/blob/master/algs/IsoAreaAsPolygonsFromLayer.py)

### Required handoff and cutoff

The analyst must deliver the following planned files within
`.local/storytelling-studio/pilot/walkshed/`; the filenames are output requirements, not
existing deliverables.

| File | Required contents |
| --- | --- |
| `maple-walkshed-600s.geojson` | Valid Polygon or MultiPolygon in GeoJSON coordinates, with the approved result's identity |
| `origins.geojson` | Every origin, stable identifier, selection rationale, and snapping record |
| `reachable-network.geojson` | Reachable lines or nodes with travel-cost evidence and source references |
| `method.json` | Engine and versions, source hashes, corridor revision, coordinate system, speed, direction, 600-second budget, and all polygonization parameters |
| `source-manifest.json` | Provider, effective date, acquired files, hashes, license evidence, required attribution, and redistribution decision |
| `review.json` | Structured reviewer, date, checked input hashes, coverage and sensitivity results, limitations, and technical suitability decision |
| `review.md` | Supporting explanation of checked barriers, crossings, corrections, and remaining factual or editorial approval needs |
| GIS working files | Saved project, prepared network, and intermediate analysis outputs needed to reproduce the result |

The data steward must complete tool and source preparation on Day 1. The
Day 2 acquisition issue has a 45-minute focused verification and handoff window;
if a usable result is unavailable at the 60-minute escalation cutoff, the real
walkshed scene and dependent population scene remain blocked. Synthetic
fixtures can still test the importer, but cannot satisfy the real pilot gate.

The publication reviewer must reject a plain corridor buffer offered in place
of this packet. A newly generated local result or replacement external export
must pass the same provenance and network checks; the schedule does not relax
the definition of a walkshed.

## Prepare population and historical claims

The first quantitative pipeline is fixed in the
[selected population method](../architecture/research-methods.md#selected-first-population-pipeline):
ACS 2020–2024 Total Population, table `B01003`, with 2024 block-group geometry
and explicit partial-area allocation. The data steward must acquire the public
table, metadata, and geometry before Day 3 rather than leave source selection
to the renderer implementer.

The selected study area or approved walkshed must become the same immutable
feature revision used by both the snapshot and animation. The author must
label the result as an estimate for the 2020–2024 period and disclose uniform
area allocation. Source MOEs remain available; the first allocation method
does not claim a complete combined confidence interval.

Historical change is conditional on the comparison checks for nonoverlapping
periods, harmonized geography, compatible variables, and uncertainty. The
author must not convert successive overlapping ACS releases into annual
observations, interpolate missing years, or claim meaningful change without
support. A single defensible population result can satisfy the Day 3 pipeline
gate; if comparison is unsupported, the author should record the finding and
omit the conditional trend scene without treating that omission as a film
blocker.

Median income is not a mandatory first-pipeline output. Source-area medians
cannot be averaged into a Maple median; an income scene requires a separately
reviewed estimator, appropriate dollar-year treatment, and honest uncertainty.
No numbers in this plan represent observed Maple population or income.

## Prepare the roadway concept

The roadway story should explain a four-to-three lane reallocation concept,
with bicycle space and the corridor's varying sections. The
[roadway contract](../architecture/roadway-editor.md) defines the planned model
and editor; the film does not establish that the whole corridor has four
existing through lanes or one uniform available width.

The roadway reviewer must identify meaningful segment boundaries from real
evidence. Existing and proposed cross-sections must separately record travel
lanes, turn space, bicycle space and protection, parking, medians, sidewalks,
and other relevant elements. Widths must sum to the stated cross-section
extent, with clear units and a documented basis.

The author may use an explicitly labeled illustrative section to explain how
a four-to-three conversion works before exact Maple dimensions are available.
That illustration must not be attached to a precise geographic segment as a
measured condition. A concept animation cannot claim engineering feasibility,
traffic performance, crash reduction, or official approval without supporting
analysis and sources.

The top-down animation must preserve each element's identity as space changes
and must distinguish transitions between corridor segments from a redesign of
one section. Every segment used in the film must have an evidence status,
and unverified dimensions must block claims that the drawing is site-accurate.

## Compose portrait and landscape outputs

The pilot targets portrait 1080 × 1920 and landscape 1920 × 1080, both at the
project's initial 30 frames per second. These are planned output specifications,
not verified export capabilities. The
[rendering contract](../architecture/rendering-contract.md) defines frame
evaluation and asset pinning.

The author must review camera framing, label placement, narration pacing,
captions, source notes, and attribution independently for both aspect ratios.
A crop of a finished landscape video is not sufficient evidence that the
portrait version works. The same approved geographic and statistical inputs
must remain identifiable across both variants.

The final render must use frozen resources and the approved project revision.
Required credits must remain legible and inside safe areas when maps zoom,
labels move, or captions appear. The review packet should include both videos,
their source manifest and project revision, and any known limitations.

## Four-day production gates

The four implementation sprints run November 11–14, 2026. Each day can finish
with useful progress while a blocked evidence requirement remains explicit.

| Date | Production target | Evidence required to claim completion |
| --- | --- | --- |
| November 11, Day 1 | Establish a reusable authoring/render slice and start real-source preparation. | Save/reopen evidence, deterministic basic export, assigned evidence owners, basemap source packet, and network-tool preflight. |
| November 12, Day 2 | Assemble verified geography, transit context where permitted, and imported network walkshed. | Real geography and source review, usable external walkshed packet, importer checks, and no fabricated replacement data. |
| November 13, Day 3 | Add one approved population pipeline and prepare the research-backed sequence. | Exact area match, validated joins and weights, missing-data and uncertainty handling, and explicit history/income decisions. |
| November 14, Day 4 | Explain the segment-aware roadway concept and review both output variants. | Roadway evidence or concept labels, both rendered variants, readable credits, and publication review of the final revision. |

The [planning index](README.md) and [testing gates](testing-and-gates.md) provide
the implementation sequence and completion rules. The full pilot remains
incomplete when a required scene depends on missing rights, invalid geography,
unreviewed estimates, or unsupported roadway facts.

## Review the publication candidate

The publication reviewer should confirm the following before approving the
exact final revision:

- Every factual label, location, transit alignment, and number has a source and
  an appropriate date; all estimates and concepts are visibly identified.
- The walkshed uses the approved 600-second multi-origin network result and
  matches the area used for its population snapshot.
- Historical and income claims pass their separate method gates or are absent;
  no motion implies missing observations.
- All roadway dimensions and existing conditions have evidence or explicit
  illustrative status, with segment variation preserved.
- Every asset has applicable rights evidence, required attribution, and a
  redistribution decision separate from rendered-video use.
- Portrait and landscape videos retain readable captions, source notes,
  credits, and limitations at the final viewing size.
- The package and render records identify the exact project revision, source
  hashes, research snapshots, reviewer, and approval time.

The author must keep an editable project and evidence packet for correction.
If a source changes after publication, the correction should create a new
revision with a stated reason rather than silently replace the evidence behind
the published film.
