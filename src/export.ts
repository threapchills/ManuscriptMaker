import { getFontEmbedCSS, toPng, toSvg } from 'html-to-image';
import type { Manuscript } from './types';
import type { jsPDF as JsPDF } from 'jspdf';
import type { Project } from './project';
import { transformText } from './text';

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

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeExportPage(manuscript: Manuscript): HTMLElement {
  const page = document.createElement('div');
  page.id = 'manuscript-export-page';
  page.className = `manuscript-page manuscript-paper--${manuscript.paper}`;
  Object.assign(page.style, {
    width: `${manuscript.width}px`, height: `${manuscript.height}px`,
    transform: 'none', transformOrigin: 'top left', margin: '0', overflow: 'hidden',
  });

  if (manuscript.border !== 'none') {
    const border = document.createElement('div');
    border.className = `manuscript-border manuscript-border--${manuscript.border}`;
    border.setAttribute('aria-hidden', 'true');
    if (manuscript.border === 'illuminated') {
      for (const position of ['nw', 'ne', 'sw', 'se']) {
        const corner = document.createElement('span');
        corner.className = `manuscript-corner manuscript-corner--${position}`;
        border.appendChild(corner);
      }
      for (const position of ['top', 'bottom']) {
        const gem = document.createElement('span');
        gem.className = `manuscript-border-gem manuscript-border-gem--${position}`;
        border.appendChild(gem);
      }
    }
    page.appendChild(border);
  }

  for (const layer of manuscript.layers) {
    if (layer.hidden) continue;
    const layerElement = document.createElement('div');
    layerElement.className = `manuscript-layer${layer.locked ? ' is-locked' : ''}`;
    layerElement.dataset.layerId = layer.id;
    Object.assign(layerElement.style, {
      left: `${layer.x}px`, top: `${layer.y}px`, width: `${layer.width}px`,
      height: `${layer.height}px`, transform: `rotate(${layer.rotation}deg)`,
    });
    const content = document.createElement('div');
    content.className = 'manuscript-layer-content';
    Object.assign(content.style, {
      opacity: String(layer.opacity), transform: `scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
    });
    if (layer.type === 'image') {
      const image = document.createElement('img');
      image.src = layer.src;
      image.alt = layer.name;
      image.draggable = false;
      image.style.objectFit = layer.imageFit || 'contain';
      content.appendChild(image);
    } else {
      const text = document.createElement('div');
      text.className = 'manuscript-text';
      text.textContent = transformText(layer.text, layer.glyphs);
      Object.assign(text.style, {
        fontFamily: layer.fontFamily, fontSize: `${layer.fontSize}px`, color: layer.color,
        fontWeight: String(layer.bold ? 700 : 400), fontStyle: layer.italic ? 'italic' : 'normal',
        textAlign: layer.align, lineHeight: String(layer.lineHeight), letterSpacing: `${layer.letterSpacing}px`,
      });
      content.appendChild(text);
    }
    layerElement.appendChild(content);
    page.appendChild(layerElement);
  }
  return page;
}

/** Work on an unscaled, off-screen page so editor gestures never enter an export. */
async function renderExport(manuscript: Manuscript, format: 'png' | 'svg') {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'fixed', left: '-100000px', top: '0', pointerEvents: 'none' });
  const page = makeExportPage(manuscript);
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

async function exportPages(project: Project, format: 'png' | 'svg'): Promise<void> {
  for (const [index, page] of project.pages.entries()) {
    const data = await renderExport(page, format);
    download(data, `${safeFilename(project.title)}-page-${index + 1}.${format}`);
  }
}

/** Download every book page as an individual high-resolution PNG. */
export async function exportBookPNG(project: Project): Promise<void> {
  await exportPages(project, 'png');
}

/** Download every book page as a self-contained SVG. */
export async function exportBookSVG(project: Project): Promise<void> {
  await exportPages(project, 'svg');
}

/** Download every book page as a printable multi-page PDF. */
export async function exportBookPDF(project: Project): Promise<void> {
  const { jsPDF } = await import('jspdf');
  let pdf: JsPDF | undefined;
  for (const [index, page] of project.pages.entries()) {
    const image = await renderExport(page, 'png');
    const width = page.width * 0.75;
    const height = page.height * 0.75;
    const orientation = width >= height ? 'landscape' : 'portrait';
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'pt', format: [width, height], compress: true });
      pdf.setProperties({ title: project.title, subject: 'Illuminated manuscript book' });
    } else {
      pdf.addPage([width, height], orientation);
    }
    pdf.addImage(image, 'PNG', 0, 0, width, height, undefined, 'FAST');
    if (index === project.pages.length - 1) downloadBlob(pdf.output('blob'), `${safeFilename(project.title)}.pdf`);
  }
}

export const exportPng = exportPNG;
export const exportSvg = exportSVG;
