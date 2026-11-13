# Dallas Urbanists Storytelling Studio

Storytelling Studio is a local application for importing geographic evidence,
estimating population, and making editable map and roadway explainer videos.
Explore, Research, and Animate share one project and its source records.

This branch delivers the application as one integrated change. The owner
authorized this approach on November 13, 2026. The
[delivery record](docs/planning/integrated-delivery.md) distinguishes verified
software from the remaining factual and publication work for the Maple Avenue
pilot. Individual backlog closures are not required to use or develop this
branch.

## Run the studio

Use Windows x64, Node 24.22.1, and npm 11.19.1. Install the pinned dependencies
from the repository root:

```powershell
npm ci
```

Copy `.env.example` to `.env` and set `GSTORY_CHROME` to an installed Chrome or
Chromium executable for video export. The editor does not need a cloud account
or API key. Start the application:

```powershell
npm run dev
```

Open the loopback URL printed by the command (port 4173 by default).
[Make your first story](docs/user-guides/how-to-make-a-story.md) explains the
controls. The development server stays in the foreground. In another terminal,
you can inspect or stop this checkout's services:

```powershell
npm run dev:status
npm run dev:stop
```

Saved projects, original assets, job receipts, and videos remain under
`.local/storytelling-studio` after shutdown. Browser recovery copies preserve unsaved edits
on the same browser origin. Keep the default port stable when using recovery.
A portable `.gstory` download is the supported way to transfer a project.

## Verify and contribute

```powershell
npm run check
npm run build:studio
npm run test:render-contract:unit
npm run test:render-contract
```

The last command needs the configured local browser and performs full-size
preview/export comparisons and two complete video decodes. It is separate from
the ordinary checks because rendering takes longer.

The Vue/Quasar authoring app, local SQLite service, and React/Remotion renderer
share serializable contracts and deterministic frame evaluation. See the
[documentation index](docs/README.md), [agent rules](AGENTS.md), and
[implementation status](docs/implementation-status.md) for scope and evidence.
The earlier sprint and controller documents remain historical requirements;
this delivery does not launch an orchestrator or require ticket scheduling.

The authoring and export profile currently supports retained GeoJSON and local
vector styling. Remote tile services, aerial-media compositing, historical
comparisons without compatible source evidence, and a local network-routing
engine are not available in this candidate. Import an externally generated
600-second network walkshed with its evidence packet when that feature is needed.

## License

Original Storytelling Studio code is [MIT licensed](LICENSE).
Dependencies, fonts, geographic data, and imagery retain their own terms; see
[third-party notices](THIRD_PARTY_NOTICES.md). Importing a file does not grant
publication or redistribution rights.
