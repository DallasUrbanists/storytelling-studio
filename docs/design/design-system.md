# Design system

Designers and contributors can use this plan to make map authoring understandable
and the resulting film readable. The interface should keep the selected place,
supporting evidence, and active scene visible while giving the map most of the
available space.

**Status: planned, not implemented.** These are starting design requirements
for the Vue/Quasar application and shared video surface, not a record of
finished screens or verified accessibility conformance.

- [Visual principles](#visual-principles)
- [Workspace shell](#workspace-shell)
- [Color and spacing tokens](#color-and-spacing-tokens)
- [Typography](#typography)
- [Map and annotation language](#map-and-annotation-language)
- [Component contracts](#component-contracts)
- [Research and roadway presentation](#research-and-roadway-presentation)
- [Motion and output framing](#motion-and-output-framing)
- [Accessibility and responsive behavior](#accessibility-and-responsive-behavior)
- [Review evidence](#review-evidence)

## Visual principles

The interface should support a calm, precise civic storytelling workflow. The
map and authored content should receive stronger visual emphasis than panel
chrome; sources, uncertainty, and save status should remain easy to inspect.

Contributors should apply the following principles.

- Keep Explore, Research, and Animate in one project shell with one selected
  feature and a consistent library.
- Prefer labeled controls and editable numeric values over hidden gestures or
  unexplained icons.
- Reserve strong colors for selected geometry, intentional emphasis, transit,
  and roadway uses; keep background geography subdued.
- Distinguish a sourced fact, a calculated estimate, an author assumption, and
  an incomplete draft through words as well as appearance.
- Show what an action changes before it affects an approved scene or replaces
  a resource, while allowing ordinary reversible edits without interruptions.

## Workspace shell

The planned desktop shell has a persistent project header and three workspace
tabs. Switching workspaces must preserve the current project, selected feature,
map location, and saved research relationships.

```text
Project title     Explore | Research | Animate     Save status     Export
----------------------------------------------------------------------------
Feature/library panel       Map or fixed output preview       Inspector
Selected feature            Canvas tools and scale            Context fields
Layers and source status    Variant and readiness indicator    Sources/review
----------------------------------------------------------------------------
Animate only: scene strip, play/pause, frame/timecode, scene duration
```

Explore should emphasize importing, replacing, selecting, and inspecting
geographic features, with drawing controls added in a later phase. Research
should retain the selected area on the map and
show source and result cards. Animate should show the fixed output frame,
scene strip, timing, camera, and label controls.

The default shell can use a 280-pixel library panel and a 320-pixel inspector
at comfortable desktop widths. Panels must collapse without shrinking the
internal video canvas; the preview scales as one fixed-size surface. The
initial app targets desktop authoring, with a usable single-panel layout on
narrow windows rather than a separate mobile editor.

## Color and spacing tokens

The following tokens are proposed starting values. Contributors must verify
actual text/background combinations in the implemented components rather than
assume a color token is accessible in every use.

The authoring theme and exported visual styles must have separate code
boundaries. Quasar theme values belong to the studio's CSS and configuration;
film colors, font sizes, line widths, and motion defaults belong to versioned
data-only video style presets in the project schema. The renderer and shared
adapter must not import Quasar components, Quasar CSS, or the studio's theme
files, even when an editor and film color happen to match.

| Token | Value | Intended role |
| --- | --- | --- |
| `surface-app` | `#F4F7F6` | Application background. |
| `surface-panel` | `#FFFFFF` | Inspector and library panels. |
| `text-primary` | `#16262E` | Main interface and map-label text. |
| `text-secondary` | `#52626B` | Supporting text with adequate contrast. |
| `border-subtle` | `#CDD6D8` | Panel divisions and neutral outlines. |
| `action-primary` | `#006D77` | Main action and selected-control emphasis. |
| `focus-area` | `#1768A9` | Story focus outline and controlled fill. |
| `transit-rail` | `#7651A8` | Rail context, accompanied by line pattern and label. |
| `transit-bus` | `#A64E11` | Bus context, accompanied by line pattern and label. |
| `bike-space` | `#267847` | Bicycle space, with an explicit use label. |
| `warning` | `#8A5300` | Incomplete or estimated evidence on a pale surface. |
| `error` | `#B3261E` | Failed validation and destructive actions. |
| `map-land` | `#EDF2EE` | Quiet base-map ground. |
| `map-water` | `#CADFE9` | Water context. |
| `map-road` | `#B7C2C7` | Background road geometry. |
| `annotation-casing` | `#FFFFFF` | Text and leader-line casing. |

The editor should use an 8-pixel spacing rhythm, with 4 pixels for tight related
elements and 16 or 24 pixels between sections. Panel controls should use
consistent 6-pixel corner radii; the video frame and map should not acquire
decorative rounding or shadows that imply exported content includes the UI.

Colors must describe roles rather than cities or agencies in the core theme.
An agency's verified route color can be a project-specific layer override,
subject to readable contrast and source attribution. The reusable application
must not bake Dallas place names or transit branding into its theme.

## Typography

The planned default font is Inter, with locally bundled, pinned font files for
export. The [Inter source license](https://github.com/rsms/inter/blob/master/LICENSE.txt)
identifies SIL Open Font License 1.1; the selected font files must retain their
copyright and license when redistributed. An external font CDN must not be a
render-time requirement.

The editor can use a system fallback while it loads, but the final rendering
surface must wait for the exact selected font. A fallback font must not silently
change label size, line wrapping, or credits in an export.

The following sizes are initial defaults, not a promise that every phrase fits.

| Context | Default size | Weight and use |
| --- | --- | --- |
| Editor body and form labels | 14–16 CSS pixels | Regular or medium. |
| Editor section title | 18 CSS pixels | Semibold. |
| Film title | 64 output pixels | Semibold, short lines. |
| Film place label | 44 output pixels | Semibold, with casing. |
| Film explanation or caption | 40 output pixels | Medium, usually two lines or fewer. |
| Film source/qualifier | 30–32 output pixels | Regular or medium, on a stable readable surface. |

The film values assume a 1080-pixel short side, which both required outputs
share. Typography must scale with the output reference size, not the author's
browser zoom. The author should shorten text, move a label, or extend a hold
before reducing a necessary source or uncertainty statement below readability.

## Map and annotation language

The output basemap should provide orientation without competing with the story.
The first export style uses quiet roads, water, and boundaries with important
place names authored as explicit labels. The
[rendering contract](../architecture/rendering-contract.md) explains why native
map-label collision behavior is excluded from the initial export profile.

The annotation system must use the following visual relationships.

| Element | Planned appearance |
| --- | --- |
| Selected editable feature | Distinct outline in the editor; any later vertex handles must never appear in export. |
| Focus polygon | A 5–7-pixel outline, low-opacity fill, and optional outside dimming. |
| Corridor trace | A visible stroke over a wider contrasting casing, with rounded joins. |
| Point | A filled center with a white ring and a stable geographic anchor. |
| Leader line | A 3-pixel foreground stroke over a 7-pixel white casing at reference output size. |
| Place label | Dark or role-colored text over approximately 4 pixels of white casing. |
| Transit | Route or service-kind styling plus a legend; rail, bus, and service areas must remain distinguishable. |
| Outside dimming | Neutral overlay whose opacity preserves useful context and does not hide required credits. |

The shared SVG builder should use consistent stroke ordering and joins for
casing. A label's leader line must terminate at its saved geographic anchor,
not a screen position left over from another camera frame. The author must be
able to move the label independently in portrait and landscape.

Layer visibility and persistence controls must use text such as **Visible in
this scene**, **Keep visible through**, and **Hide after**. Their controls must
show the affected scene range so an author can predict which transit or context
layers remain on screen after a focus change.

## Component contracts

The following components describe intended interactions, not finalized screen
implementations. Quasar is mandatory for ordinary authoring controls; the
implementation must not create bespoke replacements for controls Quasar
already supplies. Custom rendering is reserved for the map, scene/timeline
surface, label manipulation, and roadway canvas.

The planned authoring components must use these Quasar foundations.

| Authoring need | Required foundation |
| --- | --- |
| App shell and side panels | `QLayout`, `QDrawer`, and `QSplitter`. |
| Workspace selection | `QTabs` with accessible tab panels. |
| Actions and contextual choices | `QBtn` and `QMenu`. |
| Text, numeric, and selection controls | `QInput`, `QSelect`, and `QForm`. |
| Import, conflict, and export dialogs | `QDialog`. |
| Structured research and width tables | `QTable`. |

The custom canvases must still expose their supporting inputs, buttons, menus,
and dialogs through those standard components. A custom map gesture is not a
reason to replace its numeric inspector with unstyled native controls.

| Component | Required behavior |
| --- | --- |
| Project header | Show project title, committed save status, and export entry; a failed save remains visible. |
| Feature library | List named areas, corridors, points, routes, and imported walksheds; selection is shared across workspaces. |
| Map surface | Show canvas readiness, geographic scale/orientation, and context-appropriate tools; keep UI chrome outside the output surface. |
| Feature inspector | Expose name, geometry revision, source, **Replace geometry**, and **Add to story**. |
| Research card | Show value, units, period, method, uncertainty, review state, and source access together. |
| Scene inspector | Expose duration, camera keyframes, focus, trace/fill/dim timing, and per-variant label offsets. |
| Scene strip | Select and reorder scenes; show meaningful names and frame durations rather than require a full video-editing timeline. |
| Export dialog | Choose portrait, landscape, or both; show the exact saved revision and blocking resources before starting. |
| Job status | Show queued/running/completed/failed/cancelled states, progress, and a specific recovery action. |

The project header must distinguish **Unsaved changes**, **Saving**, **Saved**,
**Save failed**, and **Version conflict**. The render surface must separately
distinguish **Loading frame**, **Ready**, and **Resource error**; a saved project
can still contain a frame that cannot render.

The export dialog must explain missing resources in ordinary language, such as
“This scene needs the original aerial image,” and identify the affected scene.
Developer stack traces, package names, or filesystem paths belong in optional
diagnostics rather than the normal authoring flow.

## Research and roadway presentation

Research cards must label **Fact**, **Estimate**, **Interpretation**,
**Assumption**, or **Unverified**, as appropriate to the actual claim. A separate
review status identifies whether the exact snapshot has been approved; an
approved estimate remains an estimate. A **Stale** state must explain which
input changed and retain access to the prior snapshot.

The film must show the period and method qualifier near a quantitative claim,
with fuller source details in its credit treatment or accompanying project.
The interface must not use a green badge alone to imply scientific certainty,
complete coverage, or licensing permission.

The roadway editor must show **Existing** and **Proposed** arrangements with a
shared scale and station range. Width labels must carry units; locked fields
must have both an icon and text; over-allocation must state the amount. A
straightened detail must say **Top-down schematic**, and uncertain dimensions
must retain **Estimated** or **Illustrative** wording in the exported scene.

The initial roadway palette can distinguish pavement, bicycle space, buffers,
and sidewalks through fill and pattern, but the labels and markings must carry
the meaning. A center turn lane must not rely on color alone to distinguish it
from a through lane.

## Motion and output framing

The default motion should combine a purposeful camera move, a readable focus
reveal, and a hold long enough to understand the claim. The first controls need
linear and cubic ease-in-out, trace progress, fill opacity, outside dimming,
and label entrance/exit fades; they do not need a general motion-graphics graph.

The output must use a fixed frame and editable safe-area guides. A starting
guide of 64 output pixels on each edge is reasonable for internal composition,
but it is not a guarantee against every platform's overlays or crop behavior.
The author must review the intended publication destination and adjust the
variant's guide or label positions when needed.

Portrait should prioritize one focal area and short labels; landscape can
retain broader context. Each variant must allow camera and annotation overrides
while preserving story duration, research values, and source identities.
An automatic center crop does not satisfy the two-format design requirement.

The editor must respect reduced-motion preferences for interface transitions
and avoid auto-playing the film on project open. Those preferences must not
silently rewrite the authored video's timing; **Play** remains an explicit
author action with an accessible pause control.

## Accessibility and responsive behavior

The interface should target WCAG 2.2 AA, with verification during implementation.
Normal text must meet at least 4.5:1 contrast and qualifying large text at least
3:1; visible focus must persist during keyboard navigation. These numerical
targets follow [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
and [focus guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html),
but they do not establish that an unbuilt application conforms.

The first interface must provide the following access paths.

- Keyboard focus must reach workspace tabs, feature selection, form controls,
  scene selection, save, playback, and export with a visible indicator.
- Every icon-only control must have an accessible name, and dialogs must move
  focus into the dialog and return it to the triggering control.
- Numeric alternatives must allow precise editing of camera position, label
  offset, and roadway width without requiring a drag; a later vertex editor
  must provide an equivalent coordinate input.
- Validation errors must identify the affected field and suggested correction,
  rather than rely on color or a disappearing toast.
- Save and job-state changes must have restrained screen-reader announcements;
  frame-by-frame timecode changes must not flood the announcement stream.
- Essential feature and research information must be available in an accessible
  list or inspector in addition to the map canvas.

At narrow widths or high browser zoom, panels must become selectable drawers
rather than obscure all canvas controls. The fixed-size video preview must
remain scaled consistently, and the inspector must permit vertical scrolling
without hiding its field labels or save status.

## Review evidence

The design gate must include screenshots of Explore, Research, and Animate;
portrait and landscape preview frames; and the roadway comparison when that
feature exists. Reviewers should inspect long place names, multiline credits,
missing assets, save failure, stale research, and an overallocated roadway.

The review must include a keyboard walkthrough of the core workflow and actual
contrast checks on the implemented theme. The render comparison must confirm
that author handles, selection outlines, panel shadows, and readiness messages
do not leak into final frames. The
[testing and gate plan](../planning/testing-and-gates.md) owns evidence commands
and acceptance records.
