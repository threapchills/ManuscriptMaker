/**
 * Watercolour skies painted once per folio: a graded wash, pigment blooms,
 * soft distant clouds and paper grain, so the sky is crisp at any size
 * instead of a stretched thumbnail.
 */
export type SkyKind = 'day' | 'dawn' | 'dusk' | 'night';

const PALETTES: Record<SkyKind, { stops: Array<[number, string]>; cloud: string; shade: string; bloom: string[]; glow?: string }> = {
  day: { stops: [[0, '#5f8fc9'], [.45, '#8fb8e0'], [.78, '#cfe0ea'], [1, '#eef0e2']], cloud: '255,253,247', shade: '150,170,200', bloom: ['#6f9ad0', '#a6c8e8', '#86acd8'] },
  dawn: { stops: [[0, '#6f7fb8'], [.35, '#b998b8'], [.66, '#efb89e'], [1, '#f8dcae']], cloud: '255,236,226', shade: '176,140,160', bloom: ['#c6a0b8', '#f0c0a0', '#9c90c0'], glow: 'rgba(255,214,150,.55)' },
  dusk: { stops: [[0, '#26335f'], [.4, '#6f5a8a'], [.72, '#d9876a'], [1, '#f2b77a']], cloud: '246,196,176', shade: '90,70,110', bloom: ['#4a4f86', '#b07090', '#e39a70'], glow: 'rgba(255,170,110,.5)' },
  night: { stops: [[0, '#0b1230'], [.5, '#18244d'], [1, '#34426f']], cloud: '170,180,215', shade: '20,26,55', bloom: ['#1d2a5a', '#2a3a70', '#141d42'] },
};

function seeded(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

let grain: HTMLCanvasElement | null = null;
function grainTile(): HTMLCanvasElement {
  if (grain) return grain;
  grain = document.createElement('canvas');
  grain.width = grain.height = 192;
  const c = grain.getContext('2d')!;
  const img = c.createImageData(192, 192);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - .5) * 90;
    img.data[i] = v; img.data[i + 1] = v * .96; img.data[i + 2] = v * .88; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return grain;
}

export function paintSky(canvas: HTMLCanvasElement, kind: SkyKind, width: number, height: number, seed = 7): void {
  const scale = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
  const c = canvas.getContext('2d');
  if (!c) return;
  c.scale(scale, scale);
  const p = PALETTES[kind], random = seeded(seed * 7919 + kind.length);

  const wash = c.createLinearGradient(0, 0, 0, height);
  p.stops.forEach(([o, color]) => wash.addColorStop(o, color));
  c.fillStyle = wash; c.fillRect(0, 0, width, height);

  // Pigment blooms: the uneven drying of a real wash.
  for (let i = 0; i < 46; i++) {
    const x = random() * width, y = random() * height * .85, r = 60 + random() * 220;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const color = p.bloom[Math.floor(random() * p.bloom.length)];
    g.addColorStop(0, hexToRgba(color, .05 + random() * .08)); g.addColorStop(.7, hexToRgba(color, .03)); g.addColorStop(1, hexToRgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (p.glow) {
    const g = c.createRadialGradient(width * .5, height * .78, 0, width * .5, height * .78, width * .7);
    g.addColorStop(0, p.glow); g.addColorStop(1, 'rgba(255,200,140,0)');
    c.fillStyle = g; c.fillRect(0, 0, width, height);
  }

  if (kind === 'night') {
    for (let i = 0; i < 90; i++) {
      const x = random() * width, y = random() * height * .7, r = .6 + random() * 1.6;
      c.fillStyle = `rgba(255,240,200,${.35 + random() * .6})`;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      if (r > 1.7) { c.strokeStyle = 'rgba(255,230,170,.5)'; c.lineWidth = .6; c.beginPath(); c.moveTo(x - r * 3, y); c.lineTo(x + r * 3, y); c.moveTo(x, y - r * 3); c.lineTo(x, y + r * 3); c.stroke(); }
    }
  }

  // Distant clouds: low, flat banks of soft wash with a cooler underside, as
  // painters of miniatures laid them in behind the ink-drawn clouds.
  const clouds = kind === 'night' ? 2 : 5;
  for (let k = 0; k < clouds; k++) {
    const cx = (k + .25 + random() * .5) / clouds * width, cy = 90 + random() * height * .3, w = 170 + random() * 230, h = w * (.12 + random() * .06);
    const puffs = Array.from({ length: 7 + Math.floor(random() * 6) }, () => {
      const u = random() * 2 - 1;
      return { x: cx + u * w * .5, y: cy - (1 - u * u) * h * (.3 + random() * .5), rx: h * (.9 + random() * .9), ry: h * (.45 + random() * .35) };
    });
    for (const q of puffs) softEllipse(c, q.x + 3, q.y + h * .4, q.rx * 1.05, q.ry, `rgba(${p.shade},.1)`);
    for (const q of puffs) softEllipse(c, q.x, q.y, q.rx, q.ry, `rgba(${p.cloud},${kind === 'night' ? .1 : .3})`);
  }
  // A few long streaks of thin cloud near the horizon.
  for (let k = 0; k < 4; k++) {
    const y = height * (.38 + random() * .2), x = random() * width;
    softEllipse(c, x, y, 160 + random() * 240, 5 + random() * 6, `rgba(${p.cloud},${kind === 'night' ? .06 : .22})`);
  }

  // Paper grain and a soft vignette sink the wash into the vellum.
  const pattern = c.createPattern(grainTile(), 'repeat');
  if (pattern) { c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = .1; c.fillStyle = pattern; c.fillRect(0, 0, width, height); c.restore(); }
  const v = c.createRadialGradient(width / 2, height * .45, height * .3, width / 2, height * .5, width * .75);
  v.addColorStop(0, 'rgba(60,40,20,0)'); v.addColorStop(1, kind === 'night' ? 'rgba(0,0,10,.45)' : 'rgba(90,60,30,.22)');
  c.fillStyle = v; c.fillRect(0, 0, width, height);
}

function softEllipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) {
  c.save();
  c.translate(x, y); c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color); g.addColorStop(.55, color); g.addColorStop(1, color.replace(/,[\d.]+\)$/, ',0)'));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill();
  c.restore();
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha.toFixed(3)})`;
}
