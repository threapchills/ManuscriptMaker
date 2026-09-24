/** Small, cheap particles in ink, dust and gold. Page units throughout. */
export type ParticleKind = 'dust' | 'spark' | 'ink' | 'mote' | 'petal' | 'splash';

export interface Particle {
  kind: ParticleKind;
  x: number; y: number; vx: number; vy: number;
  life: number; age: number;
  size: number; spin: number; angle: number;
  color: string;
  gravity: number;
  drag: number;
}

const DUST = ['#c8b48a', '#b89f74', '#d9c9a3', '#a68d63'];
const GOLD = ['#f6d67a', '#e7b64a', '#fff1bd', '#d49b2c'];
const INK = ['#2b2118', '#3b2a1d', '#1c1511'];
const PETAL = ['#d6604a', '#f2e6d0', '#e9b44c', '#8f6bb5'];
const WATER = ['#7fb3d9', '#a9cfe8', '#dff0fa', '#5e93c2'];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const range = (a: number, b: number) => a + Math.random() * (b - a);

export class Particles {
  items: Particle[] = [];
  private max = 420;

  emit(kind: ParticleKind, x: number, y: number, count: number, spread = 1, unit = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= this.max) this.items.shift();
      const p: Particle = { kind, x, y, vx: 0, vy: 0, life: 1, age: 0, size: 4, spin: 0, angle: Math.random() * 6.28, color: '#000', gravity: 0, drag: 2 };
      if (kind === 'dust') {
        const dir = Math.random() < .5 ? -1 : 1;
        p.vx = dir * range(20, 120) * spread * unit; p.vy = -range(10, 70) * unit; p.life = range(.35, .7);
        p.size = range(4, 10) * unit; p.color = pick(DUST); p.gravity = -20 * unit; p.drag = 5;
      } else if (kind === 'spark') {
        const a = Math.random() * Math.PI * 2, v = range(40, 220) * spread * unit;
        p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 40 * unit; p.life = range(.5, 1.1);
        p.size = range(3, 7) * unit; p.color = pick(GOLD); p.gravity = 90 * unit; p.drag = 2.4; p.spin = range(-6, 6);
      } else if (kind === 'ink') {
        const a = -Math.PI / 2 + range(-1.3, 1.3), v = range(120, 420) * spread * unit;
        p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.life = range(.5, 1);
        p.size = range(3, 9) * unit; p.color = pick(INK); p.gravity = 1400 * unit; p.drag = .6;
      } else if (kind === 'splash') {
        const a = -Math.PI / 2 + range(-.9, .9), v = range(150, 460) * spread * unit;
        p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.life = range(.4, .9);
        p.size = range(3, 7) * unit; p.color = pick(WATER); p.gravity = 1500 * unit; p.drag = .5;
      } else if (kind === 'mote') {
        p.vx = range(-8, 8) * unit; p.vy = -range(8, 30) * unit; p.life = range(1.4, 2.6);
        p.size = range(1.5, 3.5) * unit; p.color = pick(GOLD); p.gravity = 0; p.drag = 0;
      } else if (kind === 'petal') {
        p.vx = range(-60, 60) * spread * unit; p.vy = -range(60, 180) * unit; p.life = range(1, 1.8);
        p.size = range(4, 7) * unit; p.color = pick(PETAL); p.gravity = 160 * unit; p.drag = 1.8; p.spin = range(-8, 8);
      }
      this.items.push(p);
    }
  }

  update(dt: number): void {
    for (const p of this.items) {
      p.age += dt;
      const damping = Math.exp(-p.drag * dt);
      p.vx *= damping; p.vy = p.vy * damping + p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.angle += p.spin * dt;
    }
    this.items = this.items.filter(p => p.age < p.life);
  }

  draw(context: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const t = p.age / p.life, fade = 1 - t;
      context.save();
      context.translate(p.x, p.y);
      if (p.kind === 'dust') {
        context.globalAlpha = .45 * fade;
        context.fillStyle = p.color;
        context.beginPath(); context.arc(0, 0, p.size * (.6 + t * 1.2), 0, Math.PI * 2); context.fill();
      } else if (p.kind === 'spark' || p.kind === 'mote') {
        context.globalAlpha = (p.kind === 'mote' ? Math.sin(t * Math.PI) * .9 : fade) * .95;
        context.globalCompositeOperation = 'lighter';
        context.rotate(p.angle);
        context.fillStyle = p.color;
        const r = p.size * (p.kind === 'spark' ? 1 - t * .5 : 1);
        context.beginPath();
        context.moveTo(0, -r * 1.8); context.lineTo(r * .35, -r * .35); context.lineTo(r * 1.8, 0); context.lineTo(r * .35, r * .35);
        context.lineTo(0, r * 1.8); context.lineTo(-r * .35, r * .35); context.lineTo(-r * 1.8, 0); context.lineTo(-r * .35, -r * .35);
        context.closePath(); context.fill();
      } else if (p.kind === 'ink' || p.kind === 'splash') {
        context.globalAlpha = Math.min(1, fade * 1.6) * (p.kind === 'ink' ? .9 : .8);
        context.fillStyle = p.color;
        const stretch = Math.min(2.4, 1 + Math.hypot(p.vx, p.vy) / 500);
        context.rotate(Math.atan2(p.vy, p.vx));
        context.beginPath(); context.ellipse(0, 0, p.size * stretch, p.size, 0, 0, Math.PI * 2); context.fill();
      } else if (p.kind === 'petal') {
        context.globalAlpha = Math.min(1, fade * 2);
        context.rotate(p.angle);
        context.fillStyle = p.color;
        context.beginPath(); context.ellipse(0, 0, p.size, p.size * .45, 0, 0, Math.PI * 2); context.fill();
      }
      context.restore();
    }
  }
}
