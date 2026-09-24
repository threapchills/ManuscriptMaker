import type { ImageLayer, Manuscript } from './types';

export interface GameInput { left: boolean; right: boolean; jump: boolean }
export interface GameState { x: number; y: number; vy: number; grounded: boolean; won: boolean; falls: number }

type Box = Pick<ImageLayer, 'x' | 'y' | 'width' | 'height'>;
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const active = (page: Manuscript, role: ImageLayer['gameRole']) => page.layers.filter((layer): layer is ImageLayer => layer.type === 'image' && !layer.hidden && layer.gameRole === role);

export function playSetup(page: Manuscript): { player?: ImageLayer; goals: ImageLayer[]; message?: string } {
  const player = active(page, 'player')[0];
  const goals = active(page, 'goal');
  return { player, goals, message: !player ? 'Choose an illustration and set its play role to Character.' : !goals.length ? 'Choose an illustration and set its play role to Goal.' : undefined };
}

export function startGame(page: Manuscript): GameState | null {
  const { player } = playSetup(page);
  return player ? { x: player.x, y: player.y, vy: 0, grounded: false, won: false, falls: 0 } : null;
}

/** Simple, deterministic page-coordinate movement. Artwork remains untouched. */
export function stepGame(page: Manuscript, current: GameState, input: GameInput, seconds: number): GameState {
  const player = playSetup(page).player;
  if (!player || current.won) return current;
  const dt = Math.max(0, Math.min(seconds, 1 / 30));
  const unit = Math.max(.5, Math.min(2, page.height / 720));
  const solids = active(page, 'solid');
  const platforms = active(page, 'platform');
  const speed = 270 * unit;
  const dx = (Number(input.right) - Number(input.left)) * speed * dt;
  let x = Math.max(0, Math.min(page.width - player.width, current.x + dx));
  const playerAt = (px: number, py: number): Box => ({ x: px, y: py, width: player.width, height: player.height });
  for (const wall of solids) {
    if (overlap(playerAt(x, current.y), wall)) x = dx > 0 ? Math.min(x, wall.x - player.width) : dx < 0 ? Math.max(x, wall.x + wall.width) : x;
  }

  let vy = input.jump && current.grounded ? -510 * unit : current.vy;
  vy = Math.min(900 * unit, vy + 1260 * unit * dt);
  const previousBottom = current.y + player.height;
  let y = current.y + vy * dt;
  let grounded = false;
  for (const surface of [...solids, ...platforms]) {
    const horizontal = x < surface.x + surface.width && x + player.width > surface.x;
    if (!horizontal) continue;
    if (vy >= 0 && previousBottom <= surface.y + 1 && y + player.height >= surface.y) {
      y = Math.min(y, surface.y - player.height);
      vy = 0;
      grounded = true;
    } else if (surface.gameRole === 'solid' && vy < 0 && current.y >= surface.y + surface.height - 1 && y <= surface.y + surface.height) {
      y = surface.y + surface.height;
      vy = 0;
    }
  }
  if (y > page.height + player.height) return { x: player.x, y: player.y, vy: 0, grounded: false, won: false, falls: current.falls + 1 };
  const won = active(page, 'goal').some(goal => overlap(playerAt(x, y), goal));
  return { x, y, vy, grounded, won, falls: current.falls };
}
