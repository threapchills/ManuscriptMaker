import { audio } from './audio';

/**
 * A small generative consort: a drone like a hurdy-gurdy, a lute picking
 * through a modal progression, a recorder that sometimes sings over it, and
 * a frame drum while you play. Scheduled ahead on the audio clock.
 */
export type MusicMood = 'title' | 'build' | 'play' | 'off';

const D3 = 146.83;
const ratio = (semitones: number) => Math.pow(2, semitones / 12);
// D dorian degrees in semitones from D.
const SCALE = [0, 2, 3, 5, 7, 9, 10];
const degree = (d: number) => { const oct = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return SCALE[i] + oct * 12; };
// Chords as scale-degree roots: i – VII – i – v – III – VII – i – i
const PROGRESSION = [0, -1, 0, 4, 2, -1, 0, 0];
const PATTERNS = [[0, 2, 4, 2, 7, 4], [0, 4, 2, 4, 7, 2], [0, 2, 4, 7, 4, 2], [0, 4, 7, 4, 2, 4]];

class Music {
  private timer = 0;
  private next = 0;
  private step = 0;
  private mood: MusicMood = 'off';
  private droneNodes: Array<{ stop: () => void }> = [];
  private melody: number[] = [];
  private pattern = PATTERNS[0];

  setMood(mood: MusicMood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    if (mood === 'off') { this.stop(); return; }
    const ctx = audio.ctx;
    if (!ctx) return;
    if (!this.timer) {
      this.next = ctx.currentTime + .15;
      this.step = 0;
      this.timer = window.setInterval(() => this.schedule(), 40);
      this.startDrone();
    }
  }

  /** Call after audio unlocks so a mood chosen earlier can begin. */
  resume(): void { const m = this.mood; this.mood = 'off'; this.setMood(m === 'off' ? 'off' : m); }

  stop(): void {
    window.clearInterval(this.timer); this.timer = 0;
    this.droneNodes.forEach(n => n.stop()); this.droneNodes = [];
  }

  private startDrone(): void {
    const ctx = audio.ctx!;
    const bus = audio.musicBus;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 520; filter.Q.value = .7;
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = .09; lfoGain.gain.value = 140; lfo.connect(lfoGain).connect(filter.frequency); lfo.start();
    const gain = ctx.createGain(); gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(.05, ctx.currentTime + 3);
    filter.connect(gain).connect(bus);
    const send = ctx.createGain(); send.gain.value = .5; gain.connect(send).connect(audio.reverbSend);
    const voices = [D3 / 2, D3 / 2 * 1.5, D3].map((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = (i - 1) * 4;
      const g = ctx.createGain(); g.gain.value = i === 2 ? .35 : .5; o.connect(g).connect(filter); o.start(); return o;
    });
    this.droneNodes.push({ stop: () => { const t = ctx.currentTime; gain.gain.cancelScheduledValues(t); gain.gain.setTargetAtTime(0, t, .4); window.setTimeout(() => { voices.forEach(v => v.stop()); lfo.stop(); }, 2000); } });
  }

  private schedule(): void {
    const ctx = audio.ctx;
    if (!ctx || this.mood === 'off' || audio.settings.muted) { if (ctx) this.next = Math.max(this.next, ctx.currentTime + .1); return; }
    const tempo = this.mood === 'play' ? 96 : this.mood === 'title' ? 66 : 78; // eighth notes per minute ×2
    const eighth = 60 / tempo / 2;
    while (this.next < ctx.currentTime + .18) {
      this.playStep(this.step, this.next, eighth);
      this.next += eighth * (this.step % 2 ? .92 : 1.08); // a gentle lilt
      this.step++;
    }
  }

  private playStep(step: number, at: number, eighth: number): void {
    const bus = audio.musicBus;
    const bar = Math.floor(step / 6) % PROGRESSION.length, inBar = step % 6;
    const phrase = Math.floor(step / (6 * PROGRESSION.length));
    if (step % (6 * PROGRESSION.length) === 0) {
      this.pattern = PATTERNS[phrase % PATTERNS.length];
      this.melody = phrase % 2 ? this.compose() : [];
    }
    const root = PROGRESSION[bar];
    const tone = this.pattern[inBar];
    const d = root + tone;
    const f = D3 * ratio(degree(d));
    const accent = inBar === 0 ? 1 : inBar === 3 ? .8 : .62;
    audio.pluck(f, (this.mood === 'title' ? .085 : .075) * accent, at, { bright: .45 + Math.random() * .1, pan: (tone - 3) * .06, wet: .35, bus });
    if (inBar === 0) audio.pluck(D3 / 2 * ratio(degree(root)), .06, at, { bright: .35, wet: .3, bus });

    // The recorder: one note per beat of melody, with a breath of vibrato.
    const m = this.melody[(step % (6 * PROGRESSION.length))];
    if (m !== undefined && m !== null && !Number.isNaN(m)) this.recorder(D3 * 2 * ratio(degree(m)), at, eighth * 2.6);

    if (this.mood === 'play') {
      if (inBar === 0) {
        audio.tone({ at, freq: 92, to: 52, type: 'sine', gain: .09, decay: .22, wet: .15, bus });
        audio.noiseBurst({ at, gain: .02, decay: .08, type: 'lowpass', freq: 500, wet: .1, bus });
      } else if (inBar === 3) {
        audio.noiseBurst({ at, gain: .03, decay: .05, type: 'bandpass', freq: 2400, q: 1.4, wet: .12, bus });
      } else if (inBar === 5 && Math.random() < .5) {
        audio.noiseBurst({ at, gain: .016, decay: .04, type: 'bandpass', freq: 3200, q: 1.8, wet: .1, bus });
      }
    }
  }

  /** A modal phrase that wanders by step and comes home to D. */
  private compose(): number[] {
    const length = 6 * PROGRESSION.length;
    const notes: number[] = new Array(length).fill(NaN);
    let d = 4 + Math.floor(Math.random() * 3);
    for (let s = 0; s < length; s += (Math.random() < .3 ? 4 : 2)) {
      if (s > length - 6) { notes[s] = 7; break; }
      if (Math.random() < .18) continue; // breathe
      d += [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)];
      d = Math.max(2, Math.min(10, d));
      notes[s] = d;
    }
    return notes;
  }

  private recorder(freq: number, at: number, length: number): void {
    const ctx = audio.ctx!;
    const osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), vib = ctx.createOscillator(), vibGain = ctx.createGain();
    osc.type = 'sine'; osc2.type = 'triangle'; osc.frequency.value = freq; osc2.frequency.value = freq;
    vib.frequency.value = 5.2; vibGain.gain.value = freq * .006; vib.connect(vibGain); vibGain.connect(osc.frequency); vibGain.connect(osc2.frequency);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = freq * 3;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.045, at + .06); g.gain.setValueAtTime(.04, at + length * .7); g.gain.exponentialRampToValueAtTime(.0001, at + length);
    const g2 = ctx.createGain(); g2.gain.value = .25;
    osc.connect(filter); osc2.connect(g2).connect(filter); filter.connect(g).connect(audio.musicBus);
    const send = ctx.createGain(); send.gain.value = .45; g.connect(send).connect(audio.reverbSend);
    [osc, osc2, vib].forEach(o => { o.start(at); o.stop(at + length + .05); });
  }
}

export const music = new Music();
