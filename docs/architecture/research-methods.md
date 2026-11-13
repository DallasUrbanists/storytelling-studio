# Research methods

You can use this plan to turn a selected area into a defensible research result
and reuse that result in a map animation. The goal is to let a local storyteller
explain what the evidence supports, how the number was calculated, and what
remains uncertain.

Status: the D3-01 bridge parser implements bounded provenance records and
validation, documented below. The research methods and workflow remain planned.
No research engine, verified Maple dataset, statistical result, or publication
approval is established by this schema work.

- [Claims and immutable inputs](#claims-and-immutable-inputs)
- [Area geometry](#area-geometry)
- [Census sources and variables](#census-sources-and-variables)
    - [Selected first population pipeline](#selected-first-population-pipeline)
- [Initial local vector basemap](#initial-local-vector-basemap)
- [Arbitrary-polygon estimates](#arbitrary-polygon-estimates)
    - [Allocate additive counts](#allocate-additive-counts)
    - [Treat rates and medians differently](#treat-rates-and-medians-differently)
    - [Keep uncertainty visible](#keep-uncertainty-visible)
- [Historical comparisons](#historical-comparisons)
- [Network walksheds](#network-walksheds)
- [Transit and neighborhood boundaries](#transit-and-neighborhood-boundaries)
- [Provider rights matrix](#provider-rights-matrix)
- [Research and publication gates](#research-and-publication-gates)
- [Failure and recovery](#failure-and-recovery)
- [Acceptance evidence](#acceptance-evidence)

## Claims and immutable inputs

The implemented bridge schema records dataset identity, nullable vintage and
universe fields, separate rights states, method inputs and parameters, result
kind, status, and reviewer copies. The parser checks source and geometry
references and requires complete source identity and a matching approving review
for an approved snapshot. It retains `raw-input`, `estimate`, and `unavailable`
as distinct result kinds; review does not make an estimate a fact. Rights can
remain unknown and are not enforced as publication authorization by the parser.
It validates hash syntax and consistency but does not calculate hashes, verify
reviewer identity, compute research, or automatically derive staleness. See the
[project format](project-format.md#research-snapshots) and
[D3-01 receipt](../planning/receipts/D3-01/D3-01-20261113-01.md) for the
implemented boundary and verification. The following methodology, canonical
digest protocol, and publication gates remain requirements for future work.

A *research snapshot* is a saved result tied to exact inputs, rather than a
number that changes whenever a source updates. The
[project format](project-format.md) is the canonical data contract; the
[system architecture](system-architecture.md) explains its lifecycle.

Every statement has one of the following meanings, which the author must keep
visible in research notes and publication review.

| Kind | Meaning | Example wording |
| --- | --- | --- |
| Verified fact | A claim checked against an identified source | The selected official feed lists this stop on its recorded service date. |
| Derived estimate | A result calculated using a disclosed method and assumptions | Estimated residents in the selected area, using allocated Census counts. |
| Interpretation | An author's reading of evidence | This connection could help neighbors reach nearby destinations. |
| Assumption | An input selected without direct verification | The concept assumes a uniform walking speed. |
| Unverified claim | A statement awaiting evidence | The existing lane count has not been checked at this location. |

The planned snapshot must retain its geometry revision and hash, source
identifiers and content hashes, source reference periods, boundary vintages,
variable definitions and universes, method identifier and version, parameters,
coverage diagnostics, uncertainty treatment, creation time, and reviewer
decision. A *universe* is the group measured, such as all people or occupied
households; the two cannot be substituted for each other.

The canonical `sourceInputs` records in the project format bind each source
identifier to its exact hash and vintage metadata. Contributors must preserve
that association; independent lists of names, hashes, and years must not be
combined by guesswork. A changed source produces a new immutable source
record, even when its URL and published year stay the same.

The map and research workflow must reference the same immutable area revision.
An animation must use the stored snapshot and its matching geometry, without
requesting live data or recalculating results during rendering. A display-only
simplification must retain its relationship to the analytical geometry and
must not silently become the calculation boundary.

The application must flag dependent results as stale when the selected geometry,
source release, method, or relevant parameters change. An old snapshot remains
readable and reproducible, but publication approval must not silently transfer
to the changed inputs. The author must review a recomputed snapshot or
explicitly publish an older, correctly dated snapshot with its original area.

## Area geometry

The planned importer must validate GeoJSON Polygon and MultiPolygon inputs,
including finite coordinates, coordinate order, ring closure, holes, and
self-intersections. GeoJSON uses longitude then latitude; a source in another
coordinate reference system requires an explicit, recorded conversion before
import. An unknown coordinate system is an error, not a reason to guess.

The area validator must preserve the original source and produce a separate
revision after any correction. The author must see changes that affect the
boundary. Multiple overlapping pieces of one study area must be dissolved to
a union before area weighting, so their overlaps do not count twice.

Area calculations must use a validated geodesic method or a suitable equal-area
projection, with the choice and units recorded. Square degrees and Web Mercator
screen area are not acceptable denominators. Empty geometries, zero-area parts,
invalid intersections, and missing source coverage require explicit diagnostics.

Turf is the initial TypeScript geometry library; contributors must validate the
selected operations against known fixtures before publishing results. A later
DuckDB Spatial adapter may accelerate a proven method but must not change its
meaning or its snapshot inputs.

## Census sources and variables

The initial pipeline should use a selected public Census download, with an
optional Census API adapter. The core workflow must work from locally imported
files without an application account, cloud service, or required paid API.
The adapter must respect the source's access requirements and must not make
account-free operation depend on an unverified API quota or authentication rule.

The American Community Survey (ACS) is a sample survey. Its five-year releases
describe a period and include block-group estimates; they are not a count on
the final day of that period. The official developer catalog inspected on
November 11, 2026 lists the 2020–2024 five-year release, but an implementation
must choose and record an exact release rather than request an unspecified
latest dataset. [Census ACS five-year catalog](https://www.census.gov/data/developers/data-sets/acs-5year.html)

The following families serve different research purposes; no Maple values have
been acquired or approved.

| Source family | Candidate use | Required checks |
| --- | --- | --- |
| Decennial Census public counts | Population baseline with small source areas | Product definition, reference date, disclosure treatment, and boundary vintage |
| ACS five-year detailed tables | Population, housing, and economic estimates | Variable metadata, universe, annotations, margins of error, and period |
| TIGER/Line boundaries | Source-area geometry joined by geographic identifier | Product year, identifiers, coordinate system, and coverage |
| Census relationship files | Investigate changes between geographic vintages | Exact relationship type and whether it supplies a usable allocation weight |
| Public local datasets | Context for a specific corridor or project | Issuer, effective date, collection method, rights, and geographic scope |

The importer must preserve estimates, margin-of-error fields, annotation
fields, geographic identifiers, and table metadata together. Suppressed,
unavailable, or special coded values must become typed missing values with
their reason, never ordinary negative counts or zeros. Geographic identifiers
must remain strings so leading zeros survive.

The first Day 3 pipeline may support one validated population count variable
and one source vintage. Contributors should widen coverage only after the
initial pipeline passes the [testing gates](../planning/testing-and-gates.md).
An unsupported income or historical result must remain unavailable rather than
be generated from a superficially similar field.

### Selected first population pipeline

Day 3 targets the 2020–2024 ACS five-year Total Population table, `B01003`,
for Dallas County block groups, using TIGER/Line 2024 block-group geometry.
This choice fixes the initial implementation scope; it does not establish that
any acquired rows, geometry, or resulting Maple estimate have been validated.

The source selection was checked on November 11, 2026 against these official
metadata and directory pages.

| Input | Selected file or metadata | Use |
| --- | --- | --- |
| Population metadata | [2024 ACS five-year B01003 variables](https://api.census.gov/data/2024/acs/acs5/groups/B01003.html) | API estimate `B01003_001E`, MOE `B01003_001M`, and `EA`/`MA` annotations |
| Account-free table download | [acsdt5y2024-b01003.dat](https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b01003.dat) | Public table-based summary-file rows; no API key needed to select this download path |
| Table and geography definitions | [2024 summary-file documentation directory](https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/documentation/) | `ACS20245YR_Table_Shells.txt`, `Geos20245YR.txt`, and `README.txt` |
| Source polygons | [tl_2024_48_bg.zip](https://www2.census.gov/geo/tiger/TIGER2024/BG/tl_2024_48_bg.zip) | Texas block groups; retain the archive's metadata and projection |

The data steward must inspect the actual headers and metadata before mapping
fields. Summary-file labels such as `B01003_E001` and `B01003_M001` follow a
different naming convention from the API; the importer must normalize both to
one internal measure without assuming interchangeable column names.
[Census table-based summary-file guidance](https://www.census.gov/programs-surveys/acs/data/summary-file.html)

The selected county filter is Texas state code `48` and Dallas County code
`113`. The importer must select block-group summary level 150, normalize the
documented Census geographic prefix to the 12-digit block-group identifier,
and join it to TIGER `GEOID` as a string. It must verify `STATEFP` and `COUNTYFP`
against the geography metadata, reject duplicate keys, and report every
unmatched row or polygon.

The method baseline is `area-weighted-count`, version `1`, using total
geodesic area for the numerator and denominator. Its output is a modeled
population estimate for the fixed area revision, with source MOEs retained,
combined uncertainty marked not quantified, and uniform-area allocation
disclosed. A verified land or residential mask is a separate future method,
not an unstated adjustment to this baseline.

The data steward should acquire and hash these files before Day 3 starts.
Binary contents and row-level values were not inspected during planning;
official directory listings and variable metadata establish availability and
selection only. If an area extends beyond Dallas County, the importer must
report incomplete coverage or acquire the additional counties explicitly.

## Initial local vector basemap

The initial offline basemap should use locally imported TIGER/Line 2024 roads,
water, and place boundaries with Storytelling Studio's own styling. This
provides a concrete no-key baseline without a hosted tile provider; imagery
remains a separately reviewed layer. The basemap is geographic context, not a
pedestrian network, street design survey, or substitute for DART data.

The following archives were confirmed in official directory listings on
November 11, 2026; their contained geometry still requires inspection.

| Context layer | Selected public archive |
| --- | --- |
| Dallas County roads | [tl_2024_48113_roads.zip](https://www2.census.gov/geo/tiger/TIGER2024/ROADS/tl_2024_48113_roads.zip) |
| Dallas County area water | [tl_2024_48113_areawater.zip](https://www2.census.gov/geo/tiger/TIGER2024/AREAWATER/tl_2024_48113_areawater.zip) |
| Texas incorporated and statistical places | [tl_2024_48_place.zip](https://www2.census.gov/geo/tiger/TIGER2024/PLACE/tl_2024_48_place.zip) |

The data steward should prepare the basemap in a local GIS tool, recording the
actual tool version and all transformations. The preparation task should
download and hash the original archives, inspect their metadata and source
notices, select the verified story extent and appropriate place records,
convert to GeoJSON longitude/latitude, and export validated display layers.
Any simplification must produce a display copy and retain the original source.

The reviewer must inspect road names, disconnected pieces, extent clipping,
and relative placement against independent geographic evidence. A road
centerline establishes neither existing lane widths nor pedestrian permission;
the animation must not imply either. The 2024 vintage must remain visible in
the source record even when the film is produced in 2026.

TIGER source acknowledgment is part of the asset review. The official Census
catalog describes TIGER/Line as usable in products and publications with
source acknowledgment, while distinguishing statistical boundaries from legal
land descriptions. Exact archive notices must still be preserved before
distribution. [Census-published TIGER/Line catalog metadata](https://catalog.data.gov/dataset/series-information-for-census-tract-state-based-tiger-line-shapefiles-current)

An OSM extract can later supply more detailed context under its own license.
It is not required to get the initial vector map working, and public OSM tiles
must not be captured to manufacture the offline basemap.

## Arbitrary-polygon estimates

A user-drawn neighborhood or walkshed seldom matches Census reporting areas.
The application must distinguish an exact sum of whole reporting areas from
an allocation estimate for partial areas. Adding the complete population of
every intersecting block group is not an estimate of population inside the
selected polygon and must not be offered as that statistic.

### Allocate additive counts

For a selected area `A`, nonoverlapping source areas `G_i`, and an additive
source count `C_i`, the planned baseline uses an explicitly chosen support
measure `m`:

```text
w_i = m(A intersect G_i) / m(G_i)
estimated_count(A) = sum(w_i * C_i)
```

The baseline support measure is area. This method assumes the counted people
or units are distributed uniformly across each source area's selected support,
which can be a poor assumption along a mixed-use corridor. Contributors must
record whether the support is total area or a verified land mask and use the
same measure in numerator and denominator.

A later *dasymetric* method can allocate counts using a documented residential
support dataset, such as validated inhabited blocks or building information.
It must identify the support data, vintage, weight construction, limitations,
and validation. Building area alone is not evidence of residents or household
income, and a land mask from another year does not eliminate allocation error.

The allocation implementation must satisfy these rules:

- Use weight 1 for a fully included source area and weight 0 for an area that
  merely touches the study boundary without measurable overlap.
- Clip weights to valid numerical tolerance only after diagnosing geometry
  errors; retain the measured tolerance in validation evidence.
- Dissolve overlapping study-area pieces before weighting, and retain holes
  and disconnected parts correctly.
- Reject zero denominators and duplicate geographic records rather than
  silently skipping or counting them twice.
- Record uncovered study area and missing source estimates separately; never
  renormalize the remaining records to imply complete coverage.
- Preserve unrounded contributions and round only presentation values using a
  disclosed rule suited to the estimate's uncertainty.

For a synthetic arithmetic fixture, half of an area with a count of 100 and a
quarter of an area with a count of 60 produce `0.5 * 100 + 0.25 * 60 = 65`.
The complete touched-area sum, 160, is intentionally the wrong answer. These
figures are invented test values and do not describe Maple Avenue or Dallas.

### Treat rates and medians differently

The method registry must classify each variable before aggregation. A numeric
type alone does not establish that addition or area allocation is meaningful.

| Variable type | Permitted approach | Prohibited shortcut |
| --- | --- | --- |
| Additive count | Allocate or sum compatible counts with an explicit universe | Sum every touched geography in full |
| Percentage or rate | Aggregate compatible numerator and denominator counts, then divide | Average percentages without denominators |
| Density | Divide an approved count estimate by a clearly defined area | Mix people per acre with people per square mile |
| Mean | Use compatible total and count quantities when available | Average means without valid weights |
| Median | Use an exact published-area median or a separately reviewed distribution-based estimator | Sum or average source-area medians |

An arbitrary-polygon median household income cannot be obtained by weighting
block-group median incomes. A future estimator could combine income-bin counts
with explicit household allocation and within-bin assumptions, but it would be
a modeled median with its own uncertainty. Until that method is implemented
and reviewed, the application must show the metric as unsupported or show
clearly labeled source-area context without calling it the selected area's
median.

Income comparisons must use compatible concepts and a stated dollar year.
Inflation adjustment must identify the index, base year, factors, and method;
nominal and adjusted values must never share an unlabeled series. The first
research pipeline does not imply support for income aggregation.

### Keep uncertainty visible

ACS estimates include sampling uncertainty. The published margin of error
(MOE) uses a stated confidence level; Census guidance describes the standard
90% level and statistical comparison procedures. A displayed estimate without
its relevant uncertainty can imply unjustified precision.
[Census statistical testing guidance](https://www.census.gov/programs-surveys/acs/guidance/statistical-testing-tool.html)

For fixed weights, variance of a weighted sum depends on both individual
variances and covariance between source estimates. The implementation must not
assume independence merely because the inputs occupy different rows. A
root-sum-of-squares calculation is a conditional approximation, not an automatic
MOE for every allocated result.

The snapshot must distinguish source sampling error from allocation error,
boundary uncertainty, network omissions, and vintage mismatch. The uniform-area
model adds uncertainty that a source ACS MOE does not quantify. Even an approved
sampling calculation must not be labeled as a confidence interval covering all
those errors.

The initial pipeline must retain original MOEs and document whether a combined
MOE is supported. When it is not supported, the result must say that combined
uncertainty is not quantified and include the allocation limitation; it must
not show zero uncertainty or manufacture significance. Sensitivity results
from alternative support choices must be labeled model comparisons, not
statistical confidence intervals.

## Historical comparisons

Census advises comparing nonoverlapping ACS five-year periods and checking
changes in variables and geography. Overlapping five-year releases share
observations and must not be presented as independent annual measurements in
this project's first pipeline. [Census comparison guidance](https://www.census.gov/programs-surveys/acs/guidance/comparing-acs-data.html)

The comparison validator must check all of the following before a trend scene
can be approved:

- Use compatible source products, universes, units, variable definitions, and
  reference periods, with nonoverlapping ACS windows.
- Use one fixed study-area revision for both periods and an explicit method for
  mapping each period's source geographies to it.
- Record boundary changes and harmonization evidence instead of assuming an
  unchanged geographic identifier means an unchanged area.
- Verify historical support weights rather than applying a present-day
  residential pattern as an unexplained fact about the past.
- Carry missing observations and uncertainty through the calculation, and use
  an appropriate significance method before claiming meaningful change.
- Separate nominal dollars from adjusted dollars and disclose the adjustment
  basis for any income comparison.

Census [relationship files](https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.html)
help identify geographic relationships, but their existence does not establish
a population-weighted historical crosswalk. The chosen file and its fields
must be inspected before it is used as an allocation model.

The renderer must not interpolate missing historical measurements, extrapolate
past the observed periods, or animate a smooth numeric series that implies
unmeasured annual data. A visual transition between two valid period estimates
must label the periods and make clear that intermediate frames are animation,
not observations. If comparability fails, the trend remains blocked; a dated
baseline scene can still be useful if it passes its own review.

The bounded first comparator candidate is ACS 2015–2019 five-year Total
Population, table `B01003`, with the corresponding 2019 TIGER block-group
geography. Its [official variable metadata](https://api.census.gov/data/2019/acs/acs5/groups/B01003.html)
and the [2019 block-group download directory](https://www2.census.gov/geo/tiger/TIGER2019/BG/)
were checked on November 11, 2026; no historical observations or crosswalk
were acquired. The analyst must verify the release's geography, compatible
support and allocation, and uncertainty before comparing it to 2020–2024.

Nonoverlapping periods alone do not approve this comparison. If the bounded
task cannot establish compatible geography and an honest uncertainty treatment,
the author should record the failed comparison check and omit the conditional
trend scene. That documented omission does not block completion of the first
Maple film, whose required quantitative scene is the approved population
baseline; arbitrary-area income is a separate optional capability.

## Network walksheds

A *walkshed* represents places reachable through a pedestrian network within a
specified travel budget. The Maple target is 600 seconds from multiple
verified access origins along the selected corridor, not just one point near
its midpoint. The statement must make clear whether travel is to or from the
corridor; a directed network can make that distinction matter.

Day 2 prioritizes importing a verified external network analysis as GeoJSON.
Local generation is optional future work for that sprint. A circular or
line-based distance buffer may be useful as a labeled distance envelope, but
must never be described or styled as a verified ten-minute walking area.

The imported analysis must carry the following evidence:

| Input or decision | Required record |
| --- | --- |
| Pedestrian network | Provider, extract date, license, coverage, and content hash |
| Origin set | Corridor revision, all origin coordinates, access rationale, and snapping decisions |
| Travel model | Engine and version, walking speed, 600-second limit, direction, and impedance units |
| Access rules | Allowed paths, crossing rules, barriers, private access, stairs, and treatment of missing sidewalks |
| Polygon construction | Reachable edges or nodes, hull or interpolation settings, holes, and smoothing |
| Validation | Spot checks at crossings and barriers, disconnected components, edge-of-extract coverage, and reviewer |

The corridor origin selection must include meaningful access points and cover
the corridor's extent. The author must inspect whether snapping crosses a
barrier or places an origin on an inaccessible road. The combined area must be
the union of reachable results, with overlap counted only once.

A polygon can fill gaps that the network never traverses. The reviewer must
compare it to reachable network evidence and known barriers, and disclose the
polygonization method. A ten-minute model does not guarantee an accessible,
comfortable, safe, or equally fast trip for every person.

The imported polygon becomes an immutable geometry revision shared by the
animation and population analysis. If origins, network, travel assumptions,
or corridor revision change, dependent research and scenes require a new
review. A result without adequate provenance may be used as a clearly marked
draft illustration, but not as an approved walkshed or population basis.

## Transit and neighborhood boundaries

Dallas Area Rapid Transit (DART) publishes a General Transit Feed Specification
(GTFS) schedule dataset for several fixed-route services. The official page
warns that schedules change; a download URL is not a frozen release or a
blanket reuse license. [DART fixed-route schedule](https://prod.dart.org/about/about-dart/fixed-route-schedule)

Transit imports must retain the downloaded archive hash, retrieval time,
service dates, route and stop identifiers, shape relationships, and source
terms. The reviewer must check rail alignments, station and stop locations,
bus route variants, and selected service dates against authoritative evidence.
Contributors must not fabricate a transit alignment when a shape is missing.

GoLink is on-demand service and must not be depicted as a scheduled fixed
route. Any GoLink service-area polygon needs its own authoritative source,
effective date, terms, and validation; the fixed-route schedule page does not
establish that a GoLink geometry is present or usable.

A study boundary for Oak Lawn may be an editorial boundary drawn for the story.
Its metadata must say who selected it, why, and when, and its caption must call
it a study area rather than an official neighborhood boundary. A source labeled
official requires verification of the issuing authority and the specific
boundary's status.

## Provider rights matrix

The following preliminary findings were checked against official sources on
November 11, 2026. They guide source selection; no specific Dallas asset has
been downloaded, validated, or approved for publication by this matrix.
`UNKNOWN` means a permission or condition has not been established, not that
use is prohibited.

The use matrix distinguishes source-data rights from the terms of a hosted
service, which can be more restrictive.

| Provider or product | Local data and caching | Derivative video and redistribution | Decision for the plan |
| --- | --- | --- | --- |
| Census public tables and API | Public-data analysis supported; use a selected download and preserve its terms, or follow API access conditions | Attribute original data and identify project calculations; no implied Census endorsement | Candidate; exact files and citations still require review |
| Census TIGER/Line | Inspect the chosen file's metadata and preserve its source notice | Use only the verified product's terms; statistical boundaries are not legal land descriptions | Candidate; asset-level metadata pending |
| Original USDA NAIP imagery | USDA identifies its acquired aerial imagery as public domain; a hosting service has separate access terms | Original imagery is a candidate for locally rendered derivative video with source credit | Candidate; confirm each tile's origin, acquisition date, and metadata |
| Original Copernicus Sentinel-2 data | Sentinel data terms allow reproduction and adaptation; the access service may require registration and impose quotas | Attribution required for original or modified data; third-party portal illustrations are separate assets | Candidate; use imported raw data with verified access rights |
| OpenStreetMap data extract | ODbL applies to data; obtain an extract from a source whose download terms permit the use | Produced-work attribution and possible derivative-database obligations need review | Candidate; retain data license and extraction provenance |
| `tile.openstreetmap.org` public raster tiles | Normal browser caching is required; prefetch, offline archives, and headless panning are prohibited | Attribution does not authorize prohibited acquisition or caching | Excluded from offline/render capture pipeline |
| DART GTFS, route graphics, and GoLink boundaries | Public schedule link found; feed-specific caching and redistribution grant not established | `UNKNOWN`; general site notice restricts commercial use without permission, and nonprofit status alone is not a grant | Hold asset publication pending applicable terms or permission |
| Dallas or other local GIS datasets | `UNKNOWN` until the exact item and service terms are inspected | `UNKNOWN` until derivative and redistribution rights are recorded | No provider-wide assumption |
| Google imagery or map captures | Not part of the approved source strategy | No rights granted by this plan | Excluded |

The reviewed sources support the following attribution and acquisition decisions.

| Source | Verified guidance and remaining work |
| --- | --- |
| [Census API terms](https://www.census.gov/data/developers/about/terms-of-service.html) | Display the API nonendorsement notice when the API is used, respect access limits, and distinguish transformed results from original source data. |
| [Census citation guidance](https://www.census.gov/about/policies/citation.html) | Cite Census as the source of original data when creating project estimates; retain product, vintage, variable, and retrieval details. |
| [USDA imagery hub](https://apfo-usdaonline.opendata.arcgis.com/) and [USGS NAIP description](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-national-agriculture-imagery-program-naip) | Prefer original USDA imagery and record acquisition year and product; do not infer the rights of an unrelated mosaic or basemap from NAIP's status. |
| [Sentinel legal notice](https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice) and [Data Space terms](https://dataspace.copernicus.eu/terms-and-conditions) | Record the correct original or modified-data notice with its year; the portal's non-data content has distinct restrictions. |
| [OSM copyright](https://www.openstreetmap.org/copyright), [tile policy](https://operations.osmfoundation.org/policies/tiles/), and [attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) | Preserve ODbL provenance; for a map-focused video plan readable map credit plus credits or description, and review any distributed derivative database separately. |
| [DART schedule page](https://prod.dart.org/about/about-dart/fixed-route-schedule) and [legal notices](https://prod.dart.org/about/public-access-information/legal-notices) | Archive the applicable feed or asset terms when acquired; the GTFS format itself grants no data license. |

When the Census API is used, the planned interface must include its stated
notice: “This product uses the Census Bureau Data API but is not endorsed or
certified by the Census Bureau.” Derived film statistics must still identify
Storytelling Studio's method and avoid presenting modeled results as published
Census estimates.

For modified Sentinel data, the notice uses “Contains modified Copernicus
Sentinel data” with the applicable year. A source manifest must preserve the
exact credit needed for the chosen product, including processor attribution
where applicable. Original data rights do not automatically cover a provider's
logo, interface screenshot, or finished promotional image.

## Research and publication gates

The source manifest must record source owner, canonical URL, retrieval date,
effective or acquisition date, coverage, content hash, local file references,
license or terms evidence, permitted uses, required credit, transformations,
and rights-review status. The publication record must identify the actual
reviewer and the exact asset and snapshot revisions approved.

The author should complete these gates in sequence:

1. Validate source identity, coverage, reference period, license evidence, and
    original bytes before using an asset in a factual scene.
2. Validate the selected area, source joins, variable definitions, allocation
    method, and uncertainty treatment before approving a research snapshot.
3. Compare the narration, labels, geometry, and charts with the approved
    snapshot, and resolve any unsupported claims.
4. Review both output aspect ratios for readable attributions, sources,
    limitations, and captions before approving a publication candidate.

The application must block an approved-publication export when required rights
or research review is unknown, rejected, or stale. A local draft preview may
retain a conspicuous draft state; producing a draft file is not permission to
publish it. Missing required evidence keeps the full
[Maple production milestone](../planning/maple-production.md) incomplete.

## Failure and recovery

The planned workflow should explain what failed without deleting good inputs.
These recovery rules apply to the eventual interface and contributor guides.

| Problem | Required response |
| --- | --- |
| Invalid geometry or unknown coordinate system | Preserve original bytes, explain the failed check, and require an explicit corrected import. |
| Missing data or source mismatch | Keep missing values visible and select a compatible source; do not convert them to zero. |
| Stale snapshot | Preserve the old result, list changed dependencies, and recompute or restore its matching revisions. |
| API or network failure | Retry within provider terms or import a lawful public download; never invent a replacement observation. |
| Inadequate walkshed provenance | Obtain the network, origins, and method evidence or remove the walking-access claim. |
| Unknown asset rights | Hold the asset from publication and choose a verified alternative or obtain applicable permission. |
| Unsupported historical or income comparison | Omit the claim and keep the unresolved research task explicit. |

## Acceptance evidence

Contributors must demonstrate method behavior with meaningful fixtures before
using real data. The fixture suite must cover whole and partial source areas,
touch-only intersections, holes, multipart unions, duplicate identifiers,
zero-area inputs, missing observations, and unit consistency.

The research integration check must demonstrate the same area revision in the
map, snapshot, and rendered scene; a boundary edit must invalidate dependent
approval. The comparison checks must reject overlapping ACS periods,
unharmonized geographies, unsupported median aggregation, invalid source
annotations, and unjustified uncertainty calculations.

The walkshed check must include multiple corridor origins, a barrier or
disconnected component, sufficient network coverage, and a comparison of the
displayed polygon with reachable network evidence. The rights check must
demonstrate that unknown terms prevent approved publication and that required
credits survive portrait and landscape composition.

The Day 3 gate can accept a narrow, validated population pipeline with honest
limitations. It cannot pass a fabricated trend, unexplained income estimate, or
an incomplete coverage result presented as a complete-area population.
