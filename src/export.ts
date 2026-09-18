import { getFontEmbedCSS, toPng, toSvg } from 'html-to-image';
import type { Manuscript } from './types';

function safeFilename(title: string) {
  return title.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, '-').slice(0, 100) || 'my-manuscript';
}

function download(data: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = data;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Work on an unscaled, off-screen copy so editor gestures never enter an export. */
async function renderExport(manuscript: Manuscript, format: 'png' | 'svg') {
  const source = document.getElementById('manuscript-page');
  if (!source) throw new Error('Open a manuscript before exporting.');
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'fixed', left: '-100000px', top: '0', pointerEvents: 'none' });
  const page = source.cloneNode(true) as HTMLElement;
  page.id = 'manuscript-export-page';
  page.querySelectorAll('[data-export-ignore]').forEach(element => element.remove());
  page.querySelectorAll('.is-selected').forEach(element => element.classList.remove('is-selected'));
  Object.assign(page.style, {
    transform: 'none', transformOrigin: 'top left', width: `${manuscript.width}px`,
    height: `${manuscript.height}px`, margin: '0', overflow: 'hidden',
  });
  host.appendChild(page);
  document.body.appendChild(host);
  try {
    // Capture the selected folio before yielding so a page turn cannot swap it.
    await document.fonts.ready;
    await Promise.all(Array.from(page.querySelectorAll('img')).map(async img => {
      try { await img.decode(); }
      catch { throw new Error(`The illustration “${img.alt || 'Untitled'}” could not be loaded. Please try exporting again.`); }
    }));
    const fontEmbedCSS = await getFontEmbedCSS(page);
    const options = {
      width: manuscript.width, height: manuscript.height,
      pixelRatio: 2, fontEmbedCSS,
      filter: (node: HTMLElement) => !node.hasAttribute?.('data-export-ignore'),
    };
    return format === 'png' ? await toPng(page, options) : await toSvg(page, options);
  } finally {
    host.remove();
  }
}

export async function exportPNG(manuscript: Manuscript, filename?: string): Promise<void> {
  download(await renderExport(manuscript, 'png'), filename || `${safeFilename(manuscript.title)}.png`);
}

/** A self-contained SVG with embedded artwork, font data and HTML typography. */
export async function exportSVG(manuscript: Manuscript, filename?: string): Promise<void> {
  download(await renderExport(manuscript, 'svg'), filename || `${safeFilename(manuscript.title)}.svg`);
}

export const exportPng = exportPNG;
export const exportSvg = exportSVG;
