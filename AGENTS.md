# Working on Manuscript

This is a long-term, multi-agent project. Read `docs/HANDOVER.md` and `TODO.md` before changes. User directions in the active conversation take precedence over these notes. Do not assume unfinished items are complete.

- Public app: https://threapchills.github.io/ManuscriptMaker/
- Repository: https://github.com/threapchills/ManuscriptMaker
- Stack: React, TypeScript, Vite. Static GitHub Pages deployment.
- Install with `npm ci --legacy-peer-deps`. Check with `npm test` and `npm run build`.
- Preserve existing project files and backward compatibility. Never silently discard a user's pages, original text, artwork, or glyph preferences when loading/saving.
- Use separate, bounded file ownership if the user asks for parallel agents. Read current changes before editing shared files. Never overwrite a teammate's unfinished changes.
- Keep `TODO.md` and `docs/HANDOVER.md` accurate at useful milestones. Record what actually ran and any known limitations. Do not merely mark a planned feature done.
- Publish a working checkpoint before taking on large expansions when requested. Never force-push or include credentials, local test outputs, browser caches, or temporary authentication helpers in commits.
- Generated art is original content, not copied game assets. The user wants economical modular sheets: invisible **8 columns × 4 rows** on **16:9 4K** transparent images, 32 isolated elements per call. Programmatic Python cutting/trimming is explicitly authorized. See `docs/ART_PIPELINE.md`.
- Maintain a warm, dark workshop with parchment as the main working surface. Avoid a marketing landing page. Keep controls functional and usable on small screens.
- Main long-term product direction: choose **book or map**, set size before creating, flip between book pages, arrange/reorder layers, and save/load complete projects.
- Manuscripts are also becoming playable click-and-play levels. Read `docs/GAME_VISION.md` before gameplay work. Keep Edit and Play connected, preserve old project data, and distinguish prototypes from finished levels.

## Boundaries

- `src/text.ts`: spelling conversion is pure, independently switchable, and preserves source spelling in the document. It is not historical-language translation.
- `src/ManuscriptCanvas.tsx`: canvas, pointer geometry, independent selection overlay. Selection handles must remain above other layers without changing artwork order.
- `src/export.ts`: exports use an offscreen clone; never modify the live canvas to export.
- `src/document.ts`: versioned input validation and legacy single-page documents.
- `src/assets.ts`: catalog data, stable IDs, raster URLs, categories, tags, natural aspect ratios.
- `public/assets/`: published artwork. Sheet originals and generation manifests should live in `art-source/`, outside the published directory.
