# Manuscript project ToDos

Last updated: 2026-09-24. This file records the user's requested direction, including messages sent during implementation. `docs/GAME_VISION.md` is the full playable-manuscript brief; `docs/HANDOVER.md` records the concrete implementation state.

## Playable manuscript direction — new top product priority

The workshop is also a simple, welcoming, medieval manuscript click-and-play game. A player builds a traversable scene and then plays it. Placed objects can be characters, active objects, obstacles, walkable terrain, platforms, or decoration. Guided challenges start with a **fixed scene and a chosen set of pieces** (user clarification, 2026-09-24). **Levels are separate from book pages**; page turning must not be used as campaign progression (user clarification, 2026-09-24). The user's examples are repairing a broken bridge in creation before crossing it in play, then later solving a moat around a castle. A finished Level One is months away; build and verify foundations first.

- [x] Preserve old projects while adding optional saved play roles to illustration layers: scenery, character, solid, one-way platform, goal.
- [x] Add a read-only Play scene loop with walking, jumping, gravity, collision, fall restart, goal detection, keyboard and touch buttons.
- [x] Add a small playable crossing **prototype** using existing original medieval art; do not present it as Level One or a solved campaign puzzle.
- [x] Expose play roles in the selected illustration's inspector and provide one-click Edit/Play switching.
- [ ] Make play roles obvious directly on the canvas/layer list and offer a guided first-use explanation without adding programming language to the UI.
- [ ] Build a separate level/challenge model with authored fixed scenes, a chosen piece tray, construction rules, validation, and completion state. Do not equate a level with a page.
- [ ] Implement the construction puzzle loop: place or move a selected piece to make a route, playtest, revise, and complete. Begin with a deliberately designed bridge challenge; a moat can follow later.
- [ ] Define reusable active-object behaviors (doors, switches, moving pieces, hazards or other needs), richer collision bounds, and clear editor controls for them.
- [ ] Expand characters and background/terrain art for playable scenes, using the economical original-art pipeline below.
- [ ] Add progression, reset/retry, accessibility, touch usability and performance checks before calling any guided level complete.
- [ ] Ask the user which interactions should come first after movement, and what counts as a valid construction solution. See open decisions in `docs/GAME_VISION.md`.

## Release checkpoint — highest priority

- [x] Build a usable illuminated manuscript workshop in the supplied GitHub repository.
- [x] Independently toggle all nine old-letter substitutions from the user's reference.
- [x] Drag, resize, rotate, flip, hide, lock, duplicate, and reorder layers with undo/redo.
- [x] Save/load editable single-page projects and autosave the current manuscript locally.
- [x] Export PNG/SVG with artwork and fonts included.
- [x] Publish the latest verified working version to GitHub Pages and verify the live app (first checkpoint b392de1).

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

- [ ] Generate **8 × 4** sheets (32 elements), **16:9, 4K**, with an invisible standardized grid and genuine transparent background.
- [ ] Request the user's preferred “images2.5” generator only if the available tool exposes that model. Current built-in imagegen schema has no model selector; do not claim otherwise.
- [ ] Use modular categories inspired by the game's organization: **beast body parts, armor, textiles, castle elements, flora, household goods, icons/symbols**, plus demons, towns, tunnels, and animals as needed.
- [x] Build a reproducible Python slicer using manifest row/column ordering; preserve alpha, trim empty margins, pad cutouts, validate every cell, and publish catalog entries automatically.
- [ ] Check for empty cells, opaque fake transparency, cross-cell art, duplicate or missing pieces, and clipping. Regenerate only failed sheets/cells where practical.
- [x] Keep original sheets, exact prompts, row-major labels, and generated-file provenance. Do not burn calls making one small item at a time.
- [ ] Expand to hundreds of composable elements without making the UI slow; lazy thumbnails, searchable categories, favorites, stable IDs.
- [x] Existing complete illustrations remain available as starter art; modular parts are the main expansion strategy.

Current library: 64 transparent modular parts (32 beast and 32 castle) plus 7 complete illustrations. Both sheets were returned at 1672×941, below the requested 4K, and were not upscaled. The slicer reports no empty, opaque, cross-cell or clipped cells for the current sheets, and all 64 labels and silhouettes were visually checked. The next prepared sheet is `finishing-parts.json`, with tongues, eyes, armor, textiles and flora. Latest user clarification: small walls, windows, wings, tongues and similar components are the priority, with some complete subjects retained.

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
