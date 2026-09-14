"""Cut standardized RGBA sheets into reusable manuscript parts.

python scripts/slice_art_sheets.py art-source/beast-parts.json
Requires Pillow. The manifest defines rows, columns, source, category, and
row-major items with stable id/name/tags. Source sheets are never changed.
"""
from __future__ import annotations

import argparse
import json
import re
from array import array
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]


def within_root(value: str) -> Path:
    target = (ROOT / value).resolve()
    if not target.is_relative_to(ROOT):
        raise ValueError("All artifact paths must stay inside the repository.")
    return target


def extract_components(source: Image.Image, cols: int, rows: int) -> list[Image.Image | None]:
    """Recover isolated silhouettes when a generated grid drifts slightly.

    Connect anti-aliased edge fragments, assign each component by grid center,
    then mask out neighboring components rather than blindly cropping them.
    The requested row-major ordering remains authoritative and needs visual QA.
    """
    w, h = source.size
    mask = source.getchannel('A').point(lambda value: 255 if value > 8 else 0).filter(ImageFilter.MaxFilter(3))
    remaining = bytearray(mask.tobytes())
    labels = array('H', [0]) * (w * h)
    components = []
    for seed in range(w * h):
        if not remaining[seed]:
            continue
        component_id = len(components) + 1
        if component_id >= 65535:
            raise ValueError('Too many disconnected fragments for reliable extraction.')
        stack = [seed]
        remaining[seed] = 0
        left, top, right, bottom, area = w, h, 0, 0, 0
        while stack:
            point = stack.pop()
            labels[point] = component_id
            y, x = divmod(point, w)
            left, right, top, bottom = min(left, x), max(right, x), min(top, y), max(bottom, y)
            area += 1
            for neighbor in ((point - 1 if x else -1), (point + 1 if x < w - 1 else -1), point - w, point + w):
                if 0 <= neighbor < len(remaining) and remaining[neighbor]:
                    remaining[neighbor] = 0
                    stack.append(neighbor)
        components.append((component_id, (left, top, right + 1, bottom + 1), area))
    grouped = [[] for _ in range(cols * rows)]
    for component_id, bounds, area in components:
        if area < 12:
            continue
        x = (bounds[0] + bounds[2]) / 2
        y = (bounds[1] + bounds[3]) / 2
        col, row = min(cols - 1, int(x / w * cols)), min(rows - 1, int(y / h * rows))
        grouped[row * cols + col].append((component_id, bounds, area))
    output = []
    for group in grouped:
        if not group or sum(item[2] for item in group) < 64:
            output.append(None)
            continue
        ids = {item[0] for item in group}
        box = (min(item[1][0] for item in group), min(item[1][1] for item in group), max(item[1][2] for item in group), max(item[1][3] for item in group))
        crop = source.crop(box)
        membership = bytes(255 if labels[y * w + x] in ids else 0 for y in range(box[1], box[3]) for x in range(box[0], box[2]))
        alpha_mask = Image.frombytes('L', crop.size, membership)
        crop.putalpha(ImageChops.multiply(crop.getchannel('A'), alpha_mask))
        # Restore a transparent gutter for the same validation contract as grid cells.
        padded = Image.new('RGBA', (crop.width + 20, crop.height + 20))
        padded.alpha_composite(crop, (10, 10))
        output.append(padded)
    return output


def split_sheet(manifest_path: Path, publish: bool = False, components: bool = False) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sheet_id = manifest["id"]
    if not re.fullmatch(r"[a-z0-9-]+", sheet_id):
        raise ValueError("Sheet id must be a kebab-case slug.")
    cols, rows = manifest.get("columns", 8), manifest.get("rows", 4)
    if not isinstance(cols, int) or not isinstance(rows, int) or not 1 <= cols <= 16 or not 1 <= rows <= 16:
        raise ValueError("Grid dimensions must be whole numbers from 1 to 16.")
    items = manifest["items"]
    if len(items) != cols * rows:
        raise ValueError(f"Expected {cols * rows} row-major items, got {len(items)}.")
    source_path = within_root(manifest["source"])
    source = Image.open(source_path)
    if "A" not in source.getbands():
        raise ValueError("Sheet has no alpha channel. Generate true transparency before slicing.")
    source = source.convert("RGBA")
    w, h = source.size
    recovered = extract_components(source, cols, rows) if components else None
    stage = within_root(f".local/art-crops/{sheet_id}")
    stage.mkdir(parents=True, exist_ok=True)
    report = {"id": sheet_id, "source": str(source_path.relative_to(ROOT)), "size": [w, h], "grid": [cols, rows], "extraction": "connected-components" if components else "fixed-grid", "items": [], "errors": [], "warnings": []}
    if abs(w / h - 16 / 9) > 0.06:
        report["warnings"].append("Actual image is not 16:9; boundaries use its actual dimensions. Visually check every cell.")
    if w < 3200 or h < 1800:
        report["warnings"].append("Actual image is below the requested 4K size. Review detail quality before publishing.")
    ids = set()
    cutouts = []
    contact = Image.new("RGB", (cols * 180, rows * 205), "#e8dec3")
    draw = ImageDraw.Draw(contact)
    for index, item in enumerate(items):
        asset_id = item["id"]
        if not re.fullmatch(r"[a-z0-9-]+", asset_id) or asset_id in ids:
            raise ValueError(f"Invalid or duplicate asset id: {asset_id}")
        ids.add(asset_id)
        if not isinstance(item["name"], str) or not isinstance(item.get("tags", []), list):
            raise ValueError(f"Invalid item metadata: {asset_id}")
        row, col = divmod(index, cols)
        box = (round(col * w / cols), round(row * h / rows), round((col + 1) * w / cols), round((row + 1) * h / rows))
        cell = recovered[index] if recovered is not None else source.crop(box)
        if cell is None:
            report['errors'].append(f'Cell {index + 1} ({asset_id}) has no isolated artwork.')
            continue
        alpha = cell.getchannel("A")
        histogram = alpha.histogram()
        transparent = sum(histogram[:9]) / (cell.width * cell.height)
        bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
        cell_report = {"id": asset_id, "cell": index + 1, "grid_box": box, "alpha_bbox": bbox, "transparent_fraction": round(transparent, 4)}
        report["items"].append(cell_report)
        if bbox is None or (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) < 64:
            report["errors"].append(f"Cell {index + 1} ({asset_id}) is empty or nearly empty.")
            continue
        if transparent < 0.12:
            report["errors"].append(f"Cell {index + 1} ({asset_id}) is mostly opaque; possible fake transparency or crossing artwork.")
        if bbox[0] < 2 or bbox[1] < 2 or bbox[2] > cell.width - 2 or bbox[3] > cell.height - 2:
            report["errors"].append(f"Cell {index + 1} ({asset_id}) touches its boundary; review clipping or overlapping cells.")
        padding = max(6, round(min(cell.width, cell.height) * 0.02))
        trimmed = cell.crop(bbox)
        padded = Image.new("RGBA", (trimmed.width + padding * 2, trimmed.height + padding * 2))
        padded.alpha_composite(trimmed, (padding, padding))
        out_path = stage / f"{asset_id}.png"
        padded.save(out_path, optimize=True)
        thumbnail = padded.copy()
        thumbnail.thumbnail((160, 166), Image.Resampling.LANCZOS)
        contact.paste(thumbnail, (col * 180 + (180 - thumbnail.width) // 2, row * 205 + (174 - thumbnail.height) // 2), thumbnail)
        draw.text((col * 180 + 8, row * 205 + 179), f"{index+1}. {item['name'][:24]}", fill="#453628")
        asset = {"id": asset_id, "name": item["name"], "category": item.get("category", manifest["category"]), "src": f"/ManuscriptMaker/assets/{asset_id}.png", "tags": item.get("tags", []), "width": padded.width, "height": padded.height}
        cutouts.append((padded, asset))
    contact.save(stage / "contact-sheet.jpg", quality=92)
    report["contact_sheet"] = str((stage / "contact-sheet.jpg").relative_to(ROOT))
    report["publish_requested"] = publish
    report["published"] = False
    if publish and not report["errors"]:
        catalog_path = ROOT / "src/generated-assets.json"
        catalog = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else []
        catalog = [asset for asset in catalog if asset["id"] not in ids]
        target = ROOT / "public/assets"
        target.mkdir(parents=True, exist_ok=True)
        for cutout, asset in cutouts:
            cutout.save(target / f"{asset['id']}.png", optimize=True)
            catalog.append(asset)
        catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        report["published"] = True
    (stage / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--publish", action="store_true", help="Copy validated cutouts into public/assets and update the generated catalog. Inspect the staged contact sheet first.")
    parser.add_argument("--components", action="store_true", help="Recover isolated silhouettes when generated grid positions drift; requires visual review of subject-to-cell mapping.")
    args = parser.parse_args()
    result = split_sheet(args.manifest, args.publish, args.components)
    print(json.dumps({key: result[key] for key in ("id", "size", "grid", "contact_sheet", "errors", "warnings", "published")}, indent=2))
    raise SystemExit(1 if result["errors"] else 0)
