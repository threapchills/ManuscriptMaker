# Manuscript

Manuscript Maker is an illuminated manuscript you build and then walk. It has three rooms: **the tale**, a short campaign of playable folios; **the scriptorium**, where you make and play folios of your own; and **the old illuminator's desk**, the original free-form book and map editor.

**[Open the book](https://threapchills.github.io/ManuscriptMaker/)**

## Walk the tale

Choose **Begin the tale** on the cover. Dress a traveller at the tailor's (or take a ready-made one), then open the contents of *Liber primus: The Hare's Road*; turn the dog-eared corner of the page for *Liber secundus: The Greenwood*, and again for *Liber tertius: The Narrow Way*. Each folio is a level: a fixed miniature, a few pieces in the margin, three gilded letters and a goal. Drag pieces into the picture, stretch and turn them, press **Play**, and walk what you have made. Reaching the goal unlocks the next folio, and most folios can be solved more than one way.

| Folio | What it asks of you |
| --- | --- |
| I · Here Beginneth the Road | walking and leaping |
| II · The Broken Bridge | mending a broken bridge over a stream |
| III · The Hayloft | heaping crates and bales into steps up to a hay door |
| IV · Over the Rooftops | climbing a town wall by ladder, crossing the roofs, bridging a canal |
| V · The Mill Stream | sharing one plank and two stepping stones between two channels |
| VI · The Moat and the Keep | finding your own way over the moat and into the keep |
| VII · The Barred Gate | the second book's first folio: an arrow in the timber as a step over the gate |
| VIII · The High Bank | two arrows in an earthen bank, planned from across the stream |
| IX · The Watchtower | stone turns arrows: a crate from the margin, and an arrow in the timber above it |
| X · The Bell in the Oak | ring the bell with an arrow, and the gatekeeper winds up his portcullis |
| XI · The Drawbridge | strike the butt to let the drawbridge down, and find what the raised bridge was hiding |
| XII · The Grey Wolf | an evil wolf keeps the road to the abbey: climb the palisade and bring him down with an arrow |
| XIII · The Stone Keep | the third book's first folio: a keep all of stone, and the margin's crate the only timber; hung high against the keep, it takes the one arrow that begins the climb |
| XIV · The Belfry | the porter's bell hangs deep in a louvre behind a stone parapet: build a stair of two crates to the louvre's own height, and ring it with one level shot |
| XV · The Hanging Stone | one arrow and a wolf: cut the rope while he walks beneath the stone it holds, and the stone that crushes him is the first step up to the hermit's door |

Each folio presses up to three seals: the road walked, every gilded letter gathered, and a frugal scribe (no more pieces and arrows than the folio's par). Across each book the letters spell its motto.

**Controls:** ← → or A/D walk · Space leaps (hold it to leap higher) · ↑ ↓ climb a ladder · R begins again · Esc returns to building · L shows the scribe's lens, which outlines solid ground. On touch screens a pad appears during play, with climbing buttons whenever a ladder is on the page. Progress is saved in this browser.

**Archery:** a folio may offer a few arrows in its margin. In play, rest the pointer where you want to shoot to see the arrow's arc, and click to loose it; on a touch screen, press the picture to see the arc, and lift your finger to loose it. A bow is drawn with your feet planted, on the ground, a ledge or a ladder: the arc pales while you are in the air, and a shot asked for in mid-leap waits a moment for you to land. An arrow that strikes wood or earth roughly level sticks fast and makes a foothold you can stand on; stone turns arrows aside and water swallows them. Some folios hang targets, a painted butt, a bell or a rope: strike one and something on the page starts working, such as a portcullis wound up, a ladder let down, a drawbridge swung across a moat or a stone let fall. A rope is cut only at its knot, and whatever falls on a wolf crushes him. A grey wolf keeps the road in the second book's last folio. His bite sends you back to the start, and an arrow kills him. Arrows count toward a folio's par like pieces, and beginning again refills the quiver and puts everything back. The first book needs none; the second begins with them; the third asks for pieces and arrows together, each set exactly where it is wanted.

## Make your own folios: the scriptorium

Choose **The scriptorium** on the cover. Its folios use the same stage as the tale with everything unlocked: the whole cabinet of art (ground, dwellings, nature, sky, beasts, folk, marks), pictures of your own (kept in the cabinet for every folio of the book), gilded letters, passages of writing, and a role for every picture (ground, ledge, scenery, peril, ladder, goal, or the traveller). Give each folio a sky, a stream and a quiver of arrows, and make it bigger than the screen (up to eight screens, wide or tall) for the view to follow the traveller across; lead any of its edges on to another folio, so that walking off one side turns the page and the road runs on into the next, and make any picture a doorway (a cottage, an arch) that up, pressed before it, goes in at; hang butts, bells and ropes, and choose for any picture what it does when one is struck (rises, drops, or falls to one side; what drops on a wolf crushes it); set down a grey wolf to keep a stretch of ground. Play any page or the whole book in order, and save or open the book as a file. Pages from the old desk can be brought in.

## The old illuminator's desk

Reached from the scriptorium's contents (or `#desk`), this is the original free-form editor for books and maps:

- Click or drag original illustrations from the searchable, categorized library. Favorite your most-used details or import PNG, JPEG, WebP, and GIF artwork.
- Add independent text passages. Choose any combination of Thorn, Eth, Wynn, Eng, Yogh, Long s, Ash, Ethel, and Tironian et. Original spelling stays editable.
- Control typeface, size, alignment, weight, italic, ink, line height, and letter spacing per passage.
- Move, resize, rotate, flip, duplicate, hide, lock, and reorder layers, with undo and redo. Give illustrations a play role and choose **Play scene** to try the page.
- Choose a book or a map and its size; add, duplicate, reorder and remove pages. The project autosaves in this browser; download it for reliable long-term storage and use **Open** to restore it.
- Export a page as a 2× PNG or a self-contained SVG, the whole book as one image per page, or a multi-page PDF.

Nothing is stored on a server. Saves belong to this browser and device, and clearing browser data removes them, so download books you care about. Letter substitution is creative spelling, not translation into historical Old English; its rules derive from the user's Olde Scribe prototype and remain approximate.

## Development

React, TypeScript and Vite, with native pointer events. All artwork and typefaces are served with the app; no image-generation service or secret is needed to use it.

```sh
npm ci --legacy-peer-deps
npm run dev      # http://localhost:5173/ManuscriptMaker/
npm test         # unit tests, including the level solver
npm run build
```

Browser checks drive the real app with Playwright and need `npm run dev` running (set `CHROME=/path/to/chromium` if Playwright's own browser is missing):

- `npm run test:levels` proves each folio is closed when bare and solvable several ways, by searching the real physics (`src/engine/solver.ts`); archery folios are proved with shots loosed as play looses them.
- `npm run test:chapter` plays the later folios in a browser: pieces dragged from the margin, ladders climbed with the touch pad on a phone, the finale walked to the end of the first book, and the whole second book, from an arrow aimed with the mouse to the wolf sent running.
- `npm run test:tale` covers the cover, the tailor, the contents, Folios I and II, saving and reloading, and the cover, contents and tailor on an upright phone.
- `npm run test:solidity` drops a probe on every walkable piece and checks it rests where the art is painted.
- `npm run test:scriptorium`, `npm run test:play` and `npm run test:browser` cover the scriptorium (on a phone too), the desk's play scene, and the desk.

Pushing `main` tests, builds and deploys the site through GitHub Actions.

## Project structure

- `src/tale/`: the tale's cover, tailor, contents, folio screen and Explicit card; `levels.ts` holds the folios as data, with measured walkable surfaces.
- `src/tale/stage/`: the folio stage shared by the tale and the scriptorium, and the cabinet of pieces.
- `src/scriptorium/`: the scriptorium's book of folios, its settings, and conversion to and from project pages.
- `src/engine/`: play. Collision is rasterised from each picture's painted pixels; a fixed-step controller, per-asset physics, archery, the puppet, synthesised sound and music, and the reachability solver used by the checks.
- `src/App.tsx`, `src/ManuscriptCanvas.tsx`, `src/TextEditor.tsx`, `src/text.ts`, `src/document.ts`, `src/project.ts`, `src/export.ts`: the old illuminator's desk.
- `src/assets.ts`, `src/generated-assets.json` and `public/assets/`: the art catalog. Sheet originals, prompts and manifests live in `art-source/`; see `docs/ART_PIPELINE.md`.
- `scripts/`: the browser checks and the level harness. `docs/`: the product vision (`GAME_VISION.md`) and the agents' handover notes.

## Credits

Inspired by the creative sandbox of [Scriptorium: Master of Manuscripts](https://www.yazagames.com/faq), the place-and-play spirit of *Klik & Play*, and the user's Olde Scribe prototype. This is an independent project with original generated illustrations, and is not affiliated with Yaza Games.

Typefaces: Cormorant Garamond, EB Garamond, Gentium Book Plus, Grenze Gotisch, IM Fell English, IM Fell English SC, UnifrakturMaguntia, and Uncial Antiqua, distributed through Fontsource under their open font licenses. Icons: Lucide, ISC license. Dependency license texts are included with their packages.
