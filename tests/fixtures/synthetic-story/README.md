# Synthetic bridge fixture

This ten-second story contains fictional coordinates, geometry, and text.
The note, basemap style with inline synthetic GeoJSON, and label font are
local assets with SHA-256 values in `project.json`. The fixture contains
300 frames at 30 fps, both target dimensions, camera keyframes, a point, line,
polygon, line and outer-ring trace intervals, and label fade intervals.

Run the bounded schema cases from the repository root with:

```sh
node --test tests/project-schema/validation.test.mjs
```

The label font is the original Inter Regular WOFF2 from the
[Inter v4.1 release](https://github.com/rsms/inter/blob/v4.1/docs/font-files/Inter-Regular.woff2).
Its copyright and SIL Open Font License 1.1 are in
[`assets/OFL-Inter.txt`](assets/OFL-Inter.txt). The synthetic map uses local,
repository-authored geometry.

The fixture supports browser adapter checks. Preview/export parity, video
export, and portable package import require their own evidence.
