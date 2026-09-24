# Playable manuscript vision

Updated 2026-09-24 from the user's direct brief. This document is the shared product direction for Codex, Claude, Grok, and any other collaborator. Read with `AGENTS.md`, `TODO.md`, and `docs/HANDOVER.md`. The active conversation wins if it clarifies or changes this brief.

## What Manuscript Maker is becoming

Manuscript Maker has **two separate experiences**: a free-form **Manuscript sandbox mode** and a **main Game campaign mode**. The sandbox is the illuminated manuscript workshop for books, maps, artwork, and writing. The campaign is an approachable click-and-play construction game with curated medieval manuscript scenes. They can share artwork, editing tools, and play technology without sharing progression rules or treating every sandbox page as a campaign level. The user cited *Scriptorium: Master of Manuscripts* for manuscript making and old-school *Click and Play* for placing objects that do something. This is inspiration for the feel and workflow, not a request to copy either game's assets or exact rules.

The intended experience is simple enough for a newcomer to create and test a scene without programming. The phrase “click and play for the AI era” describes the ease and ambition of the tool. AI-assisted creation may become part of the workflow, but no specific AI feature, service, or dependency has been chosen yet.

## Product modes and the boundary between them

- **Manuscript sandbox:** Free creation of books and maps with the existing page, layer, writing, save/load, and export tools. It remains available as its own mode. Campaign objectives, restricted piece sets, unlocks, and success checks must not be imposed on sandbox projects. The current editor's **Play scene** button is an experimental shared-system preview inside the sandbox; it does not turn sandbox pages into campaign levels.
- **Game campaign:** The main game experience. Each level is deliberately authored with a fixed starting scene, a selected set of pieces, and a problem to solve. The player has meaningful freedom in how to arrange or use those pieces. A level may have several workable solutions; its completion rules should assess whether the objective is achieved, rather than require one exact piece arrangement or coordinate pattern. The player then plays through the resulting scene.
- **Separate data and progress:** Campaign level identity, available pieces, constraints, attempts, completion, and unlocks are separate from the sandbox's book/map document and page order. The existing `Project.mode` value (`book` or `map`) describes sandbox document format; it is **not** the future top-level product mode. Preserve old project files when adding the campaign model.

## Core creation and play loop

1. A curated campaign level presents a fixed manuscript scene, a problem, and a chosen set of pieces. The user arranges or uses those pieces to make the level possible; more than one solution may work.
2. Items placed on the canvas have meaning beyond appearance. They may be characters, active objects, terrain/background objects, obstacles, walkable areas, platforms, or purely decorative elements.
3. The user enters Play and controls a character inside that same composed manuscript. The scene's physical and interactive behavior comes from the authored objects.
4. The user tests whether the level can be beaten, returns to creation to revise it, then plays through successfully.
5. A later challenge introduces a new problem. Examples the user gave: repair a broken bridge during creation and then walk across it; later solve a moat around a castle.

The construction puzzle is part of the campaign game, not merely a level editor used before a separate game. The Manuscript sandbox remains its own free-form experience. The workshop's book/map setup, page turning, layers, writing, original spelling, imports, exports, and full-project save/load continue to matter there.

The user clarified that **challenge levels start with a fixed scene and a chosen set of pieces**, yet allow flexible problem solving instead of one prescribed solution. The user also clarified that **levels are separate from book pages**. Future level/progression data should be its own model; do not implement page-turning as level advancement. A level may use manuscript scene artwork, but a page index is not its identity or progress record. The current prototype plays the active sandbox page's scene only as a technical stepping stone.

## Experience principles

- **Creation should be immediate and legible.** Drag or click to place a piece; select it to see and change what it does. Avoid exposing programming concepts to ordinary users.
- **Curated problems, flexible solutions.** The campaign sets the situation, available pieces, and objective. Allow different valid arrangements and approaches when they solve the problem and the resulting scene can be played successfully. Avoid brittle checks for a single expected layout.
- **Play should be one obvious action away.** Return to Edit without losing the arrangement. Repeated testing should be fast.
- **The manuscript scene is the world.** Artwork, physical objects, text, and manuscript framing should feel integrated; keep the warm dark workshop around parchment. A campaign scene need not be identified by a sandbox page.
- **A scene must communicate its rules.** The editor should identify play roles and the play view should explain controls, goals, and missing setup in plain language. Mobile/touch controls matter.
- **Keep authoring data safe.** Play simulations must not move or alter saved artwork. Save/load, undo/redo, page duplication, and exports must preserve every page, source text, uploaded image, and play setting. Old project files remain valid.
- **Grow incrementally.** The user expects months of core-system work before a finished Level One. Do not describe the current prototype as a complete campaign or claim puzzle rules that are not implemented.

## Core object model and likely growth

For the first prototype, an illustration can be scenery, the controlled character, a solid obstacle, a one-way platform, or a goal. Existing untagged illustrations are scenery, so old manuscripts preserve their behavior. The visual layer carries the role in the saved project. A page is simulated from a read-only snapshot; play position and result are temporary.

The user's broader categories require more than these first roles. “Active objects” may eventually include switches, moving pieces, doors, bridges, hazards, collectible items, dialogue, and reactions. “Background objects” may be pass-through scenery, blocking terrain, walkable surfaces, or platforms. These are **future design areas**, not implemented mechanics. Interaction rules, conditions, reusable behaviors, and visual collision bounds should be designed before real challenge levels depend on them.

Current prototype architecture: `src/types.ts` declares an optional `gameRole` on image layers; `src/document.ts` validates it and provides a crossing playtest scene; `src/game.ts` is the pure movement/collision step; `src/PlayMode.tsx` renders and controls the read-only play view; `src/App.tsx` provides Play/Edit and role selection. Project version stays 2 because this is an optional compatible field; v1 migration and old v2 projects remain supported. Any later schema change must be versioned and migrated explicitly.

## Staged roadmap

1. **Movement foundation (in progress):** playable page preview; character movement, jump and gravity; solids, platforms, scenery and goal; restart; touch/keyboard controls; a small crossing playtest. Verify save/load and no edits during play.
2. **Mode and challenge foundation:** a clear entry to the existing Manuscript sandbox and the future Game campaign; a separate campaign level model that holds fixed starting scenes, selected pieces, objectives, attempts, and progress without converting sandbox pages or files.
3. **Construction puzzle foundation:** a campaign scene with missing or misplaced pieces; clear available-piece tray; build/play transitions; outcome-based success criteria that allow multiple viable constructions; retry and reset without deleting user work. Broken bridge is a candidate, subject to user input.
4. **Interaction foundation:** reusable active-object behaviors, triggers and state changes; doors, switches, hazards, moving/placed objects as needed by a first real challenge. Keep rules understandable in the inspector.
5. **Campaign progression:** unlocks, completion, checkpoints, and a clear return to the separate sandbox, with no page-index coupling.
6. **Content and polish:** original modular medieval art, multiple usable characters/backgrounds, purposeful level composition, visual/audio feedback, accessibility, mobile usability, performance, and browser verification. Make Level One only when its creation puzzle and play solution are fully designed and reliable.

## Open product decisions for the user

- Which outcomes and constraints should count as a valid campaign solution beyond traversal, while still allowing multiple approaches?
- How should a separate level reference or contain its manuscript scene, and which editing tools should be available during a guided challenge?
- Should campaign scenes be copyable into the Manuscript sandbox for unrestricted creation? This has not been specified; do not assume conversion or shared saves.

Do not silently settle these open points in a way that locks the product direction. Build compatible foundations and record assumptions in the handover.
