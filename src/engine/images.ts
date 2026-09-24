/** Decoded images and their opaque bounds, loaded once per source. */
export interface LoadedImage {
  image: HTMLImageElement;
  width: number;
  height: number;
  /** Opaque bounds as fractions of the image (alpha > 50%). */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Low-resolution alpha for hit testing, `alphaW` × `alphaH`. */
  alpha: Uint8Array;
  alphaW: number;
  alphaH: number;
}

const cache = new Map<string, Promise<LoadedImage>>();

function analyse(image: HTMLImageElement): LoadedImage {
  const width = image.naturalWidth || 1, height = image.naturalHeight || 1;
  const scale = Math.min(1, 256 / Math.max(width, height));
  const alphaW = Math.max(1, Math.round(width * scale)), alphaH = Math.max(1, Math.round(height * scale));
  const alpha = new Uint8Array(alphaW * alphaH);
  let x0 = alphaW, y0 = alphaH, x1 = -1, y1 = -1;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = alphaW; canvas.height = alphaH;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) {
      context.drawImage(image, 0, 0, alphaW, alphaH);
      const data = context.getImageData(0, 0, alphaW, alphaH).data;
      for (let y = 0; y < alphaH; y++) for (let x = 0; x < alphaW; x++) {
        const a = data[(y * alphaW + x) * 4 + 3];
        alpha[y * alphaW + x] = a;
        if (a > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
  } catch { /* A tainted or unreadable image still plays, as a whole rectangle. */ }
  const bounds = x1 < 0 ? { x0: 0, y0: 0, x1: 1, y1: 1 } : { x0: x0 / alphaW, y0: y0 / alphaH, x1: (x1 + 1) / alphaW, y1: (y1 + 1) / alphaH };
  if (x1 < 0) alpha.fill(255);
  return { image, width, height, bounds, alpha, alphaW, alphaH };
}

export function loadImage(src: string): Promise<LoadedImage> {
  let pending = cache.get(src);
  if (!pending) {
    pending = new Promise<LoadedImage>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        const ready = image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
        void ready.then(() => resolve(analyse(image)));
      };
      image.onerror = () => { cache.delete(src); reject(new Error(`Could not load ${src.slice(0, 80)}`)); };
      image.src = src;
    });
    cache.set(src, pending);
  }
  return pending;
}

export async function loadImages(sources: string[]): Promise<Map<string, LoadedImage>> {
  const unique = [...new Set(sources.filter(Boolean))];
  const loaded = await Promise.all(unique.map(src => loadImage(src).then(image => [src, image] as const).catch(() => null)));
  return new Map(loaded.filter((entry): entry is readonly [string, LoadedImage] => !!entry));
}

/** Alpha (0–255) at a point given as fractions of the image. */
export function alphaAt(image: LoadedImage, u: number, v: number): number {
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return 0;
  return image.alpha[Math.floor(v * image.alphaH) * image.alphaW + Math.floor(u * image.alphaW)];
}
