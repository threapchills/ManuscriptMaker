# Playable manuscript vision

Updated 2026-09-24 from the user's direct brief. This document is the shared product direction for Codex, Claude, Grok, and any other collaborator. Read with `AGENTS.md`, `TODO.md`, and `docs/HANDOVER.md`. The active conversation wins if it clarifies or changes this brief.

## What Manuscript Maker is becoming

Manuscript Maker has **two separate experiences**: a free-form **Manuscript sandbox mode** and a **main Game campaign mode**. The sandbox is the illuminated manuscript workshop for books, maps, artwork, and writing. The campaign is an approachable click-and-play construction game with curated medieval manuscript scenes. They share artwork, editing tools, and play technology, but have separate saved projects and progression. **In the campaign, each manuscript page is one playable level; reaching its checkpoint unlocks the next page.** Sandbox pages have no such gate. The user cited *Scriptorium: Master of Manuscripts* for manuscript making and old-school *Click and Play* for placing objects that do something. This is inspiration for the feel and workflow, not a request to copy either game's assets or exact rules.

The intended experience is simple enough for a newcomer to create and test a scene without programming. The phrase “click and play for the AI era” describes the ease and ambition of the tool. AI-assisted creation may become part of the workflow, but no specific AI feature, service, or dependency has been chosen yet.

## Product modes and the boundary between them

- **Manuscript sandbox:** Free creation of books and maps with the existing page, layer, writing, save/load, and export tools. It remains available as its own mode. Campaign objectives, restricted piece sets, unlocks, and success checks must not be imposed on sandbox projects. The current editor's **Play scene** button is an experimental shared-system preview inside the sandbox; it does not turn sandbox pages into campaign levels.
- **Game campaign:** The main game experience. Each **page is a level** with a fixed starting scene, a chosen set of pieces, a checkpoint to reach, and an open-ended construction problem. The player has meaningful freedom in how to arrange or use pieces; a level may have several workable solutions. They play through their authored page, reach the checkpoint, and then turn to the next page. Early tutorial pages show only the assets needed for their lesson, but **all editing tools remain available on every level**.
- **Separate data and progress:** Campaign pages, asset availability, completion and unlocks belong to the game save, separate from the sandbox's book/map project. `Project.mode` (`book` or `map`) remains the document format; top-level sandbox versus campaign is a separate choice. Preserve old project files.

## Core creation and play loop

1. A curated campaign level presents a fixed manuscript scene, a problem, and a chosen set of pieces. The user arranges or uses those pieces to make the level possible; more than one solution may work.
2. Items placed on the canvas have meaning beyond appearance. They may be characters, active objects, terrain/background objects, obstacles, walkable areas, platforms, or purely decorative elements.
3. The user enters Play and controls a character inside that same composed manuscript. The scene's physical and interactive behavior comes from the authored objects.
4. The user tests whether the level can be beaten, returns to creation to revise it, then plays through successfully.
5. A later challenge introduces a new problem. Examples the user gave: repair a broken bridge during creation and then walk across it; later solve a moat around a castle.

The construction puzzle is part of the campaign game, not merely a level editor used before a separate game. The Manuscript sandbox remains its own free-form experience. The workshop's book/map setup, page turning, layers, writing, original spelling, imports, exports, and full-project save/load continue to matter there.

The latest clarification supersedes the earlier idea that levels and pages were separate: **campaign page = playable level; checkpoint completion unlocks the next page**. This does not change the free sandbox book. Challenges still start with a fixed scene and selected pieces, with several possible solutions rather than one exact placement. For v0.1, the success condition is simply reaching the checkpoint with walking and jumping; no separate pre-play construction validation is required. Enemies, archery, and flying come later.

## Experience principles

- **Creation should be immediate and legible.** Drag or click to place a piece; select it to see and change what it does. Avoid exposing programming concepts to ordinary users.
- **Curated problems, flexible solutions.** The campaign sets the situation, available pieces, and objective. Allow different valid arrangements and approaches when they solve the problem and the resulting scene can be played successfully. Avoid brittle checks for a single expected layout.
- **Play should be one obvious action away.** Return to Edit without losing the arrangement. Repeated testing should be fast.
- **The manuscript scene is the world.** Artwork, physical objects, text, and manuscript framing should feel integrated; keep the warm dark workshop around parchment. Campaign page order is its level order; sandbox page order remains free-form.
- **A scene must communicate its rules.** The editor should identify play roles and the play view should explain controls, goals, and missing setup in plain language. Mobile/touch controls matter.
- **Keep authoring data safe.** Play simulations must not move or alter saved artwork. Save/load, undo/redo, page duplication, and exports must preserve every page, source text, uploaded image, and play setting. Old project files remain valid.
- **Grow incrementally.** The user expects months of core-system work before a finished Level One. Do not describe the current prototype as a complete campaign or claim puzzle rules that are not implemented.

## Core object model and likely growth

For the first prototype, an illustration can be scenery, the controlled character, a solid obstacle, a one-way platform, or a goal/checkpoint. Existing untagged illustrations are scenery, so old manuscripts preserve their behavior. The visual layer carries the role in the saved project. A page is simulated from a read-only snapshot; play position and result are temporary. Reaching the goal in campaign play unlocks the next campaign page.

## Character creation at new game start

Starting a new campaign game offers **Make new character**. It opens a small page where the player chooses and combines modular shapes for a head, body, arms, legs, and optional extra, then adjusts their positions. The resulting character is the controlled player on playable pages. Pre-built characters are also offered so players can begin immediately. The editable choice of parts should be retained for later character editing; v0.1 saves that design along with a composed sprite, but reopening the maker to edit an existing character is still future work. The art must be original. Prefer economical transparent 8×4 sheets of 32 elements when generating assets; record prompt, source, actual dimensions, slicing report, and visually review cutouts.

The user's broader categories require more than these first roles. “Active objects” may eventually include switches, moving pieces, doors, bridges, hazards, collectible items, dialogue, and reactions. “Background objects” may be pass-through scenery, blocking terrain, walkable surfaces, or platforms. These are **future design areas**, not implemented mechanics. Interaction rules, conditions, reusable behaviors, and visual collision bounds should be designed before real challenge levels depend on them.

Current prototype architecture: `src/types.ts` declares an optional `gameRole` on image layers; `src/document.ts` validates it and provides a sandbox crossing playtest; `src/game.ts` is the pure movement/collision step; `src/PlayMode.tsx` renders the read-only play view and reports checkpoint wins; `src/campaign.ts` provides two curated practice pages, separate save/progress keys, and asset lists; `src/CharacterMaker.tsx` composes modular character art; `src/App.tsx` switches modes while reusing editing tools. Project version stays 2 because new layer fields are optional; v1 migration and old v2 projects remain supported. Any later schema change must be versioned and migrated explicitly.

## Staged roadmap

1. **v0.1 movement and modes:** keep the Manuscript sandbox; add the separate Game campaign save; playable campaign pages, walking, jumping, gravity, solid/platform/scenery/goal roles, restart, keyboard/touch controls, checkpoint-gated page turning, and two short practice pages. The practice pages are prototypes, not finished Level One.
2. **Character maker:** combine original modular shapes on a small page at new game start, or choose a pre-built traveller. Preserve the design for later editing.
3. **Construction puzzle foundation:** fixed scene and curated asset tray per page, especially in tutorials, while keeping every editing tool. Build/play/revise; success by actually reaching the checkpoint, allowing different routes. Later improve the broken-bridge challenge design and reset/retry UX without deleting work.
4. **Interaction foundation:** after movement works well, add enemies, archery and flying as user-requested future mechanics; design other reusable active-object behavior when needed for actual levels. Keep rules understandable in the inspector.
5. **Content and polish:** more original medieval art and playable characters/backgrounds, purposeful page composition, visual/audio feedback, accessibility, mobile usability, performance, and browser verification. Make finished Level One only when its creation puzzle and play solution are fully designed and reliable.

## Open product decisions for the user

- What outcomes beyond reaching the checkpoint should matter when later mechanics arrive? For v0.1, traversal alone is enough.
- Which mechanics should follow movement first among enemies, archery, and flying? Their exact order is not yet set.
- Should campaign scenes be copyable into the Manuscript sandbox for unrestricted creation? This has not been specified; do not assume conversion or shared saves.

Do not silently settle these open points in a way that locks the product direction. Build compatible foundations and record assumptions in the handover.
