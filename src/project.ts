import type { Layer, Manuscript } from './types';
import { newManuscript, STORAGE_KEY, uid, validateManuscript } from './document';

export interface Project {
  version: 2;
  id: string;
  title: string;
  mode: 'book' | 'map';
  pages: Manuscript[];
  activePageId: string;
  updatedAt: string;
}

export interface NewProjectOptions {
  mode: 'book' | 'map';
  width?: number;
  height?: number;
  template?: string;
  pageCount?: number;
}

export const MAX_PAGES = 100;
const now = () => new Date().toISOString();
const validDimension = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 100 && value <= 3000;
const validId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 500;

function uniqueId(reserved: Set<string>): string {
  let id = uid();
  while (reserved.has(id)) id = uid();
  reserved.add(id);
  return id;
}

/** Give a template the requested page dimensions before it enters the book. */
function fitTemplate(page: Manuscript, width: number, height: number): Manuscript {
  if (page.width === width && page.height === height) return page;
  const sx = width / page.width;
  const sy = height / page.height;
  const textScale = Math.min(sx, sy);
  return {
    ...page, width, height,
    layers: page.layers.map(layer => ({
      ...layer,
      x: layer.x * sx, y: layer.y * sy,
      width: Math.max(1, layer.width * sx), height: Math.max(1, layer.height * sy),
      ...(layer.type === 'text' ? {
        fontSize: Math.max(8, Math.min(240, layer.fontSize * textScale)),
        letterSpacing: Math.max(-5, Math.min(30, layer.letterSpacing * textScale)),
        glyphs: { ...layer.glyphs },
      } : {}),
    })),
  };
}

function blankPageLike(source: Manuscript, title: string): Manuscript {
  return {
    ...newManuscript('blank'), title,
    width: source.width, height: source.height, paper: source.paper, border: source.border,
  };
}

export function newProject(options: NewProjectOptions = { mode: 'book' }): Project {
  if (!options || !['book', 'map'].includes(options.mode)) throw new Error('Choose a book or a map.');
  const width = options.width ?? (options.mode === 'map' ? 960 : options.template === 'crossing' ? 1280 : 720);
  const height = options.height ?? (options.mode === 'map' || options.template === 'crossing' ? 720 : 960);
  if (!validDimension(width) || !validDimension(height)) throw new Error('Page width and height must be between 100 and 3000 pixels.');
  const count = options.pageCount ?? (options.mode === 'map' || options.template === 'crossing' ? 1 : 3);
  if (!Number.isInteger(count) || count < 1 || count > MAX_PAGES) throw new Error('A book must contain between 1 and 100 pages.');
  if (options.mode === 'map' && count !== 1) throw new Error('A map contains one canvas.');
  const template = options.mode === 'map' ? 'blank' : options.template ?? 'bestiary';
  if (!['blank', 'bestiary', 'botanical', 'crossing'].includes(template)) throw new Error('Choose an available manuscript template.');
  const first = fitTemplate(newManuscript(template), width, height);
  if (options.mode === 'map') first.title = 'Untitled map';
  const pages = [first, ...Array.from({ length: count - 1 }, (_, index) => blankPageLike(first, `Page ${index + 2}`))];
  return {
    version: 2, id: uid(), title: options.mode === 'map' ? 'Untitled map' : template === 'blank' ? 'Untitled book' : first.title,
    mode: options.mode, pages, activePageId: first.id, updatedAt: now(),
  };
}

/** Accept complete v2 projects and preserve v1 files as a one-page book. */
export function validateProject(value: unknown): Project {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('That file does not contain a book or map.');
  const candidate = value as Record<string, unknown>;
  if (candidate.version === 1) {
    const legacy = validateManuscript(value);
    const reserved = new Set(legacy.layers.map(layer => layer.id));
    // V1 permitted a page and a layer to share an id. Keep every layer and only
    // regenerate the container id when needed to make the migrated project valid.
    const page = validId(legacy.id) && !reserved.has(legacy.id) ? legacy : { ...legacy, id: uniqueId(reserved) };
    reserved.add(page.id);
    return {
      version: 2, id: uniqueId(reserved), title: legacy.title, mode: 'book', pages: [page],
      activePageId: page.id, updatedAt: typeof legacy.updatedAt === 'string' && Number.isFinite(Date.parse(legacy.updatedAt)) ? legacy.updatedAt : now(),
    };
  }
  if (candidate.version !== 2 || !validId(candidate.id) || typeof candidate.title !== 'string' || candidate.title.length > 200 || !['book', 'map'].includes(candidate.mode as string) || !Array.isArray(candidate.pages) || candidate.pages.length < 1 || candidate.pages.length > MAX_PAGES || !validId(candidate.activePageId) || typeof candidate.updatedAt !== 'string' || !Number.isFinite(Date.parse(candidate.updatedAt))) {
    throw new Error('This project has an unsupported format.');
  }
  const project = value as Project;
  if (project.mode === 'map' && project.pages.length !== 1) throw new Error('A map must contain exactly one canvas.');
  const ids = new Set<string>([project.id]);
  for (const page of project.pages) {
    validateManuscript(page);
    for (const id of [page.id, ...page.layers.map(layer => layer.id)]) {
      if (!validId(id) || ids.has(id)) throw new Error('Every page and layer must have its own unique identifier.');
      ids.add(id);
    }
  }
  if (!project.pages.some(page => page.id === project.activePageId)) throw new Error('The selected page is missing from this project.');
  return project;
}

/** Existing invalid saves are never overwritten or silently replaced here. */
export function loadProject(storageKey = STORAGE_KEY): Project {
  let saved: string | null;
  try { saved = localStorage.getItem(storageKey); }
  catch { return newProject({ mode: 'book', pageCount: 1 }); }
  if (!saved) return newProject({ mode: 'book', pageCount: 1 });
  try { return validateProject(JSON.parse(saved)); }
  catch (error) {
    throw new Error(`Your saved project could not be opened. Its original data is still on this device. ${error instanceof Error ? error.message : 'The saved file is invalid.'}`);
  }
}

export function activePage(project: Project): Manuscript {
  const page = project.pages.find(item => item.id === project.activePageId);
  if (!page) throw new Error('The selected page is missing from this project.');
  return page;
}

/** Keep a single source of truth for page content; other page references survive. */
export function withActivePage(project: Project, page: Manuscript): Project {
  if (page.id !== project.activePageId || !project.pages.some(item => item.id === page.id)) throw new Error('The updated page does not match the active page.');
  if (activePage(project) === page) return project;
  return { ...project, pages: project.pages.map(item => item.id === page.id ? page : item), updatedAt: now() };
}

/** Async uploads stay on their original page even when the user turns pages. */
export function appendLayerToPage(project: Project, pageId: string, layer: Layer): Project {
  const page = project.pages.find(item => item.id === pageId);
  if (!page) throw new Error('The upload’s page was removed. Choose a page and upload the illustration again.');
  if (page.layers.length >= 300) throw new Error('This page has 300 layers. Remove a layer before adding another.');
  const updatedAt = now();
  return { ...project, updatedAt, pages: project.pages.map(item => item.id === pageId ? { ...item, layers: [...item.layers, layer], updatedAt } : item) };
}

/** Insert immediately after the active page; map/limit boundaries are no-ops. */
export function addPage(project: Project, duplicate = false): Project {
  if (project.mode === 'map' || project.pages.length >= MAX_PAGES) return project;
  const source = activePage(project);
  const reserved = new Set([project.id, ...project.pages.flatMap(page => [page.id, ...page.layers.map(layer => layer.id)])]);
  const added: Manuscript = duplicate ? {
    ...source, id: uniqueId(reserved), title: `${source.title.slice(0, 195)} copy`, updatedAt: now(),
    layers: source.layers.map(layer => ({ ...layer, id: uniqueId(reserved), ...(layer.type === 'text' ? { glyphs: { ...layer.glyphs } } : {}) })),
  } : { ...blankPageLike(source, `Page ${project.pages.length + 1}`), id: uniqueId(reserved) };
  const index = project.pages.findIndex(page => page.id === source.id);
  return { ...project, pages: [...project.pages.slice(0, index + 1), added, ...project.pages.slice(index + 1)], activePageId: added.id, updatedAt: now() };
}

/** Keep at least one page and select the next surviving page (or the previous). */
export function removePage(project: Project): Project {
  if (project.mode === 'map' || project.pages.length <= 1) return project;
  const index = project.pages.findIndex(page => page.id === activePage(project).id);
  const pages = project.pages.filter(page => page.id !== project.activePageId);
  return { ...project, pages, activePageId: pages[Math.min(index, pages.length - 1)].id, updatedAt: now() };
}

/** Move the active page one place earlier/later without changing its selection. */
export function movePage(project: Project, direction: number): Project {
  if (project.mode === 'map' || !Number.isFinite(direction) || direction === 0) return project;
  const index = project.pages.findIndex(page => page.id === activePage(project).id);
  const target = index + Math.sign(direction);
  if (target < 0 || target >= project.pages.length) return project;
  const pages = [...project.pages];
  [pages[index], pages[target]] = [pages[target], pages[index]];
  return { ...project, pages, updatedAt: now() };
}

export function downloadBookProject(project: Project): void {
  validateProject(project);
  const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  const name = project.title.replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().slice(0, 100) || 'manuscript';
  anchor.download = `${name}.manuscript.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
