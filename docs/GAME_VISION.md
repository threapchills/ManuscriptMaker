# Playable manuscript vision

Updated 2026-09-24 from the user's direct brief. This document is the shared product direction for Codex, Claude, Grok, and any other collaborator. Read with `AGENTS.md`, `TODO.md`, and `docs/HANDOVER.md`. The active conversation wins if it clarifies or changes this brief.

## What Manuscript Maker is becoming

Manuscript Maker combines an illuminated manuscript workshop, an approachable click-and-play construction tool, and a game about making a traversable scene. Its manuscripts can be **playable levels**. The user cited *Scriptorium: Master of Manuscripts* for manuscript making and old-school *Click and Play* for placing objects that do something. This is inspiration for the feel and workflow, not a request to copy either game's assets or exact rules.

The intended experience is simple enough for a newcomer to create and test a scene without programming. The phrase “click and play for the AI era” describes the ease and ambition of the tool. AI-assisted creation may become part of the workflow, but no specific AI feature, service, or dependency has been chosen yet.

## Core creation and play loop

1. A challenge presents a manuscript scene and a problem. The user arranges the pieces needed to make the level possible.
2. Items placed on the canvas have meaning beyond appearance. They may be characters, active objects, terrain/background objects, obstacles, walkable areas, platforms, or purely decorative elements.
3. The user enters Play and controls a character inside that same composed manuscript. The scene's physical and interactive behavior comes from the authored objects.
4. The user tests whether the level can be beaten, returns to creation to revise it, then plays through successfully.
5. A later challenge introduces a new problem. Examples the user gave: repair a broken bridge during creation and then walk across it; later solve a moat around a castle.

The construction puzzle is part of the game, not merely a level editor used before a separate game. A completed manuscript should remain an editable work of art as well as a playable scene. The workshop's book/map setup, page turning, layers, writing, original spelling, imports, exports, and full-project save/load continue to matter.

The user clarified that **challenge levels start with a fixed scene and a chosen set of pieces**. The free-form workshop can continue alongside this guided challenge experience. The user also clarified that **levels are separate from book pages**. Future level/progression data should be its own model; do not implement page-turning as level advancement. A level may use manuscript scene artwork, but a page index is not its identity or progress record. The current prototype plays the active page's scene only as a technical stepping stone.

## Experience principles

- **Creation should be immediate and legible.** Drag or click to place a piece; select it to see and change what it does. Avoid exposing programming concepts to ordinary users.
- **Play should be one obvious action away.** Return to Edit without losing the arrangement. Repeated testing should be fast.
- **The page is the world.** Artwork, physical objects, text, and manuscript framing should feel integrated; keep the warm dark workshop around parchment.
- **A scene must communicate its rules.** The editor should identify play roles and the play view should explain controls, goals, and missing setup in plain language. Mobile/touch controls matter.
- **Keep authoring data safe.** Play simulations must not move or alter saved artwork. Save/load, undo/redo, page duplication, and exports must preserve every page, source text, uploaded image, and play setting. Old project files remain valid.
- **Grow incrementally.** The user expects months of core-system work before a finished Level One. Do not describe the current prototype as a complete campaign or claim puzzle rules that are not implemented.

## Core object model and likely growth

For the first prototype, an illustration can be scenery, the controlled character, a solid obstacle, a one-way platform, or a goal. Existing untagged illustrations are scenery, so old manuscripts preserve their behavior. The visual layer carries the role in the saved project. A page is simulated from a read-only snapshot; play position and result are temporary.

The user's broader categories require more than these first roles. “Active objects” may eventually include switches, moving pieces, doors, bridges, hazards, collectible items, dialogue, and reactions. “Background objects” may be pass-through scenery, blocking terrain, walkable surfaces, or platforms. These are **future design areas**, not implemented mechanics. Interaction rules, conditions, reusable behaviors, and visual collision bounds should be designed before real challenge levels depend on them.

Current prototype architecture: `src/types.ts` declares an optional `gameRole` on image layers; `src/document.ts` validates it and provides a crossing playtest scene; `src/game.ts` is the pure movement/collision step; `src/PlayMode.tsx` renders and controls the read-only play view; `src/App.tsx` provides Play/Edit and role selection. Project version stays 2 because this is an optional compatible field; v1 migration and old v2 projects remain supported. Any later schema change must be versioned and migrated explicitly.

## Staged roadmap

1. **Movement foundation (in progress):** playable page preview; character movement, jump and gravity; solids, platforms, scenery and goal; restart; touch/keyboard controls; a small crossing playtest. Verify save/load and no edits during play.
2. **Construction puzzle foundation:** a challenge scene with missing or misplaced pieces; clear available-piece tray; build/play transitions; explicit success criteria in both construction and traversal; retry and reset without deleting user work. Broken bridge is a candidate, subject to user input.
3. **Interaction foundation:** reusable active-object behaviors, triggers and state changes; doors, switches, hazards, moving/placed objects as needed by a first real challenge. Keep rules understandable in the inspector.
4. **Level and progression model:** introduce levels as entities separate from book pages; define how a level references manuscript scene content, unlocks, completion, checkpoints, and distinction between authored projects and built-in challenges. Preserve compatibility with free-form manuscript making.
5. **Content and polish:** original modular medieval art, multiple usable characters/backgrounds, purposeful level composition, visual/audio feedback, accessibility, mobile usability, performance, and browser verification. Make Level One only when its creation puzzle and play solution are fully designed and reliable.

## Open product decisions for the user

- What kinds of “active” interactions should be first after walking and jumping? The bridge and moat examples establish the flavor, but not exact rules.
- What should completion require in construction: a valid physical path, placing named pieces in allowed areas, or another constraint? Should free-form player-authored scenes use the same rules as built-in challenges?
- How should a separate level reference or contain its manuscript scene, and which editing tools should be available during a guided challenge?

Do not silently settle these open points in a way that locks the product direction. Build compatible foundations and record assumptions in the handover.
