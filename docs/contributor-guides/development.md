# Development setup

The workspace provides development stubs and local checks. The studio stub is
not an editor, and the service exposes only a health endpoint.

## Setup and verified versions

Use Node 24.22.1 and npm 11.19.1, then run `npm ci` in the repository root.
On Windows on November 11, 2026, a clean install added 269 packages and left
the D1-01 lockfile unchanged (SHA-256
`7d0b090b50b8f4db09262e1174bd7dbb80e24dac266ceac2d33c9d93932fe27c`).
D1-02 subsequently changes the lockfile to add static-check tooling.
The installer warned that `@parcel/watcher@2.6.0` has an unapproved install
script. No approval was granted. A later Windows probe verified a file change
event with the installed watcher; this does not verify every watcher backend.

The direct pins are Vue 3.5.45, Quasar 2.35.3, @quasar/app-vite 3.10.4,
Pinia 4.1.0, Vue Router 5.5.0, MapLibre GL JS 6.17.0, React and React DOM
19.3.1, Remotion and @remotion/renderer 4.0.542, Turf helpers 7.4.0, and
TypeScript 5.9.3. Vue, Quasar, app-vite, MapLibre, React, Remotion, and the
renderer imported successfully in their intended workspaces. The lockfile
records transitive versions. No real data or cloud account was used.

## Windows rendering probe and licenses

Remotion launched the installed Chrome 157.0.8103.40 through `openBrowser`.
The installed `@remotion/compositor-win32-x64-msvc` 4.0.542 includes FFmpeg and
FFprobe n7.1. Its `ffmpeg -L` declares GPL-2.0-or-later. A synthetic PNG was
encoded to a 64 by 64 H.264 MP4, inspected with ffprobe, and decoded with
FFmpeg. This is a toolchain probe, not proof of the planned rendering bridge.
The FFmpeg executable SHA-256 is
`5d1aa3706022b2f1814993c7108ca689a0a2e6fe9af91ec15dbf0bc05d6d39e4`;
FFprobe is `66468651d02cec1beac8003fcb4aec42363390810ca4435165ef3cf1439c7261`.
These binaries live under `node_modules/@remotion/compositor-win32-x64-msvc/`.

The installed Remotion 4.0.542 license is in `node_modules/remotion/LICENSE.md`
(SHA-256 `bd65083b940f61904f6ef298aade918a7cad72a3e35bc406e36fab365844b673`).
Its free-use eligibility includes nonprofits; the owner confirmed this project
operates as a nonprofit. Other users must assess their own eligibility.
Remotion's [FFmpeg license explanation](https://www.remotion.dev/docs/miscellaneous/ffmpeg-license)
identifies its GPL binary and says it uses the `fdk-aac-free` variant; the
binary configuration contains `--enable-gpl` and `--enable-libfdk-aac`.
The latter flag alone does not identify the library variant. The exact tagged
source-to-binary chain has not been independently verified. Codec patent
rights can be separate from copyright licenses. Before distributing binaries,
review the exact source, notices, corresponding source obligations, and codec
rights for that distribution. This probe does not authorize redistribution.

## Start and stop a development session

Run `npm run dev` from the repository root. Keep that terminal open and use the
reported loopback URLs. From a second terminal in the same checkout, run
`npm run dev:status` to confirm that Studio and the service are ready.

Press Ctrl+C in the foreground terminal or run `npm run dev:stop` from the
same checkout. After shutdown, `npm run dev:status` reports `Stopped`.
The stop command uses the checkout's existing file permissions to request
shutdown through the latest numbered record in `.local/lifecycle/`. The
foreground process closes its listeners and marks its record stopped. The next
start creates a new record. Project files are preserved.

If the foreground process exits abruptly, inspect the latest numbered record
and confirm that its process has exited before removing that record and
restarting. Use a checkout whose local files are writable only by accounts you
trust. The execution environment must permit loopback connections.

## Check the workspace

Run `npm run check` for lint, TypeScript, local Markdown links, and the core and schema unit suite. Run `npm run test:core` for the unit suite alone. No export workflow is implemented yet. ESLint 9.39.5 is reported unsupported by npm, and the TypeScript lint dependency chain has a moderate minimatch advisory; see the D1-02 receipt for details.
