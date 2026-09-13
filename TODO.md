# Manuscript project ToDos

Last updated: 2026-09-13. This file records the user's requested direction, including messages sent during implementation. `docs/HANDOVER.md` records the concrete implementation state.

## Release checkpoint — highest priority

- [x] Build a usable illuminated manuscript workshop in the supplied GitHub repository.
- [x] Independently toggle all nine old-letter substitutions from the user's reference.
- [x] Drag, resize, rotate, flip, hide, lock, duplicate, and reorder layers with undo/redo.
- [x] Save/load editable single-page projects and autosave the current manuscript locally.
- [x] Export PNG/SVG with artwork and fonts included.
- [ ] Publish the latest verified working version to GitHub Pages and verify the live app.

## Project foundations — user priority

- [ ] Begin with a **Book / Map** choice and editable canvas dimensions.
- [ ] Book mode: multiple flippable pages, page navigation, add/duplicate/reorder/remove pages.
- [ ] Save/load the complete book or map, preserving layers and original text on every page.
- [ ] Make layer order immediately understandable; add drag reordering alongside accessible forward/back controls.
- [ ] Preserve old single-page files through schema migration. Avoid coupling content to the selected page.
- [ ] Export a chosen page and, later, the entire book (image set / PDF).

## Efficient modular art library — latest user brief

- [ ] Generate **8 × 4** sheets (32 elements), **16:9, 4K**, with an invisible standardized grid and genuine transparent background.
- [ ] Request the user's preferred “images2.5” generator only if the available tool exposes that model. Current built-in imagegen schema has no model selector; do not claim otherwise.
- [ ] Use modular categories inspired by the game's organization: **beast body parts, armor, textiles, castle elements, flora, household goods, icons/symbols**, plus demons, towns, tunnels, and animals as needed.
- [ ] Build a reproducible Python slicer using manifest row/column ordering; preserve alpha, trim empty margins, pad cutouts, validate every cell, and publish catalog entries automatically.
- [ ] Check for empty cells, opaque fake transparency, cross-cell art, duplicate or missing pieces, and clipping. Regenerate only failed sheets/cells where practical.
- [ ] Keep original sheets, exact prompts, row-major labels, and generated-file provenance. Do not burn calls making one small item at a time.
- [ ] Expand to hundreds of composable elements without making the UI slow; lazy thumbnails, searchable categories, favorites, stable IDs.
- [ ] Existing complete illustrations remain available as starter art; modular parts are the main expansion strategy.

## Text and composition growth

- [ ] Inline rich text / selected-range formatting beyond the current per-passage styles.
- [ ] Multiple selection, grouping, snapping/alignment, and reusable compositions.
- [ ] Cross-page copy/paste and reusable text styles.
- [ ] Accessible dialogs, keyboard selection/reordering, touch behavior, and responsive tests as features grow.
- [ ] Consider IndexedDB for larger books and image-heavy projects; localStorage currently limits autosave size.

## Collaboration and handover

- [x] Add shared agent guidance and architecture/handover documentation for Astra, Claude, DeepSeek, and other coding agents.
- [x] Record the user's new scope and art-generation cost constraints.
- [ ] Keep verification, deployment commit, known limitations, and next steps current after each checkpoint.

The user explicitly asked to get the current working version live ASAP before usage runs out, then get as far as practical. This is an evolving project, not a claim of parity with a commercial game's full library.
