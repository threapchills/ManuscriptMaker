import type { Material } from './field';

/**
 * Every sound is synthesised in the browser: plucked strings by
 * Karplus–Strong, bells by FM, footsteps from shaped noise. Nothing to
 * download, and nothing plays until the player has touched the page.
 */
export type Sfx =
  | 'jump' | 'land' | 'step' | 'bonk' | 'fall' | 'splash' | 'respawn' | 'win' | 'collect'
  | 'tick' | 'press' | 'page' | 'place' | 'lift' | 'drop' | 'rotate' | 'deny' | 'seal' | 'open';

export interface AudioSettings { sfx: number; music: number; muted: boolean }
const SETTINGS_KEY = 'manuscript-maker:audio-v1';

export function readAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) { const v = JSON.parse(raw) as Partial<AudioSettings>; return { sfx: clamp01(v.sfx ?? .8), music: clamp01(v.music ?? .55), muted: !!v.muted }; }
  } catch { /* Preferences are optional. */ }
  return { sfx: .8, music: .55, muted: false };
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

type Ctx = AudioContext;

class AudioEngine {
  ctx: Ctx | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  musicBus!: GainNode;
  private reverb!: ConvolverNode;
  reverbSend!: GainNode;
  private noise!: AudioBuffer;
  private plucks = new Map<string, AudioBuffer>();
  settings: AudioSettings = readAudioSettings();
  private listeners = new Set<() => void>();
  private stepSide = 1;

  /** Create (or resume) the context from a user gesture. Safe to call often. */
  unlock(): Ctx | null {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) {
      try {
        const ctx = new AC({ latencyHint: 'interactive' });
        this.ctx = ctx;
        this.master = ctx.createGain();
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -10; limiter.knee.value = 8; limiter.ratio.value = 6; limiter.attack.value = .003; limiter.release.value = .2;
        this.master.connect(limiter).connect(ctx.destination);
        this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
        this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
        this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(2.4, 2.8);
        this.reverbSend = ctx.createGain(); this.reverbSend.gain.value = .9;
        this.reverbSend.connect(this.reverb).connect(this.master);
        this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.apply();
      } catch { this.ctx = null; return null; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }

  get ready(): boolean { return !!this.ctx && this.ctx.state === 'running'; }

  set(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* optional */ }
    this.apply();
    this.listeners.forEach(listener => listener());
  }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }

  private apply(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 1, now, .05);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx * .9, now, .05);
    this.musicBus.gain.setTargetAtTime(this.settings.music * .7, now, .2);
  }

  private impulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!, length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay) * (i < ctx.sampleRate * .012 ? i / (ctx.sampleRate * .012) : 1);
    }
    return buffer;
  }

  /** A plucked string, cached per pitch and brightness. */
  pluckBuffer(freq: number, bright = .5, seconds = 2.2): AudioBuffer {
    const ctx = this.ctx!;
    const key = `${Math.round(freq * 10)}:${bright}`;
    const hit = this.plucks.get(key);
    if (hit) return hit;
    const rate = ctx.sampleRate, length = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, length, rate);
    const out = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(rate / freq));
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = (Math.random() * 2 - 1) * (.6 + .4 * Math.sin(i / period * Math.PI));
    // Soften the excitation: gut strings, not steel.
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < period; i++) ring[i] = ring[i] * bright + ring[i - 1] * (1 - bright);
    let index = 0;
    const damping = .996 - Math.max(0, freq - 200) / 60000;
    for (let i = 0; i < length; i++) {
      const next = (index + 1) % period;
      const value = ring[index];
      out[i] = value;
      ring[index] = (value + ring[next]) * .5 * damping;
      index = next;
    }
    // Body resonance and a gentle fade so the tail never clicks.
    for (let i = 0; i < length; i++) out[i] *= Math.min(1, (length - i) / (rate * .08));
    this.plucks.set(key, buffer);
    return buffer;
  }

  // ——— building blocks ———
  private out(gain: number, pan = 0, wet = .12, bus?: AudioNode): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain(); g.gain.value = gain;
    let node: AudioNode = g;
    if (ctx.createStereoPanner && pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    node.connect(bus ?? this.sfxBus);
    if (wet > 0) { const send = ctx.createGain(); send.gain.value = wet; node.connect(send).connect(this.reverbSend); }
    return g;
  }

  noiseBurst(o: { at?: number; gain: number; attack?: number; decay: number; type?: BiquadFilterType; freq: number; q?: number; sweepTo?: number; pan?: number; wet?: number }): void {
    const ctx = this.ctx!, t = (o.at ?? ctx.currentTime);
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = o.type ?? 'bandpass'; filter.frequency.setValueAtTime(o.freq, t); filter.Q.value = o.q ?? 1;
    if (o.sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.sweepTo), t + (o.attack ?? .002) + o.decay);
    const env = this.out(0, o.pan, o.wet ?? .1);
    const a = o.attack ?? .002;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(o.gain, t + a);
    env.gain.exponentialRampToValueAtTime(.0001, t + a + o.decay);
    src.connect(filter).connect(env);
    src.start(t, Math.random() * .9); src.stop(t + a + o.decay + .05);
  }

  tone(o: { at?: number; freq: number; to?: number; type?: OscillatorType; gain: number; attack?: number; decay: number; pan?: number; wet?: number; glide?: number; bus?: AudioNode }): void {
    const ctx = this.ctx!, t = o.at ?? ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.glide ?? o.decay));
    const env = this.out(0, o.pan, o.wet ?? .1, o.bus);
    const a = o.attack ?? .004;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(o.gain, t + a);
    env.gain.exponentialRampToValueAtTime(.0001, t + a + o.decay);
    osc.connect(env); osc.start(t); osc.stop(t + a + o.decay + .05);
  }

  bell(freq: number, gain: number, at?: number, decay = 1.6, wet = .35, bus?: AudioNode): void {
    const ctx = this.ctx!, t = at ?? ctx.currentTime;
    const carrier = ctx.createOscillator(), mod = ctx.createOscillator(), modGain = ctx.createGain();
    carrier.frequency.value = freq; mod.frequency.value = freq * 3.5;
    modGain.gain.setValueAtTime(freq * 2.2, t); modGain.gain.exponentialRampToValueAtTime(freq * .05, t + decay * .6);
    mod.connect(modGain).connect(carrier.frequency);
    const env = this.out(0, 0, wet, bus);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(gain, t + .003); env.gain.exponentialRampToValueAtTime(.0001, t + decay);
    carrier.connect(env);
    carrier.start(t); mod.start(t); carrier.stop(t + decay + .05); mod.stop(t + decay + .05);
  }

  pluck(freq: number, gain: number, at?: number, o: { bright?: number; pan?: number; wet?: number; bus?: AudioNode; rate?: number } = {}): void {
    const ctx = this.ctx!, t = at ?? ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.pluckBuffer(freq, o.bright ?? .5);
    if (o.rate) src.playbackRate.value = o.rate;
    const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 420; body.gain.value = 4; body.Q.value = .9;
    const env = this.out(gain, o.pan, o.wet ?? .22, o.bus);
    src.connect(body).connect(env); src.start(t); src.stop(t + 2.3);
  }

  // ——— the sound palette ———
  play(name: Sfx, o: { strength?: number; material?: Material; pan?: number } = {}): void {
    if (!this.ctx || this.settings.muted || this.ctx.state !== 'running') return;
    const ctx = this.ctx, now = ctx.currentTime;
    const vary = (n: number, amount = .07) => n * (1 + (Math.random() * 2 - 1) * amount);
    const pan = Math.max(-1, Math.min(1, o.pan ?? 0));
    switch (name) {
      case 'step': {
        this.stepSide *= -1;
        const side = pan + this.stepSide * .06;
        this.footstep(o.material ?? 'earth', .55, side);
        break;
      }
      case 'land': {
        const s = Math.max(0, Math.min(1, ((o.strength ?? 600) - 250) / 900));
        this.tone({ freq: vary(150), to: 48, type: 'sine', gain: .12 + s * .3, decay: .14 + s * .08, pan, wet: .05 });
        this.footstep(o.material ?? 'earth', .7 + s * .9, pan);
        if (s > .45) this.noiseBurst({ gain: .05 + s * .08, decay: .2, type: 'lowpass', freq: 700, pan, wet: .15 });
        break;
      }
      case 'jump':
        this.tone({ freq: vary(210), to: vary(560), type: 'triangle', gain: .07, decay: .1, glide: .08, pan, wet: .05 });
        this.noiseBurst({ gain: .045, attack: .02, decay: .11, type: 'highpass', freq: 2400, pan, wet: .05 });
        break;
      case 'bonk':
        this.tone({ freq: vary(240), to: 140, type: 'triangle', gain: .12, decay: .09, pan });
        this.noiseBurst({ gain: .05, decay: .04, freq: 1600, q: 2, pan });
        break;
      case 'fall':
        this.tone({ freq: 620, to: 140, type: 'sine', gain: .06, attack: .02, decay: .42, pan, wet: .3 });
        this.noiseBurst({ at: now + .28, gain: .16, decay: .32, type: 'lowpass', freq: 1400, sweepTo: 180, pan, wet: .2 });
        this.tone({ at: now + .3, freq: 320, to: 70, type: 'sine', gain: .14, decay: .2, pan });
        break;
      case 'splash':
        this.noiseBurst({ gain: .2, attack: .005, decay: .5, freq: 1300, q: .6, sweepTo: 420, pan, wet: .3 });
        for (let i = 0; i < 5; i++) this.tone({ at: now + .05 + i * .06 + Math.random() * .05, freq: vary(520 + i * 90, .2), to: vary(1300, .2), type: 'sine', gain: .035, decay: .05, pan, wet: .3 });
        break;
      case 'respawn':
        [0, 1, 2].forEach(i => this.pluck([392, 494, 587][i], .16, now + i * .07, { bright: .6, pan }));
        this.bell(1174, .025, now + .2, 1.1, .5);
        break;
      case 'collect':
        this.bell(vary(1318, .01), .09, now, 1.4, .4);
        this.bell(1976, .035, now + .06, 1.1, .5);
        this.pluck(1318, .12, now, { bright: .75, pan });
        break;
      case 'win': {
        const notes = [293.7, 440, 587.3, 740, 880];
        notes.forEach((f, i) => this.pluck(f, .2, now + i * .1, { bright: .6, pan: (i - 2) * .15 }));
        this.pluck(146.8, .22, now, { bright: .4 });
        this.bell(1174.7, .06, now + .5, 2.4, .6);
        this.bell(1760, .03, now + .56, 2, .6);
        this.noiseBurst({ at: now + .45, gain: .03, attack: .3, decay: .9, type: 'highpass', freq: 5000, wet: .6 });
        break;
      }
      case 'seal':
        this.tone({ freq: 110, to: 60, type: 'sine', gain: .22, decay: .16, wet: .1 });
        this.noiseBurst({ gain: .1, decay: .06, type: 'lowpass', freq: 900, wet: .1 });
        this.bell(880, .03, now + .02, .8, .4);
        break;
      case 'tick':
        this.noiseBurst({ gain: .025, decay: .014, type: 'highpass', freq: 4200, wet: 0 });
        break;
      case 'press':
        this.tone({ freq: 190, to: 90, type: 'sine', gain: .12, decay: .08, wet: .08 });
        this.noiseBurst({ gain: .05, decay: .025, type: 'bandpass', freq: 2200, q: 1.5, wet: .05 });
        break;
      case 'deny':
        this.tone({ freq: 200, to: 150, type: 'triangle', gain: .08, decay: .12 });
        this.tone({ at: now + .09, freq: 160, to: 120, type: 'triangle', gain: .07, decay: .14 });
        break;
      case 'page':
        this.noiseBurst({ gain: .1, attack: .12, decay: .3, type: 'bandpass', freq: 700, q: .7, sweepTo: 3200, wet: .2 });
        this.noiseBurst({ at: now + .34, gain: .07, decay: .08, type: 'lowpass', freq: 1800, wet: .15 });
        break;
      case 'open':
        this.tone({ freq: 70, to: 52, type: 'sawtooth', gain: .02, attack: .15, decay: .6, wet: .2 });
        this.noiseBurst({ gain: .06, attack: .25, decay: .5, type: 'bandpass', freq: 420, q: 1.2, sweepTo: 900, wet: .3 });
        this.noiseBurst({ at: now + .55, gain: .09, decay: .12, type: 'lowpass', freq: 1100, wet: .2 });
        break;
      case 'lift':
        this.noiseBurst({ gain: .05, attack: .01, decay: .07, type: 'bandpass', freq: 3200, q: .8, wet: .05, pan });
        break;
      case 'place':
        this.tone({ freq: vary(230), to: 150, type: 'triangle', gain: .11, decay: .08, pan, wet: .08 });
        this.noiseBurst({ gain: .07, decay: .05, type: 'lowpass', freq: 1500, pan, wet: .08 });
        break;
      case 'drop':
        this.noiseBurst({ gain: .06, attack: .005, decay: .12, type: 'bandpass', freq: 2400, q: .6, sweepTo: 800, pan, wet: .1 });
        break;
      case 'rotate':
        this.noiseBurst({ gain: .03, decay: .03, type: 'bandpass', freq: 2800, q: 3, pan, wet: 0 });
        break;
    }
  }

  private footstep(material: Material, weight: number, pan: number): void {
    const vary = (n: number, amount = .08) => n * (1 + (Math.random() * 2 - 1) * amount);
    const g = weight;
    switch (material) {
      case 'grass':
        this.noiseBurst({ gain: .07 * g, attack: .004, decay: .07, freq: vary(3200), q: .7, pan, wet: .02 });
        this.tone({ freq: vary(95), to: 60, gain: .05 * g, decay: .05, pan, wet: 0 });
        break;
      case 'wood':
        this.tone({ freq: vary(330), to: vary(260), type: 'triangle', gain: .09 * g, decay: .06, pan, wet: .06 });
        this.tone({ freq: vary(820), type: 'sine', gain: .025 * g, decay: .03, pan, wet: .05 });
        this.noiseBurst({ gain: .03 * g, decay: .02, freq: 1800, q: 1.4, pan, wet: 0 });
        break;
      case 'stone':
        this.noiseBurst({ gain: .06 * g, decay: .03, type: 'highpass', freq: vary(2800), pan, wet: .12 });
        this.tone({ freq: vary(170), to: 110, gain: .05 * g, decay: .04, pan, wet: .05 });
        break;
      case 'hay':
        this.noiseBurst({ gain: .06 * g, attack: .01, decay: .12, freq: vary(1700), q: .5, pan, wet: .02 });
        break;
      case 'leaves':
        this.noiseBurst({ gain: .06 * g, attack: .008, decay: .1, freq: vary(3800), q: .6, pan, wet: .02 });
        break;
      case 'water':
        this.noiseBurst({ gain: .08 * g, decay: .12, freq: vary(1100), q: .8, pan, wet: .2 });
        break;
      default:
        this.noiseBurst({ gain: .06 * g, decay: .06, type: 'lowpass', freq: vary(900), pan, wet: .02 });
        this.tone({ freq: vary(90), to: 55, gain: .06 * g, decay: .05, pan, wet: 0 });
    }
  }
}

export const audio = new AudioEngine();

/** Unlock audio on the first touch, click or key anywhere. */
export function installAudioUnlock(): () => void {
  const unlock = () => { audio.unlock(); };
  const events = ['pointerdown', 'keydown', 'touchstart'] as const;
  events.forEach(e => window.addEventListener(e, unlock, { passive: true }));
  return () => events.forEach(e => window.removeEventListener(e, unlock));
}
