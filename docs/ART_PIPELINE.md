# Modular artwork pipeline

Latest user direction, 2026-09-13: use standardized invisible **8-column × 4-row grids**, with **32 smaller elements per transparent 16:9 4K image**. This supersedes the earlier 4×4 idea and one-element-per-call approach. Python cutting and trimming is explicitly authorized by the user.

## Sheet contract

- Request 3840×2160 where supported. Each cell is 480×540 at that size. If the actual result differs, derive boundaries proportionally from its actual width and height; do not assume requested dimensions were honored.
- No visible grid, captions, numbers, page background, shadows outside the cell, checkerboards, or borders around cells.
- One clearly separate element per cell. Center it and contain the complete silhouette inside the inner 70–75% of its cell; keep generous transparent gutters.
- Preserve real RGBA transparency. Check alpha before accepting a sheet.
- Use one coherent historical pigment/ink style across all categories: manuscript gouache, fine brown ink contours, muted burgundy, lapis, sage, and antique gold. Original art only.
- Assign names and stable IDs before generation in row-major order. Never infer catalog labels blindly from the output when the model has swapped subjects.
- Sheets should focus on reusable building blocks: bodies, heads, wings, legs, tails, horns; helmets and armor; banners and cloth; towers, walls, doors and windows; flowers and stems; furniture, tools, vessels; emblems and symbols.

## Reusable prompt template

> Create a production sprite sheet for an illuminated-manuscript composition editor. 16:9 landscape, 3840×2160 target, genuine transparent RGBA background. Invisible equal grid: 8 columns × 4 rows, exactly 32 cells. Each cell contains one separate small cutout, centered, with the entire silhouette inside the inner 72% of that cell. Keep wide transparent gutters. No grid lines, labels, numbers, checkerboard, parchment rectangles, framing, or marks outside the assigned cell. Medieval manuscript gouache with fine brown ink outlines and burgundy, lapis blue, sage green, and antique gold. Flat illustrative view, visible hand-painted detail, consistent scale and linework. Follow these subjects in strict row-major order: [32 items]. The output will be programmatically cut at equal cell boundaries, so nothing may touch or cross a cell boundary.

The user mentioned “images2.5”. The current built-in image-generation tool does not expose a model selector. Preserve the preference and state actual tool capabilities honestly; do not silently switch to a paid API runner.

## Files and validation

- `art-source/sheets/<sheet-id>.png`: original sheet, never overwritten.
- `art-source/<sheet-id>.json`: source path, grid dimensions, exact prompt, category, ordered items.
- `public/assets/<stable-id>.png`: individual trimmed cutouts used by the app.
- `src/assets.ts`: catalog with actual cutout dimensions.
- Each crop should retain alpha, add a small transparent pad, and preserve the subject's aspect ratio.
- Flag empty alpha bounds, unusually low transparency, artwork near the cell boundary, or implausibly small content for manual review.
- Inspect each resulting sheet/contact sheet. A script can check geometry and alpha, but cannot verify that an image is the intended subject.

Built-in generation stores originals under the Codex generated-images directory. Copy chosen project assets into this repo. Exact prompts and source paths belong in versioned provenance notes, but never include credentials.
