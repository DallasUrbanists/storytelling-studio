# Make a geographic story

You can import places, build scenes, and export a video with its editable project.
These controls were exercised with synthetic examples in the integrated
November 13, 2026 candidate. A developer must start the local application first.

## Create and save a project

1. Choose **Create project** and give your story a title.
2. Use **Save** after a useful change; **Undo** and **Redo** cover edits in the current session.
3. Open an existing project from the project list to continue working.

A save creates an immutable revision. An export keeps using the revision you
selected even if you continue editing. If another window saves first, the
application reports a version conflict and preserves your draft; download the
draft before reopening the latest saved project and reapplying your changes.

After a reload, use **Recover browser draft** to recover unsaved changes on this browser
and port. Recovery does not replace the latest saved revision automatically.

## Import and inspect places

1. In **Explore**, import a WGS84 GeoJSON file containing points, lines, or areas.
2. Enter its publisher, source date, interpretation, and permissions; confirm the rights you actually have.
3. Select a feature from the library or map and inspect its evidence.

MultiLineString and MultiPolygon files retain their separate parts. The importer
rejects invalid geometry instead of silently repairing it. Limit an import to
500 features and 50,000 positions; a smaller extract may be needed to fit the
project document budget.

Use **Replace geometry** when updating a feature. Its old geometry remains in
saved revisions, and research based on the old shape must be recomputed. Use
the source editing control to correct metadata explicitly; that change retains
the previous source record and invalidates dependent approvals.

You can also draw an editorial point, line, or area. A drawing is an
interpretation, not a substitute for an official boundary.

## Build scenes

1. Select a feature and add a focus scene, then open **Animate**.
2. Set the scene title, duration, caption, and credit; arrange scenes with the scene controls.
3. Choose **Landscape** or **Portrait** and frame each format independently.
4. Scrub or play the timeline to inspect the beginning, transitions, and final frame.

The inspector controls camera keys, focus steps, labels and their fade timing,
outside dimming, and variant-specific label offsets. Layer controls set colors,
line width, groups, scene ranges, route tracing, and fill fade timing. Labels
and captions use the retained local font.

## Estimate population

1. Select a study area, then open **Research**.
2. Supply the matching ACS 2024 five-year B01003 table and TIGER/Line 2024 block-group GeoJSON, and confirm the dataset and vintage.
3. Choose **Save inputs & calculate**, then inspect coverage, the allocation ledger, and the uncertainty note.
4. Enter your reviewer name and confirm your review before approving a complete snapshot.

The estimate allocates block-group counts by geodesic area overlap. It assumes
uniform population within each block group. Missing counts, uncovered areas,
and overlapping source boundaries prevent a complete estimate; missing data
never become zero. Source margins of error remain in the ledger, but the
application does not present them as a validated margin of error for the
allocated study-area total.

An approved snapshot can become a research scene. The film shows the estimate,
source period, and limitation together. Updating its geometry or source
evidence makes its approval stale. A pending analysis resumes when you return
to Research; the saved input and completed result survive application restart.

## Attach a network walkshed

Use the walkshed controls for an imported 600-second network result. Retain the
original walkable network and reachable-network extract, and record the tool,
version, origins, speed, barriers, assumptions, and technical review.

A circular distance buffer is not a network walkshed. The application validates
the evidence packet but cannot certify that the external routing tool used the
real-world network correctly. A knowledgeable reviewer must check that.

## Show a roadway change

1. Select the corridor and create a roadway scene.
2. Set the existing and proposed bands, widths, directions, and curb-to-curb and envelope constraints.
3. Inspect the width budget and mapping before previewing the transition.
4. Record evidence for each measured or estimated dimension, or keep the dimension explicitly labeled as an assumption.

The illustrative preset is a design exercise, not a measurement of Maple
Avenue. Segment controls can split the corridor, reference shared layouts, and
set different start and end widths for a taper. The transition keeps left-to-right
band order and interpolates mapped widths; additions and removals enter or
leave at zero width. It shows assumption qualifiers in the film.

## Export or transfer your story

1. Save your work and open **Export & exchange**.
2. Resolve the listed source, rights, research, and resource issues.
3. Select one or both video formats and choose **Render saved revision**.
4. Download the completed video or a **portable .gstory** project.

Both video formats use 30 fps. An output is downloadable only after its
dimensions and every decoded frame have been verified. You can cancel a render
without losing the saved project.

A portable package includes original assets only when redistribution is
permitted. A references package records omitted assets; the receiving author
must supply the exact matching bytes using the resource controls. Importing a
package creates a new project identity and retains its origin.
