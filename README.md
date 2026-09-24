# Manuscript

An illuminated manuscript workshop growing into a simple create-and-play game. Arrange medieval art and words, give objects a role, then step inside the scene to test the path you made.

**[Open the workshop](https://threapchills.github.io/ManuscriptMaker/)**

## Make a manuscript

- Click or drag original illustrations from the searchable, categorized library. Favorite your most-used details or import PNG, JPEG, WebP, and GIF artwork.
- Add independent text passages. Choose any combination of Thorn, Eth, Wynn, Eng, Yogh, Long s, Ash, Ethel, and Tironian et. Original spelling stays editable.
- Control typeface, size, alignment, weight, italic, ink, line height, and letter spacing per passage. An overflow notice helps you resize text frames.
- Move, resize, rotate, flip, duplicate, hide, lock, and reorder layers. Shift constrains movement or snaps rotation. Arrow keys nudge; Shift+arrows move ten pixels.
- Choose parchment, borders, page proportions, or an editable starter folio.
- Undo/redo edits. The current manuscript autosaves in this browser. Download an editable project for reliable long-term storage, then use **Open** to restore it.
- Export a 2× PNG or a self-contained SVG with embedded images and fonts. SVG uses `foreignObject` to preserve the browser's text layout; PNG is the best choice for programs without that SVG feature.

The workshop has no account or server storage. Autosave belongs to this browser and device; clearing browser data removes it. Uploaded images remain in the local document and downloaded project. Exported images have no editor guides or selection handles.

Letter substitution is creative spelling, not translation into historical Old English. The voiced/unvoiced rules and exception dictionaries derive from the supplied Olde Scribe prototype; they remain approximate.

## Playtest a scene

Choose the **Playable crossing** starter when creating a book, or give illustrations a **Play role** in the inspector. Scenery can be walked through; a Character can move and jump; Solid objects block movement; Platforms can be landed on from above; a Goal finishes the scene. Select **Play scene** to test it, then return to Edit. Play does not change the saved artwork. Arrow keys or A/D move, and Up, W, or Space jumps; touch buttons are available too.

This is an early movement prototype, not a finished Level One. Guided challenge levels will start with fixed scenes and chosen pieces, and levels will be organized separately from book pages. The full product brief and remaining decisions are in `docs/GAME_VISION.md`.

## Development

React, TypeScript, Vite, and native pointer events. All artwork and typefaces are served with the app. No image-generation API or secret is needed to use the published workshop.

```sh
npm ci --legacy-peer-deps
npm run dev
npm test
npm run build
npm run test:play
```

The Vite base is `/ManuscriptMaker/`. Pushing `main` tests, builds, and deploys through GitHub Actions. In repository settings, Pages uses **GitHub Actions** as its source.

## Project structure

- `src/App.tsx`: workshop UI, document history, local save, import, and library controls.
- `src/ManuscriptCanvas.tsx`: layer rendering, pointer gestures, and selection overlay.
- `src/game.ts` and `src/PlayMode.tsx`: pure movement/collision rules and read-only scene playtest.
- `src/TextEditor.tsx` and `src/text.ts`: typography controls and independently enabled substitutions.
- `src/document.ts`: starter folios, schema validation, and project files.
- `src/assets.ts` and `public/assets/`: illustration catalog and original generated cutouts.
- `src/export.ts`: image and font embedding for PNG/SVG exports.
- `docs/art-prompts.md`: illustration prompts and provenance.

The art catalog is data-driven: add a transparent PNG and an `ArtAsset` entry to extend it. Each passage preserves its own typography and substitution preferences; project files carry a versioned schema.

## Credits

Inspired by the creative sandbox of [Scriptorium: Master of Manuscripts](https://www.yazagames.com/faq) and the user's Olde Scribe prototype. This is an independent project with original generated illustrations, and is not affiliated with Yaza Games.

Typefaces: Cormorant Garamond, EB Garamond, Gentium Book Plus, IM Fell English, and Uncial Antiqua, distributed through Fontsource under their open font licenses. Icons: Lucide, ISC license. Dependency license texts are included with their packages.
