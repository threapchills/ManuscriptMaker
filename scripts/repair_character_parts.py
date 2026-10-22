"""Re-cut the character parts the sheet slicer paired wrongly.

python scripts/repair_character_parts.py
Requires Pillow. The generated character sheet drifted across its arms row:
reading the row left to right, its fourteen arms come in true pairs (blue,
red, green, brown, cream, fox, hare), but the grid cut them three to a cell
in places, so "Green sleeves" carried a brown arm, "Brown sleeves" a cream
one, and so on. The dragon tail's cell also caught one of the two feathered
wings. This reads the source sheet, finds each painted piece, and writes:
every pair of arms side by side (left arm in the left half, right in the
right, shoulders level, as the puppet splits them), a hare's pair of paws
that the sheet painted but no cell kept, the dragon tail alone, and the two
wings together; and the hood with its dark lining cut away, so that worn over
a head the face shows through its opening. The source sheet is never changed.
"""
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / 'art-source/sheets/character-parts.png'
ASSETS = ROOT / 'public/assets'
CATALOG = ROOT / 'src/generated-assets.json'
PAD = 6


def pieces(sheet: Image.Image) -> list[tuple[tuple[int, int, int, int], Image.Image]]:
    """Every painted piece of the sheet: its bounds, and itself cut out alone (neighbours masked away)."""
    w, h = sheet.size
    mask = sheet.getchannel('A').point(lambda v: 255 if v > 8 else 0).filter(ImageFilter.MaxFilter(3))
    on = mask.load()
    label = [0] * (w * h)
    found = []
    for start in range(w * h):
        if label[start] or not on[start % w, start // w]:
            continue
        n = len(found) + 1
        stack, members = [start], []
        label[start] = n
        while stack:
            p = stack.pop()
            members.append(p)
            y, x = divmod(p, w)
            for q in ((p - 1) if x else -1, (p + 1) if x < w - 1 else -1, p - w, p + w):
                if 0 <= q < w * h and not label[q] and on[q % w, q // w]:
                    label[q] = n
                    stack.append(q)
        found.append(members)
    out = []
    alpha = sheet.getchannel('A')
    for n, members in enumerate(found, 1):
        if len(members) < 400:
            continue
        xs = [p % w for p in members]
        ys = [p // w for p in members]
        box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
        keep = Image.new('L', (box[2] - box[0], box[3] - box[1]), 0)
        k = keep.load()
        for p in members:
            k[p % w - box[0], p // w - box[1]] = 255
        piece = sheet.crop(box)
        piece.putalpha(Image.composite(alpha.crop(box), Image.new('L', keep.size, 0), keep))
        out.append((box, piece))
    return out


def side_by_side(left: Image.Image, right: Image.Image) -> Image.Image:
    """Two pieces in equal halves, each centred in its own, tops level."""
    half = max(left.width, right.width) + 2 * PAD
    height = max(left.height, right.height) + 2 * PAD
    canvas = Image.new('RGBA', (half * 2, height), (0, 0, 0, 0))
    canvas.alpha_composite(left, ((half - left.width) // 2, PAD))
    canvas.alpha_composite(right, (half + (half - right.width) // 2, PAD))
    return canvas


def alone(piece: Image.Image) -> Image.Image:
    canvas = Image.new('RGBA', (piece.width + 2 * PAD, piece.height + 2 * PAD), (0, 0, 0, 0))
    canvas.alpha_composite(piece, (PAD, PAD))
    return canvas


def open_hood(hood: Image.Image) -> Image.Image:
    """Cut away a hood's dark lining within its opening, keeping the red cloth and gold trim, feathering the edge."""
    out = hood.copy()
    px = out.load()
    w, h = out.size
    # The opening, an upright oval on the hood's right, measured from the painting.
    cx, cy, rx, ry = .71 * w, .49 * h, .17 * w, .29 * h
    cloth = lambda p: (p[0] > 90 and p[0] - p[1] > 50) or (p[0] + p[1] + p[2] > 340 and p[0] > p[2] + 60)
    hole = Image.new('L', out.size, 0)
    hp = hole.load()
    cut = 0
    for y in range(h):
        for x in range(w):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 and px[x, y][3] and not cloth(px[x, y]):
                hp[x, y] = 255
                cut += 1
    # Close over the brown flecks in the lining, then soften the edge a little.
    hole = hole.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.7))
    out.putalpha(ImageChops.subtract(out.getchannel('A'), hole))
    print('hood lining cut away:', cut, 'pixels')
    return out


def main() -> None:
    sheet = Image.open(SHEET).convert('RGBA')
    rows: dict[int, list] = {}
    for box, piece in pieces(sheet):
        rows.setdefault(int((box[1] + box[3]) / 2 / (sheet.height / 4)), []).append((box, piece))
    arms_row = sorted(rows[2], key=lambda bp: bp[0][0])[:14]
    last_row = sorted(rows[3], key=lambda bp: bp[0][0])
    made = {}
    for i, name in enumerate(['blue', 'red', 'green', 'brown', 'cream', 'fox', 'hare']):
        made[f'char-arms-{name}'] = side_by_side(arms_row[2 * i][1], arms_row[2 * i + 1][1])
    made['char-tail-dragon'] = alone(last_row[4][1])
    made['char-wings'] = side_by_side(last_row[5][1], last_row[6][1])
    made['char-hood'] = open_hood(alone(last_row[7][1]))
    catalog = json.loads(CATALOG.read_text())
    for asset_id, image in made.items():
        image.save(ASSETS / f'{asset_id}.png', optimize=True)
        entry = next((a for a in catalog if a['id'] == asset_id), None)
        if entry is None:
            entry = {'id': asset_id, 'name': 'Hare paws', 'category': 'Character parts', 'src': f'/ManuscriptMaker/assets/{asset_id}.png', 'tags': ['arms', 'hare', 'animal']}
            catalog.insert(next(i for i, a in enumerate(catalog) if a['id'] == 'char-arms-fox') + 1, entry)
        entry['width'], entry['height'] = image.size
        print(asset_id, image.size)
    CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
