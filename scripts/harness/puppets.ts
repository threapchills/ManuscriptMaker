// Visual check of the traveller: every head on every tunic, every pair of
// sleeves, legs and adornment, each drawn standing as the tailor draws it.
// Open /ManuscriptMaker/scripts/harness/puppets.html; `?walk` draws a stride.
import { ASSETS } from '../../src/assets';
import { buildRig, drawAvatar } from '../../src/engine/puppet';
import type { CharacterDesignLike } from '../../src/engine/puppet';
import { loadImages } from '../../src/engine/images';

const ids = (prefix: string) => ASSETS.filter(a => a.id.startsWith(prefix)).map(a => a.id);
const srcOf = (id: string) => ASSETS.find(a => a.id === id)?.src;
const heads = ids('char-head-'), bodies = ids('char-body-'), arms = ids('char-arms-'), legs = ids('char-legs-');
const extras = ['char-crown', 'char-hood', 'char-tail-fox', 'char-tail-dragon', 'char-wings'];
const sleeveFor: Record<string, string> = { 'char-body-blue': 'char-arms-blue', 'char-body-red': 'char-arms-red', 'char-body-green': 'char-arms-green', 'char-body-brown': 'char-arms-brown', 'char-body-cream': 'char-arms-cream', 'char-body-fox': 'char-arms-fox', 'char-body-hare': 'char-arms-hare', 'char-body-cloak': 'char-arms-brown' };
const walk = location.search.includes('walk');

const design = (parts: Record<string, string>): CharacterDesignLike => ({ parts: { Head: 'char-head-human-brown', Body: 'char-body-red', Arms: 'char-arms-red', Legs: 'char-legs-boots', Extra: '', ...parts }, offsets: {} });
const sections: Array<[string, Array<[string, CharacterDesignLike]>]> = [
  ...bodies.map(b => [`${b}, its own sleeves, every head`, heads.map(h => [h.replace('char-head-', ''), design({ Head: h, Body: b, Arms: sleeveFor[b] ?? 'char-arms-red' })])] as [string, Array<[string, CharacterDesignLike]>]),
  ['every pair of sleeves on a red tunic', arms.map(a => [a.replace('char-arms-', ''), design({ Arms: a })])],
  ['every pair of legs', legs.map(l => [l.replace('char-legs-', ''), design({ Legs: l })])],
  ['every adornment, on a hare and a human', extras.flatMap(e => [[`${e.replace('char-', '')} · hare`, design({ Head: 'char-head-hare', Body: 'char-body-blue', Arms: 'char-arms-blue', Extra: e })], [`${e.replace('char-', '')} · human`, design({ Extra: e })]] as Array<[string, CharacterDesignLike]>)],
];

const images = await loadImages(ASSETS.filter(a => a.id.startsWith('char-')).map(a => a.src));
for (const [title, list] of sections) {
  const h2 = document.createElement('h2'); h2.textContent = title; document.body.append(h2);
  const row = document.createElement('div'); row.className = 'row'; document.body.append(row);
  for (const [label, d] of list) {
    const cell = document.createElement('div'); cell.className = 'cell';
    const canvas = document.createElement('canvas'); canvas.width = 150; canvas.height = 190;
    const c = canvas.getContext('2d')!;
    drawAvatar(c, buildRig(d, images, srcOf), 75, 182, 172, { time: 0, phase: walk ? Number(new URLSearchParams(location.search).get('walk') || 1.2) : 0, speed: walk ? 1 : 0, grounded: true, climbing: false, vy: 0, facing: 1, squash: 0, stretch: 0, celebrate: -1 });
    const caption = document.createElement('div'); caption.textContent = label;
    cell.append(canvas, caption); row.append(cell);
  }
}
(window as unknown as Record<string, unknown>).harnessReady = true;
