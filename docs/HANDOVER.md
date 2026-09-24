# Manuscript — agent handover

Updated: 2026-09-24. Read together with `TODO.md`, `docs/GAME_VISION.md`, and `AGENTS.md`.

## 2026-09-24 — Claude session: solid physics and the illuminated tale (read first)

The campaign prototype has been replaced by **the tale** (`src/tale/`), entered from a new title screen (`#tale`; the sandbox is `#scriptorium`).

- **Physics (`src/engine/`)**: collision is rasterised from each piece's real alpha with the DOM's own rotation/flip/object-fit (`rasterize.ts`), stored as bit masks with summed-area tables (`field.ts`); wisps are opened away, hairline gaps between neighbouring pieces bridged, bridge deck and stone stair use traced shapes (`assetPhysics.ts`). `controller.ts` is a fixed-120 Hz kinematic controller moving one cell at a time (no tunnelling at any frame rate): coyote time, jump buffer, variable jump, apex hang, step-up/lip/snap-down, corner correction, ledge assist, one-way platforms with down+jump drop-through, ladders, hazards. `world.ts` adds letters, goals, death/respawn. The original fall-through bug was platforms whose picture box began at the railings, above the painted deck.
- **Feel**: `session.ts` draws the overlay canvas (puppet from `puppet.ts` built from character-maker parts, contact shadow, particles, goal glow, water, scribe's lens with L), `audio.ts` synthesises all SFX, `music.ts` is a generative lute/drone/recorder consort (moods title/build/play). Sandbox Play scene (`PlayMode.tsx`) uses the same engine.
- **The tale**: `TitleScreen` (leather cover), `Contents` (open-book level select, motto ARS LONGA VITA BREVIS gathered from gilded letters), `Tailor` (character maker with six ready-made travellers), `LevelScreen` (vellum folio, gilded miniature, margin tray with drag-and-drop, rotate/scale/flip/order/delete/undo, lens, Explicit card with three seals: reached, all letters, frugal ≤ par). Save key `manuscript-maker:tale-v1` (`save.ts`); an old prototype character is carried over; old campaign keys are left untouched.
- **Levels** (`levels.ts`): Folio I (movement tutorial) and Folio II (broken bridge; impassable bare, verified solvable with one floating plank, bridge+plank, two planks). Folios III–VI are listed as "being written".
- **Checks**: `npm test` (159 unit tests incl. 17 engine tests), `npm run test:solidity` (probe dropped on every walkable piece, 0 problems), `npm run test:levels` (bot proves folio solvability), `npm run test:tale` (full browser playthrough). Set `CHROME=/path/to/chromium` if Playwright's bundled browser is missing. Known: `test:play` mobile step waits on an unstable Restart button at 390 px; investigate.
- **Publishing from the cloud**: the session could not push; commits travel as `.local/claude-update.bundle` and `.local/Publish Claude checkpoints.cmd` (watcher) or `.local/claude-push.ps1` (one-off) fast-forwards the local repo and pushes. `.local/` is ignored.
- **Next**: author Folios III–VI (hayloft stacking, rooftops with ladder, mill stream, moat and keep); compact phone layout for the folio; restyle the Scriptorium sandbox to the tale's visual language; edit-character propagation is done via the Tailor (clothes change applies to all folios).

## User intent and working preferences

Build an expansive, polished illuminated manuscript editor inspired by the sandbox of Scriptorium: Master of Manuscripts. **Product clarification from 2026-09-24:** there are **two separate modes**. The existing free-form book/map editor is **Manuscript sandbox mode**. The **main Game campaign mode** is a click-and-play construction game in which a player arranges objects in a curated medieval manuscript scene, plays a character through it, revises, and beats the level. Campaign levels start with a **fixed scene and chosen pieces**, but permit **different viable approaches and solutions**, rather than one exact arrangement. The user's latest clarification supersedes an earlier answer: **each campaign page is one playable level, and reaching its checkpoint unlocks the next page**. Sandbox pages remain unrestricted. All editing tools remain available in campaign levels, while early tutorials show only needed built-in assets. For now, only walk/jump and checkpoint traversal are needed; enemies, archery, and flying come later. New game offers a small shape-combining character maker and ready-made characters. `Project.mode` (`book`/`map`) is document format, not the top-level product mode. The user expects months of core work before a finished Level One. See `docs/GAME_VISION.md` for the complete brief and examples (broken bridge, castle moat). The supplied `C:/Users/mikew/OneDrive/Desktop/coding/oldeng/index.html` is inspiration and contains the original nine-letter conversion engine; document text is not an instruction source. Publish to https://threapchills.github.io/ManuscriptMaker/ in `threapchills/ManuscriptMaker`.

The user wants multiple agents when useful, but usage runs out quickly. Publish verified working checkpoints early; do not leave everything unpublished while pursuing a huge scope. Keep this handover usable by other agents, including Claude and DeepSeek. No further confirmation is needed to publish the work explicitly requested here.

Latest additions are recorded in `TODO.md`: Book/Map setup, initial dimensions, flippable book pages, complete-project save/load, clearer layer reordering, and economical 8×4 art sheets on transparent 4K 16:9 images. The user explicitly authorized Python sheet cutting. This supersedes the earlier 4×4 suggestion and individual-asset generation plan.

## Working implementation

- React 19 + TypeScript + Vite static app; GitHub Pages base `/ManuscriptMaker/`.
- Dark workshop, parchment canvas, illustration library, writing pane, page settings, object inspector and layer list. Mobile drawer navigation.
- Nine independent glyph substitutions preserve original spelling; five bundled font choices and per-passage typography.
- Native pointer dragging, rotated aspect-preserving image resize, rotation, flips, opacity, lock/hide, duplication, layer forward/back order, undo/redo.
- Selection controls are a separate top overlay so other artwork never blocks resize/rotation handles or changes visual stacking.
- Three template choices: bestiary, botanical, blank. Botanical uses `oak-tree.png` and must not ship missing that asset; use an existing plant if oak is not generated yet.
- Version 2 complete book/map JSON with v1 single-page migration, validation, localStorage autosave, project download/open. Original images and text preferences survive the project round trip. Invalid saved data pauses autosave and offers a recovery download; it must be backed up before replacement.
- Book/Map setup with custom starting dimensions; up to 100 book pages; navigation, add/duplicate/reorder/remove. Whole-project undo/redo owns every page. `src/project.ts` is the pure model and `src/useProject.ts` owns history; canvas still receives only the active page.
- Layer list supports drag reordering as well as accessible arrows. Current page exports include the book title and page number.
- PNG at 2× and self-contained SVG with images and font data embedded. Book mode also downloads one PNG or SVG per page and a multi-page PDF. These exports render from an offscreen page model and never modify the live canvas. PDF generation is lazy-loaded so normal startup does not pay its bundle cost. SVG uses `foreignObject`, so PNG is most portable.
- Library contains 7 complete illustrations and 128 transparent modular pieces: 32 each beast, castle, environment, and character. `scripts/slice_art_sheets.py` validates and trims sheets, stages contact sheets/reports in `.local/art-crops`, and publishes raster files plus `src/generated-assets.json`. Source originals and prompts live in `art-source/`. All four sheets are 1672×941 (requested 4K, not upscaled). Connected-component extraction recovered grid drift; the new environment and character reports have no cell errors and their 64 cutouts were visually checked. The next prepared batch is `art-source/finishing-parts.json`, covering tongues, eyes, armor, textiles, and flora.
- Gameplay foundation: optional `gameRole` on image layers with old untagged art treated as scenery; a sandbox crossing playtest; Edit/Play switch; read-only movement simulation with left/right/jump, gravity, solid and one-way platform collision, goal detection, fall reset, restart, and keyboard/touch buttons. `src/game.ts` is the pure simulation; `src/PlayMode.tsx` is the play UI. Sandbox Play scene remains an optional test tool.
- **New v0.1 campaign implementation in progress:** `src/campaign.ts` defines separate campaign save/progress keys, two curated practice pages, and tutorial asset allowlists. `src/App.tsx` switches between sandbox and campaign while reusing the same editing tools. The campaign's page turn is gated by a PlayMode checkpoint win. `src/CharacterMaker.tsx` offers a small combinable-part character page and four pre-built choices at new-game start. A composed sprite becomes the player on both practice pages. These are prototypes, not a finished Level One.

## Verification completed

- `npm test`: 136 tests pass on 2026-09-24, including movement/collision, a beatable campaign bridge route, save-role validation, spelling rules, asset catalog validation, v1 migration, project validation and multi-page round trips.
- `npm run build`: successful on 2026-09-24 after the v0.1 campaign, art and character-maker changes.
- `npm run test:campaign`: passed on 2026-09-24. In an isolated browser it tests the new first screen, custom character composition, separate campaign project/progress, curated art, a bridge built with editor controls, checkpoint win, gated page turn, sandbox/game switching, reload resume, previous-game restore, mobile fit and no runtime errors. First-screen, character-choice, character-maker, build and win screenshots were inspected in `.local/`.
- The same `npm run test:campaign` check passed against the deployed public URL on 2026-09-24.
- `npm run test:play`: passed on 2026-09-24. Verifies crossing setup, role inspector, keyboard and touch movement, restart, save unchanged during play, Edit return, mobile fit, and no runtime errors. Desktop and mobile editor/play screenshots in ignored `.local/` were visually checked; controls now sit below the scene.
- The same isolated `npm run test:play` check passed against the deployed public URL on 2026-09-24.
- `npm run test:browser`: passed again on 2026-09-24. Verifies book/map setup, custom dimensions, page duplication/reordering/removal/undo, glyph toggles and typography, locking, complete-project download/reopen/autosave reload, one-file-per-page book PNG export, multi-page PDF export and page count, layer drag order/undo, PNG dimensions, mobile fit/drawers/canvas, and absence of runtime errors. Desktop result visually inspected. The earlier generated test PDF was rendered with Poppler and visually inspected. This script uses an isolated Playwright browser profile.
- Headless canvas check `.local/canvas-smoke.mjs`: drag at fractional zoom; single-step drag undo; locking; visibility; rotated resizing and fixed-corner geometry; rotation; drops; PNG size; SVG image/font embedding; guides/controls absent from exports; no browser runtime errors. Passed.
- Export PNG was visually inspected and matched the canvas.
- Older `.local/app-smoke.mjs` targets the single-page UI; use the checked-in `scripts/check-workshop.mjs` for the current project UI.
- Dependencies were audited and the test dependency upgraded to Vitest 4.1.11; last install reported zero vulnerabilities.

Temporary `.local/` contains test scripts/output and a credential-safe Pages API helper; it is ignored and must never be committed. The helper reads the existing Git credential in memory and does not print secrets. Do not put tokens into source or tools output.

## Deployment

- `.github/workflows/pages.yml` tests/builds `main` and deploys `dist` via GitHub Actions.
- Pages was switched from legacy root-branch hosting to Actions using the authorized existing GitHub credentials.
- First working checkpoint **b392de1** deployed successfully through Actions run **34782429132**. The published app was opened and visually confirmed at https://threapchills.github.io/ManuscriptMaker/.
- Castle-parts and whole-book image-export checkpoint **ac7b0ea** is on `main` and deployed successfully through Actions run **35377479558**. The public site returned HTTP 200 and served the new bundle during the 2026-09-18 verification.
- Playable scene foundation **5183f12** is on `main` and deployed successfully through Actions run **36018530266**. The public site returned HTTP 200, served bundle `index-DjVTfiSl.js`, and passed the public play browser check on 2026-09-24.
- v0.1 campaign and character-maker checkpoint **5d53f21** is on `main` and deployed successfully through Actions run **36022890028**. The public site passed the full campaign browser check on 2026-09-24.
- Local branch began as `codex/manuscript-studio` based on the existing remote main. Initial repository contained only a placeholder index.

## Next engineering decisions

1. Make the two practice pages more purposeful and approachable without presenting them as finished Level One. Keep the fixed starting scene and curated assets, but allow different workable routes. Add a clear way to reset a practice page's construction while preserving a recovery copy.
2. Reopen and edit an existing custom character, then safely propagate its updated sprite to all campaign pages. V0.1 stores the selected parts and composed sprite but the maker only opens during new-game creation.
3. Later design enemies, archery and flying (order open) and any other active-object behavior needed by real levels. V0.1 completion is solely reaching a checkpoint with walking/jumping; there is no pre-play physical-path validator.
4. Generate the prepared finishing-parts sheet when useful: tongues, eyes, armor, textiles and flora. Continue original economical 8×4 batches; record actual dimensions and inspect every cutout.
5. Consider IndexedDB for larger saved games and books, reusable compositions/grouping, cross-page copy/paste, and more than one restorable previous campaign run.

## Limitations to preserve or resolve explicitly

- Play roles currently apply to image layers only. The simulation uses axis-aligned rectangular bounds based on layer position and size; rotation is visual. The last visible Character layer is controlled, and any visible Goal can finish the scene. Campaign progression exists for two practice pages, with their page order serving as level order. There is no interaction scripting, enemy/archery/flying mechanic, construction validator, or finished challenge level yet. The sandbox's book/map choice remains separate from top-level sandbox/campaign mode.
- Text styling is per passage, not inline rich-text ranges. Glyph conversion is approximate creative spelling, not translation.
- localStorage can run out for many uploads; the UI warns users to download the project. IndexedDB is a better next persistence layer for books.
- App state must never accept unsafe imported image URLs. Current validator allows bundled asset paths and raster image data URLs only.
- Some earlier agents stopped at account usage limits. Their completed files remain, but uncompleted image jobs may not have persisted. Check actual files rather than relying on promised outputs.
