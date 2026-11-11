# Dependency and license evidence

Implementers can use this evidence register to select compatible dependencies
without treating a package name as proof of permission or runtime support.
Sources were inspected on November 11, 2026. No packages were installed and no
dependency combination was tested during planning.

## Runtime and integration evidence

The following observations constrain the first compatibility check.

| Dependency | Evidence | Planning consequence |
| --- | --- | --- |
| Node.js | The [official release table](https://nodejs.org/en/about/previous-releases) lists both 24 and 26 as LTS; this computer has 24.22.1 | Start from the installed supported 24 LTS line and pin the tested patch; do not silently switch to a newer major |
| npm workspaces | [npm's workspace documentation](https://docs.npmjs.com/cli/v11/using-npm/workspaces/) describes a root manifest and linked local packages | Use one root lockfile and explicit package dependencies; validate build order rather than assuming workspace iteration sorts dependencies |
| Quasar | [Quasar CLI documentation](https://quasar.dev/start/quasar-cli/) distinguishes optional global CLI from local `@quasar/app-vite` | Use Quasar CLI with Vite and local package scripts; a generic Vue/Vite scaffold is insufficient |
| SQLite binding | [Node 24.22.1 SQLite reference](https://github.com/nodejs/node/blob/v24.22.1/doc/api/sqlite.md) marks `node:sqlite` a release candidate and exposes `DatabaseSync` | The binding choice must explicitly account for stability and Windows native-module support; see the architecture's selected adapter |
| Remotion | [Version 4 terms](https://www.remotion.dev/docs/terms-4-0) distinguish effective v4 terms from upcoming v5 terms | Pin compatible Remotion packages to the same exact version and review that version's license |
| Rendering binaries | The [old `ensureFfmpeg` reference](https://www.remotion.dev/docs/renderer/ensure-ffmpeg) states that this API was removed in v4 | Do not copy v3 FFmpeg setup calls; identify the selected renderer's actual browser and media binaries during the first export check |

The [rendering contract](../architecture/rendering-contract.md) specifies the
frame-readiness check, pinned assets, rendering environment, and failure
behavior. A successful web preview alone does not validate that contract.

## Software license observations

This table records inspected upstream license files. It is not a complete
software bill of materials: the exact installed versions, dependencies, fonts,
browser binaries, and media binaries must be recorded during implementation.

| Component | Inspected license | Source |
| --- | --- | --- |
| Vue core | MIT | [Vue license](https://github.com/vuejs/core/blob/main/LICENSE) |
| Quasar | MIT | [Quasar license](https://github.com/quasarframework/quasar/blob/dev/LICENSE) |
| Vite | MIT | [Vite license](https://github.com/vitejs/vite/blob/main/LICENSE) |
| TypeScript | Apache-2.0 | [TypeScript license](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt) |
| MapLibre GL JS | BSD-3-Clause with retained third-party notices | [MapLibre license and notices](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt) |
| Turf | MIT | [Turf license](https://github.com/Turfjs/turf/blob/master/LICENSE) |
| React | MIT | [React license](https://github.com/react/react/blob/main/LICENSE) |
| SQLite core | Public domain dedication | [SQLite copyright statement](https://www.sqlite.org/copyright.html) |
| Remotion | Remotion's own eligibility-dependent license | [Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) |
| FFmpeg | LGPL-2.1-or-later baseline; configuration and linked libraries can change obligations | [FFmpeg license](https://github.com/FFmpeg/FFmpeg/blob/master/LICENSE.md) |
| Electron, later phase | MIT for Electron; bundled components have additional notices | [Electron license](https://github.com/electron/electron/blob/main/LICENSE) |
| DuckDB, later phase | MIT for core; Spatial extension dependencies require their own inventory | [DuckDB license](https://github.com/duckdb/duckdb/blob/main/LICENSE) |

The inspected Remotion license blob is
`b0ad889f2b3eaee020de507ca6e98f1f1b664c9d`. Its free-use categories include
nonprofit and not-for-profit organizations. The owner confirmed that Dallas
Urbanists operates in that category on November 11, 2026; that confirmation
supports the planned local video-production use under the inspected terms.

Storytelling Studio's MIT decision does not relicense Remotion or guarantee
free Remotion use for every downstream organization. Redistribution of an
application or desktop bundle needs its own review of the pinned dependency
terms; the four-day sprint does not publish an Electron installer.

FFmpeg's upstream license identifies GPL-enabled features and libraries, and
configurations marked nonfree can be unredistributable. Implementers must
inventory the actual binary used for export before bundling it; absence of a
system `ffmpeg` command is not evidence that Remotion v4 lacks media support.

## Geographic data and imagery

MapLibre's software license grants no rights to a tile server's data, styles,
fonts, or images. The canonical provider matrix is in
[research methods](../architecture/research-methods.md), with the selected
Maple assets tracked in the [production plan](maple-production.md).

The initial export gate uses a tiny local fixture with known rights. Production
basemaps, DART material, aerial imagery, and downloaded research records each
need their own source, version, retrieval date, attribution, cache permission,
video-use permission, and raw-redistribution decision. Unknown permission must
not be converted into approval by a successful download.

## Required compatibility evidence

The implementation owner must record the following after the first runtime
check, rather than filling this table with guessed version numbers.

| Record | Required evidence |
| --- | --- |
| Dependency versions | Exact Node, npm, Quasar/app-vite, Vue, TypeScript, MapLibre, Turf, React, and Remotion versions from manifests and lockfile |
| SQLite | Selected binding version, open/save/reopen check, transaction and recovery results on Windows |
| Export environment | Windows version, Chromium version, rendering backend, binary paths and licenses, font hashes, render concurrency |
| Export artifact | Both required resolutions at 30 fps, expected frame count, successful decoding, and repeated-frame comparison |
| Offline behavior | Preinstalled dependencies and local assets suffice to save, edit, and export with network access disabled |
| Notices | Retained upstream notices for the exact dependency artifacts and permitted data assets |

Any incompatible package combination is an implementation finding. Agents
must make a bounded correction within the approved architecture or report the
smallest architectural decision needed; they must not substitute a cloud
renderer or a paid map provider to pass the gate.
