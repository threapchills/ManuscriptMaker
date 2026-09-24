/**
 * The collision field: a set of bit masks built from painted pixels, with
 * summed-area tables so any rectangle can be tested in constant time.
 *
 * One cell is `cell` page units. Pages up to 1600 units wide use one cell per
 * unit, so collision matches the artwork to the pixel.
 */
export type SurfaceKind = 'solid' | 'platform' | 'hazard' | 'ladder';
export type Material = 'grass' | 'earth' | 'wood' | 'stone' | 'hay' | 'leaves' | 'cloth' | 'water';

export interface Field {
  width: number;
  height: number;
  cell: number;
  solid: Uint8Array;
  platform: Uint8Array;
  hazard: Uint8Array;
  ladder: Uint8Array;
  /** Index + 1 of the piece that owns each walkable cell, for footsteps and feedback. */
  owner: Uint16Array;
  materials: Material[];
  sums: { solid: Int32Array; platform: Int32Array; hazard: Int32Array; ladder: Int32Array };
}

export function createField(pageWidth: number, pageHeight: number, cell = cellFor(pageWidth, pageHeight)): Field {
  const width = Math.max(1, Math.ceil(pageWidth / cell));
  const height = Math.max(1, Math.ceil(pageHeight / cell));
  const size = width * height;
  const sum = () => new Int32Array((width + 1) * (height + 1));
  return {
    width, height, cell,
    solid: new Uint8Array(size), platform: new Uint8Array(size), hazard: new Uint8Array(size), ladder: new Uint8Array(size),
    owner: new Uint16Array(size), materials: [],
    sums: { solid: sum(), platform: sum(), hazard: sum(), ladder: sum() },
  };
}

/** Keep huge sandbox pages affordable while matching normal pages exactly. */
export function cellFor(pageWidth: number, pageHeight: number): number {
  const longest = Math.max(pageWidth, pageHeight);
  return longest <= 1600 ? 1 : Math.ceil(longest / 1600);
}

function integrate(mask: Uint8Array, out: Int32Array, width: number, height: number) {
  const stride = width + 1;
  out.fill(0);
  for (let y = 0; y < height; y++) {
    let row = 0;
    const base = y * width;
    const outRow = (y + 1) * stride;
    const prevRow = y * stride;
    for (let x = 0; x < width; x++) {
      row += mask[base + x] ? 1 : 0;
      out[outRow + x + 1] = out[prevRow + x + 1] + row;
    }
  }
}

/** Recompute the summed-area tables after the masks change. */
export function finalizeField(field: Field): Field {
  integrate(field.solid, field.sums.solid, field.width, field.height);
  integrate(field.platform, field.sums.platform, field.width, field.height);
  integrate(field.hazard, field.sums.hazard, field.width, field.height);
  integrate(field.ladder, field.sums.ladder, field.width, field.height);
  return field;
}

/** Number of set cells in [x0, x1) × [y0, y1), clipped to the field. */
export function countIn(field: Field, sum: Int32Array, x0: number, y0: number, x1: number, y1: number): number {
  const ax = Math.max(0, Math.min(field.width, Math.floor(x0)));
  const bx = Math.max(0, Math.min(field.width, Math.ceil(x1)));
  const ay = Math.max(0, Math.min(field.height, Math.floor(y0)));
  const by = Math.max(0, Math.min(field.height, Math.ceil(y1)));
  if (bx <= ax || by <= ay) return 0;
  const stride = field.width + 1;
  return sum[by * stride + bx] - sum[ay * stride + bx] - sum[by * stride + ax] + sum[ay * stride + ax];
}

/** Solid cells, with the left and right page edges acting as walls. The sky and the drop below stay open. */
export function solidIn(field: Field, x: number, y: number, w: number, h: number): boolean {
  if (x < 0 || x + w > field.width) return true;
  return countIn(field, field.sums.solid, x, y, x + w, y + h) > 0;
}
export const solidRow = (field: Field, row: number, x: number, w: number) => solidIn(field, x, row, w, 1);
export const platformRow = (field: Field, row: number, x: number, w: number) => countIn(field, field.sums.platform, x, row, x + w, row + 1) > 0;
export const hazardIn = (field: Field, x: number, y: number, w: number, h: number) => countIn(field, field.sums.hazard, x, y, x + w, y + h);
export const ladderIn = (field: Field, x: number, y: number, w: number, h: number) => countIn(field, field.sums.ladder, x, y, x + w, y + h);

/** Material under a point, if any piece owns it. */
export function materialAt(field: Field, x: number, y: number): Material | undefined {
  const cx = Math.floor(x), cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= field.width || cy >= field.height) return undefined;
  const owner = field.owner[cy * field.width + cx];
  return owner ? field.materials[owner - 1] : undefined;
}

/** The first walkable row at or below `fromRow` in a column, for shadows and landing previews. */
export function groundBelow(field: Field, x: number, fromRow: number, maxRows = 2000): number | undefined {
  const cx = Math.floor(x);
  if (cx < 0 || cx >= field.width) return undefined;
  for (let y = Math.max(0, Math.floor(fromRow)); y < Math.min(field.height, fromRow + maxRows); y++) {
    const index = y * field.width + cx;
    if (field.solid[index] || field.platform[index]) return y;
  }
  return undefined;
}

/**
 * Remove wisps thinner than `radius * 2 + 1` cells (grass blades, stray
 * strokes) and fill pinholes of the same size, so surfaces match what the
 * eye reads as ground rather than the tips of every painted hair.
 */
export function openAndClose(mask: Uint8Array, width: number, height: number, radius: number, region?: { x0: number; y0: number; x1: number; y1: number }): void {
  if (radius <= 0) return;
  const x0 = Math.max(0, region?.x0 ?? 0), y0 = Math.max(0, region?.y0 ?? 0);
  const x1 = Math.min(width, region?.x1 ?? width), y1 = Math.min(height, region?.y1 ?? height);
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const a = new Uint8Array(w * h), b = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = mask[(y + y0) * width + x + x0] ? 1 : 0;
  const span = radius * 2 + 1;
  // Sliding-window min/max: linear in the region size whatever the radius.
  // Outside the region counts as empty, so edges erode naturally.
  const pass = (src: Uint8Array, dst: Uint8Array, horizontal: boolean, erode: boolean) => {
    const lines = horizontal ? h : w, length = horizontal ? w : h;
    const at = (line: number, i: number) => horizontal ? line * w + i : i * w + line;
    for (let line = 0; line < lines; line++) {
      let count = 0;
      for (let i = 0; i < Math.min(radius, length); i++) count += src[at(line, i)];
      for (let i = 0; i < length; i++) {
        const add = i + radius, drop = i - radius - 1;
        if (add < length) count += src[at(line, add)];
        if (drop >= 0) count -= src[at(line, drop)];
        dst[at(line, i)] = erode ? (count === span ? 1 : 0) : (count > 0 ? 1 : 0);
      }
    }
  };
  const morph = (erode: boolean) => { pass(a, b, true, erode); pass(b, a, false, erode); };
  morph(true); morph(false); // opening removes thin wisps
  morph(false); morph(true); // closing fills pinholes
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[(y + y0) * width + x + x0] = a[y * w + x];
}

/**
 * Close hairline gaps between neighbouring pieces, row by row, so two
 * pieces laid edge to edge read as one path — the way a player means them.
 * Gaps wider than `maxGap` cells are real gaps and stay open.
 */
export function bridgeGaps(field: Field, maxGap: number): void {
  if (maxGap <= 0) return;
  const { width, height, solid, platform, owner } = field;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let last = -1;
    for (let x = 0; x < width; x++) {
      const i = row + x;
      if (!solid[i] && !platform[i]) continue;
      const gap = x - last - 1;
      if (last >= 0 && gap > 0 && gap <= maxGap) {
        const bothSolid = solid[row + last] && solid[i];
        const mask = bothSolid ? solid : platform;
        for (let k = last + 1; k < x; k++) { mask[row + k] = 1; owner[row + k] = owner[row + last] || owner[i]; }
      }
      last = x;
    }
  }
}

/** Test helper and simple builder: fill axis-aligned rectangles (page units). */
export function fillRect(field: Field, kind: SurfaceKind, x: number, y: number, w: number, h: number, material: Material = 'earth'): void {
  const mask = field[kind];
  const ownerIndex = kind === 'solid' || kind === 'platform' ? field.materials.push(material) : 0;
  const c = field.cell;
  const ax = Math.max(0, Math.floor(x / c)), ay = Math.max(0, Math.floor(y / c));
  const bx = Math.min(field.width, Math.ceil((x + w) / c)), by = Math.min(field.height, Math.ceil((y + h) / c));
  for (let yy = ay; yy < by; yy++) for (let xx = ax; xx < bx; xx++) {
    const i = yy * field.width + xx;
    mask[i] = 1;
    if (ownerIndex) field.owner[i] = ownerIndex;
  }
}

/** Test helper: fill a convex or concave polygon (page units) with an even-odd scanline. */
export function fillPolygon(field: Field, kind: SurfaceKind, points: Array<[number, number]>, material: Material = 'earth'): void {
  const mask = field[kind];
  const ownerIndex = kind === 'solid' || kind === 'platform' ? field.materials.push(material) : 0;
  const c = field.cell;
  const ys = points.map(p => p[1] / c);
  const minY = Math.max(0, Math.floor(Math.min(...ys))), maxY = Math.min(field.height - 1, Math.ceil(Math.max(...ys)));
  for (let y = minY; y <= maxY; y++) {
    const cy = y + .5;
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
      const y0 = ay / c, y1 = by / c;
      if ((y0 <= cy && y1 > cy) || (y1 <= cy && y0 > cy)) xs.push((ax / c) + (cy - y0) / (y1 - y0) * ((bx - ax) / c));
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k] - .5)); x < Math.min(field.width, Math.floor(xs[k + 1] - .5) + 1); x++) {
        const i = y * field.width + x;
        mask[i] = 1;
        if (ownerIndex) field.owner[i] = ownerIndex;
      }
    }
  }
}
