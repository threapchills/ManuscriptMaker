import type { Field } from './field';
import { groundBelow } from './field';
import type { LoadedImage } from './images';
import type { Avatar } from './puppet';
import { drawAvatar } from './puppet';
import { Particles } from './particles';
import type { InputController } from './input';
import type { Collectible, Rect, World, WorldEvent } from './world';
import { advanceWorld, createWorld, drawnFeet } from './world';
import { audio } from './audio';

export interface SessionSpec {
  field: Field;
  pageWidth: number;
  pageHeight: number;
  unit: number;
  spawn: { x: number; y: number };
  hitbox: { width: number; height: number };
  /** Drawn height of the character, feet to crown. */
  avatarHeight: number;
  avatar: Avatar;
  goals: Rect[];
  collectibles?: Array<Collectible & { glyph?: string }>;
  /** Draw the character slightly into soft ground, so feet sit in grass rather than on it. */
  sink?: number;
}

export interface SessionCallbacks {
  onEvents?: (events: WorldEvent[], session: PlaySession) => void;
  onShake?: (amount: number) => void;
}

/** Everything a running playtest needs: physics, feel, particles and drawing. */
export class PlaySession {
  world: World;
  particles = new Particles();
  spec: SessionSpec;
  private phase = 0;
  private squash = 0;
  private stretch = 0;
  private time = 0;
  private alpha = 0;
  private lastFacing: 1 | -1 = 1;
  private moteClock = 0;
  private letterImages: HTMLCanvasElement[] = [];
  private collectedAt: number[] = [];

  constructor(spec: SessionSpec, private input: InputController, private callbacks: SessionCallbacks = {}) {
    this.spec = spec;
    this.world = createWorld({ field: spec.field, pageWidth: spec.pageWidth, pageHeight: spec.pageHeight, unit: spec.unit, spawn: spec.spawn, hitbox: spec.hitbox, goals: spec.goals, collectibles: spec.collectibles });
    this.letterImages = (spec.collectibles ?? []).map(item => letterMedallion(item.glyph ?? '✦', item.radius * 2.3));
  }

  restart(): void {
    this.world = createWorld({ ...this.world.spec });
    this.particles = new Particles();
    this.collectedAt = [];
    this.squash = 0; this.stretch = 0;
  }

  /** Advance by real elapsed seconds. */
  update(seconds: number): void {
    this.input.poll();
    const unit = this.spec.unit;
    const before = this.world.body.facing;
    this.alpha = advanceWorld(this.world, () => this.input.read(), seconds, events => this.handle(events));
    const dt = Math.min(.05, seconds);
    this.time += dt;
    const b = this.world.body;
    const speed = Math.min(1, Math.abs(b.vx) / Math.max(1, this.world.tuning.runSpeed));
    // The walk cycle is driven by distance so feet never skate.
    this.phase += dt * speed * 11.5;
    this.squash = Math.max(0, this.squash - dt * 5.5);
    this.stretch = Math.max(0, this.stretch - dt * 4);
    if (b.facing !== before && b.grounded && speed > .3) {
      const feet = drawnFeet(this.world, this.alpha);
      this.particles.emit('dust', feet.x, feet.y - 2, 3, .6, unit);
    }
    this.lastFacing = b.facing;
    this.moteClock += dt;
    if (this.moteClock > .12) {
      this.moteClock = 0;
      for (const goal of this.spec.goals) this.particles.emit('mote', goal.x + Math.random() * goal.width, goal.y + goal.height * (.3 + Math.random() * .7), 1, 1, unit);
    }
    this.particles.update(dt);
  }

  private handle(events: WorldEvent[]): void {
    const unit = this.spec.unit;
    const pan = (x: number) => (x / this.spec.pageWidth - .5) * 1.2;
    for (const e of events) {
      if (e.type === 'jump') {
        this.stretch = 1; this.squash = 0;
        this.particles.emit('dust', e.x, e.y - 2, 4, .5, unit);
        audio.play('jump', { pan: pan(e.x) });
      } else if (e.type === 'land') {
        const strength = e.strength ?? 0;
        this.squash = Math.min(1, .35 + strength / 1400);
        this.stretch = 0;
        this.particles.emit('dust', e.x, e.y - 2, Math.round(3 + strength / 180), 1 + strength / 1200, unit);
        audio.play('land', { strength, material: e.material, pan: pan(e.x) });
        if (strength > 950) this.callbacks.onShake?.(Math.min(8, (strength - 900) / 90));
      } else if (e.type === 'step') {
        audio.play('step', { material: e.material, pan: pan(e.x) });
        if (Math.random() < .5) this.particles.emit('dust', e.x - this.world.body.facing * 6 * unit, e.y - 1, 1, .4, unit);
      } else if (e.type === 'bonk') {
        audio.play('bonk', { pan: pan(e.x) });
      } else if (e.type === 'collect') {
        this.collectedAt[e.index ?? 0] = this.time;
        this.particles.emit('spark', e.x, e.y, 22, 1.2, unit);
        audio.play('collect', { pan: pan(e.x) });
      } else if (e.type === 'win') {
        this.particles.emit('spark', e.x, e.y - this.spec.avatarHeight * .6, 44, 1.8, unit);
        this.particles.emit('petal', e.x, e.y - this.spec.avatarHeight * .8, 26, 1.4, unit);
        audio.play('win');
      } else if (e.type === 'death') {
        if (e.cause === 'hazard') { this.particles.emit('splash', e.x, e.y - 20 * unit, 26, 1, unit); audio.play('splash', { pan: pan(e.x) }); }
        else { this.particles.emit('ink', e.x, Math.min(e.y, this.spec.pageHeight - 4), 26, 1, unit); audio.play('fall', { pan: pan(e.x) }); }
        this.callbacks.onShake?.(5);
      } else if (e.type === 'respawn') {
        this.particles.emit('spark', e.x, e.y - this.spec.avatarHeight * .5, 14, .7, unit);
        audio.play('respawn', { pan: pan(e.x) });
      }
    }
    this.callbacks.onEvents?.(events, this);
  }

  /** Show exactly what the traveller can stand on, in gold ink. */
  lens = false;
  private lensImage: HTMLCanvasElement | null = null;
  private drawLens(context: CanvasRenderingContext2D): void {
    const f = this.spec.field;
    if (!this.lensImage) {
      const canvas = document.createElement('canvas');
      canvas.width = f.width; canvas.height = f.height;
      const c = canvas.getContext('2d');
      if (!c) return;
      const image = c.createImageData(f.width, f.height), d = image.data;
      for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
        const i = y * f.width + x, o = i * 4;
        const edge = (m: Uint8Array) => m[i] && (y === 0 || !m[i - f.width] || x === 0 || !m[i - 1] || x === f.width - 1 || !m[i + 1]);
        if (f.solid[i]) { const e = edge(f.solid); d[o] = 226; d[o + 1] = 170; d[o + 2] = 60; d[o + 3] = e ? 255 : 70; }
        else if (f.platform[i]) { const e = edge(f.platform); d[o] = 70; d[o + 1] = 130; d[o + 2] = 210; d[o + 3] = e ? 255 : 80; }
        else if (f.hazard[i]) { d[o] = 200; d[o + 1] = 40; d[o + 2] = 40; d[o + 3] = 110; }
        else if (f.ladder[i]) { d[o] = 80; d[o + 1] = 170; d[o + 2] = 90; d[o + 3] = 90; }
      }
      c.putImageData(image, 0, 0);
      this.lensImage = canvas;
    }
    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(this.lensImage, 0, 0, f.width * f.cell, f.height * f.cell);
    const r = { x: this.world.body.x * f.cell, y: this.world.body.y * f.cell, w: this.world.body.w * f.cell, h: this.world.body.h * f.cell };
    context.strokeStyle = 'rgba(180, 30, 30, .9)'; context.lineWidth = 1.5;
    context.strokeRect(r.x, r.y, r.w, r.h);
    context.restore();
  }

  /** Draw the moving parts of the page. The context is already in page units. */
  draw(context: CanvasRenderingContext2D): void {
    const { world, spec } = this;
    const unit = spec.unit;
    const feet = drawnFeet(world, this.alpha);
    const b = world.body;
    if (this.lens) this.drawLens(context);

    // Goals glow like gold leaf catching candlelight.
    for (const goal of spec.goals) {
      const cx = goal.x + goal.width / 2, cy = goal.y + goal.height * .45;
      const pulse = .55 + Math.sin(this.time * 2.4) * .15 + (world.phase === 'won' ? .5 : 0);
      const r = Math.max(goal.width, goal.height) * (.85 + pulse * .25);
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, r);
      glow.addColorStop(0, `rgba(255, 226, 140, ${.34 * pulse})`);
      glow.addColorStop(.5, `rgba(240, 190, 90, ${.14 * pulse})`);
      glow.addColorStop(1, 'rgba(240, 190, 90, 0)');
      context.save(); context.globalCompositeOperation = 'lighter'; context.fillStyle = glow;
      context.fillRect(cx - r, cy - r, r * 2, r * 2); context.restore();
    }

    // Gilded letters to gather.
    (spec.collectibles ?? []).forEach((item, index) => {
      const image = this.letterImages[index];
      const taken = world.collected[index];
      const since = taken ? this.time - (this.collectedAt[index] ?? -10) : -1;
      if (taken && since > .5) return;
      const bob = Math.sin(this.time * 2.2 + index) * 5 * unit;
      const spin = Math.sin(this.time * 1.6 + index * 2) * .12;
      const scale = taken ? 1 + since * 2.2 : 1;
      const alpha = taken ? Math.max(0, 1 - since * 2) : 1;
      context.save();
      context.globalAlpha = alpha;
      context.translate(item.x, item.y + bob - (taken ? since * 60 * unit : 0));
      context.rotate(spin); context.scale(scale * Math.cos(this.time * 1.1 + index) * .15 + scale * .85, scale);
      context.drawImage(image, -image.width / 2, -image.height / 2);
      context.restore();
    });

    // A soft contact shadow tells you exactly where you'll land.
    const ground = groundBelow(spec.field, feet.x / spec.field.cell, Math.max(0, (feet.y - 2) / spec.field.cell));
    if (ground !== undefined && world.phase !== 'dying') {
      const gy = ground * spec.field.cell;
      const height = Math.max(0, gy - feet.y);
      const k = Math.max(0, 1 - height / (260 * unit));
      if (k > 0) {
        context.save();
        context.globalAlpha = .28 * k;
        context.fillStyle = '#2b2118';
        context.beginPath();
        context.ellipse(feet.x, gy + 1, spec.hitbox.width * (.75 + .35 * k), 5.5 * unit * (.6 + .4 * k), 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }

    // The traveller.
    let alpha = 1, extraScale = 1;
    if (world.phase === 'dying') { alpha = Math.max(0, 1 - world.phaseTime / .22); extraScale = 1 + world.phaseTime * .6; }
    if (world.phase === 'respawning') { const t = Math.min(1, world.phaseTime / .26); alpha = t; extraScale = .6 + .4 * easeOutBack(t); }
    if (alpha > 0) {
      const celebrate = world.phase === 'won' ? world.phaseTime : -1;
      context.save();
      context.translate(feet.x, feet.y + (spec.sink ?? 3 * unit));
      context.scale(extraScale, extraScale);
      drawAvatar(context, spec.avatar, 0, 0, spec.avatarHeight, {
        time: this.time, phase: this.phase, speed: Math.min(1, Math.abs(b.vx) / Math.max(1, world.tuning.runSpeed)),
        grounded: b.grounded, climbing: b.climbing, vy: b.vy * spec.field.cell / unit, facing: b.facing,
        squash: easeOut(this.squash), stretch: b.grounded ? 0 : easeOut(this.stretch), celebrate,
      }, alpha);
      context.restore();
    }

    this.particles.draw(context);
  }
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutBack = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

/** A small gilded roundel carrying a letter, painted once. */
export function letterMedallion(glyph: string, size: number): HTMLCanvasElement {
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const canvas = document.createElement('canvas');
  const s = Math.ceil(size * dpr * 1.2);
  canvas.width = s; canvas.height = s;
  const c = canvas.getContext('2d');
  if (!c) return canvas;
  c.scale(dpr, dpr);
  const r = size / 2, m = size * .6;
  const gold = c.createLinearGradient(m - r, m - r, m + r, m + r);
  gold.addColorStop(0, '#fff3c4'); gold.addColorStop(.35, '#e9bf57'); gold.addColorStop(.6, '#b98424'); gold.addColorStop(1, '#f4d27a');
  c.shadowColor = 'rgba(60,35,10,.45)'; c.shadowBlur = size * .12; c.shadowOffsetY = size * .05;
  c.fillStyle = gold; c.beginPath(); c.arc(m, m, r, 0, Math.PI * 2); c.fill();
  c.shadowColor = 'transparent';
  c.lineWidth = Math.max(1, size * .05); c.strokeStyle = '#7a4a14'; c.stroke();
  c.fillStyle = '#b3261e'; c.beginPath(); c.arc(m, m, r * .74, 0, Math.PI * 2); c.fill();
  c.lineWidth = Math.max(1, size * .03); c.strokeStyle = '#f1d27f'; c.stroke();
  c.fillStyle = '#fff1c0';
  c.font = `${Math.round(size * .62)}px "UnifrakturMaguntia", "Grenze Gotisch", serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(glyph, m, m + size * .04);
  return canvas;
}

export type { LoadedImage };
