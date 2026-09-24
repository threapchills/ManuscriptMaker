# Manuscript project ToDos

Last updated: 2026-09-24. This file records the user's requested direction, including messages sent during implementation. `docs/GAME_VISION.md` is the full playable-manuscript brief; `docs/HANDOVER.md` records the concrete implementation state.

## 2026-09-24 Claude session (see HANDOVER)

- [x] Solid pixel-true physics; fall-through through bridge railings fixed; solidity sweep and engine tests.
- [x] Bespoke illuminated game shell: title cover, contents spread, tailor, folio level screen, Explicit seals, page turns, music and SFX.
- [x] Folio I and Folio II playable and verified by automated playthrough.
- [ ] Folios III–VI; compact phone folio layout; Scriptorium restyle; fix `test:play` mobile Restart wait.

## Playable manuscript direction — new top product priority

The product has two separate experiences: **Manuscript sandbox mode** for free book/map creation, and the **main Game campaign mode**. A campaign player builds a traversable scene and then plays it. Placed objects can be characters, active objects, obstacles, walkable terrain, platforms, or decoration. Curated challenges start with a **fixed scene and a chosen set of pieces**, but allow **multiple workable solutions and meaningful freedom** instead of one exact arrangement. **In the campaign, each page is a playable level; reaching its checkpoint unlocks the next page.** Sandbox pages remain free-form. Every level has all editing tools; early tutorials restrict the built-in asset tray. For v0.1, walking, jumping and checkpoint traversal are enough; enemies, archery and flying are later. The user's examples are repairing a broken bridge in creation before crossing it in play, then later solving a moat around a castle. A finished Level One is months away; build and verify foundations first.

- [x] Preserve old projects while adding optional saved play roles to illustration layers: scenery, character, solid, one-way platform, goal.
- [x] Add a read-only Play scene loop with walking, jumping, gravity, collision, fall restart, goal detection, keyboard and touch buttons.
- [x] Add a small playable crossing **prototype** using existing original medieval art; do not present it as Level One or a solved campaign puzzle.
- [x] Expose play roles in the selected illustration's inspector and provide one-click Edit/Play switching.
- [x] Add a clear switch between Manuscript sandbox and Game campaign, with separate local saves. Keep sandbox books/maps, saves, exports, and unrestricted editing independent of campaign objectives and unlocks.
- [ ] Make play roles obvious directly on the canvas/layer list and offer a guided first-use explanation without adding programming language to the UI.
- [x] Add two **practice** campaign pages with fixed starting scenes, chosen asset trays, and checkpoint-gated page turning. Each campaign page is one level; these are prototypes, not a finished Level One. Keep `Project.mode` as document format and store campaign projects separately.
- [x] Make the v0.1 construction loop possible: place/move chosen pieces, playtest, revise, and unlock by reaching a checkpoint. No one-position solution check.
- [ ] Improve campaign page content and interaction design, add explicit reset/retry of scene construction, and test several solutions. Develop the bridge challenge into a deliberate finished level; moat can follow later.
- [ ] Define reusable active-object behaviors (doors, switches, moving pieces, hazards or other needs), richer collision bounds, and clear editor controls for them.
- [x] Add 32 original scene objects and 32 original modular character parts from two reviewed 8×4 sheets. Offer new-game character construction plus four pre-built characters; use the selected sprite as the player on campaign pages.
- [ ] Allow reopening and editing an existing custom character, propagating changes safely to campaign pages.
- [ ] Add progression, reset/retry, accessibility, touch usability and performance checks before calling any guided level complete.
- [ ] Later design enemies, archery, and flying and ask which order matters most. For now completion is checkpoint traversal with walking/jumping; no extra construction constraint.

## Release checkpoint — highest priority

- [x] Build a usable illuminated manuscript workshop in the supplied GitHub repository.
- [x] Independently toggle all nine old-letter substitutions from the user's reference.
- [x] Drag, resize, rotate, flip, hide, lock, duplicate, and reorder layers with undo/redo.
- [x] Save/load editable single-page projects and autosave the current manuscript locally.
- [x] Export PNG/SVG with artwork and fonts included.
- [x] Publish the latest verified working version to GitHub Pages and verify the live app (first checkpoint b392de1).
- [x] Publish and verify the playable v0.1 campaign, character maker, and original scene/character art checkpoint `5d53f21` on GitHub Pages (Actions run `36022890028`).

## Project foundations — user priority

- [x] Begin with a **Book / Map** choice and editable canvas dimensions.
- [x] Book mode: multiple flippable pages, page navigation, add/duplicate/reorder/remove pages.
- [x] Save/load the complete book or map, preserving layers and original text on every page.
- [x] Make layer order immediately understandable; add drag reordering alongside accessible forward/back controls.
- [x] Preserve old single-page files through schema migration. Avoid coupling content to the selected page.
- [x] Export the selected page as PNG/SVG, named with the book title and page number.
- [x] Export the entire book as a per-page PNG/SVG image set.
- [x] Export the entire book as a multi-page PDF.

## Efficient modular art library — latest user brief

- [x] Generate and publish two more original **8 × 4** transparent sheets (scene objects and character parts); request 16:9 4K, record actual 1672×941 tool output without upscaling.
- [ ] Request the user's preferred “images2.5” generator only if the available tool exposes that model. Current built-in imagegen schema has no model selector; do not claim otherwise.
- [ ] Use modular categories inspired by the game's organization: **beast body parts, armor, textiles, castle elements, flora, household goods, icons/symbols**, plus demons, towns, tunnels, and animals as needed.
- [x] Build a reproducible Python slicer using manifest row/column ordering; preserve alpha, trim empty margins, pad cutouts, validate every cell, and publish catalog entries automatically.
- [x] Check both new sheets for empty, opaque, clipped, or misassigned cutouts; recover generator grid drift with connected-component slicing and visually inspect both contact sheets.
- [x] Keep original sheets, exact prompts, row-major labels, and generated-file provenance. Do not burn calls making one small item at a time.
- [ ] Expand to hundreds of composable elements without making the UI slow; lazy thumbnails, searchable categories, favorites, stable IDs.
- [x] Existing complete illustrations remain available as starter art; modular parts are the main expansion strategy.

Current library: 128 transparent modular pieces (32 each beast, castle, environment, character) plus 7 complete illustrations. All four sheets returned at 1672×941, below requested 4K, and were not upscaled. The new environment and character cutouts passed slicer validation and visual contact-sheet inspection. The next prepared sheet is `finishing-parts.json`, with tongues, eyes, armor, textiles and flora. Latest user clarification: small walls, windows, wings, tongues and similar components are the priority, with some complete subjects retained.

## Text and composition growth

- [ ] Inline rich text / selected-range formatting beyond the current per-passage styles.
- [ ] Multiple selection, grouping, snapping/alignment, and reusable compositions.
- [ ] Cross-page copy/paste and reusable text styles.
- [ ] Accessible dialogs, keyboard selection/reordering, touch behavior, and responsive tests as features grow.
- [ ] Consider IndexedDB for larger books and image-heavy projects; localStorage currently limits autosave size.

## Collaboration and handover

- [x] Add shared agent guidance and architecture/handover documentation for Astra, Claude, DeepSeek, and other coding agents.
- [x] Record the user's new scope and art-generation cost constraints.
- [x] Keep verification, deployment commit, known limitations, and next steps current after each checkpoint.

The user explicitly asked to get the current working version live ASAP before usage runs out, then get as far as practical. This is an evolving project, not a claim of parity with a commercial game's full library.
