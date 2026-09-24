import { useEffect, useState } from 'react';
import { useFit } from './scene';
import { InkIcon } from './ornaments';
import { srcOf } from './levelWorld';
import { audio } from '../engine/audio';

const W = 1500, H = 960;

/** Gold tooling on the leather: rules, corner fleurons, a lozenge around the title. */
function Tooling() {
  // A tooled ivy fleuron: a heart leaf pointing inward and two curling tendrils along the rules.
  const fleuron = (x: number, y: number, r: number) => <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <path d="M4 4 C14 6 22 14 22 26 C22 34 16 38 11 34 C8 38 2 36 1 30 C-1 20 1 10 4 4 Z" fill="url(#tool-gold)" transform="rotate(-45 4 4) translate(0 2)" />
    <path d="M10 2 C30 2 44 4 56 10 C62 13 64 20 58 22 C54 23 52 19 55 17" fill="none" stroke="url(#tool-gold)" strokeWidth="2" strokeLinecap="round" />
    <path d="M2 10 C2 30 4 44 10 56 C13 62 20 64 22 58 C23 54 19 52 17 55" fill="none" stroke="url(#tool-gold)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="40" cy="16" r="2.4" fill="url(#tool-gold)" /><circle cx="16" cy="40" r="2.4" fill="url(#tool-gold)" /><circle cx="30" cy="30" r="3" fill="url(#tool-gold)" />
  </g>;
  return <svg className="cover-tooling" viewBox="0 0 560 760" aria-hidden="true">
    <defs>
      <linearGradient id="tool-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0bd" /><stop offset=".3" stopColor="#dcae52" /><stop offset=".6" stopColor="#9a6a1e" /><stop offset="1" stopColor="#efcd78" /></linearGradient>
    </defs>
    <rect x="22" y="22" width="516" height="716" fill="none" stroke="url(#tool-gold)" strokeWidth="2.4" />
    <rect x="31" y="31" width="498" height="698" fill="none" stroke="url(#tool-gold)" strokeWidth=".9" />
    <rect x="46" y="46" width="468" height="668" fill="none" stroke="url(#tool-gold)" strokeWidth="1.2" strokeDasharray="1.5 7" strokeLinecap="round" />
    {fleuron(40, 40, 0)}{fleuron(520, 40, 90)}{fleuron(520, 720, 180)}{fleuron(40, 720, 270)}
    <path d="M280 96 L470 380 L280 664 L90 380 Z" fill="none" stroke="url(#tool-gold)" strokeWidth="1.4" opacity=".75" />
    <path d="M280 112 L456 380 L280 648 L104 380 Z" fill="none" stroke="url(#tool-gold)" strokeWidth=".7" opacity=".6" />
    {[[280, 96], [470, 380], [280, 664], [90, 380]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" fill="url(#tool-gold)" />)}
  </svg>;
}

function Candle() {
  return <svg className="desk-candle" viewBox="0 0 120 300" aria-hidden="true">
    <defs>
      <radialGradient id="flame" cx="50%" cy="65%" r="60%"><stop offset="0" stopColor="#fffbe8" /><stop offset=".35" stopColor="#ffe28a" /><stop offset=".75" stopColor="#f39a2b" /><stop offset="1" stopColor="#c44d10" stopOpacity="0" /></radialGradient>
      <linearGradient id="wax" x1="0" x2="1"><stop offset="0" stopColor="#d8c49c" /><stop offset=".45" stopColor="#f5ead0" /><stop offset="1" stopColor="#b9a47c" /></linearGradient>
      <linearGradient id="brass" x1="0" x2="1"><stop offset="0" stopColor="#7a5418" /><stop offset=".4" stopColor="#e8c066" /><stop offset="1" stopColor="#6b4712" /></linearGradient>
    </defs>
    <g className="flame"><path d="M60 40 C48 62 50 80 60 88 C70 80 72 62 60 40 Z" fill="url(#flame)" /><path d="M60 62 C56 72 57 80 60 84 C63 80 64 72 60 62 Z" fill="#fff" opacity=".8" /></g>
    <path d="M59 86 L61 86 L61 100 L59 100 Z" fill="#2b1d14" />
    <path d="M42 100 C42 96 78 96 78 100 L78 250 L42 250 Z" fill="url(#wax)" />
    <path d="M46 100 C44 116 48 128 45 140 C43 150 49 152 49 140 C50 128 52 116 54 104 Z" fill="#fbf3dd" opacity=".9" />
    <path d="M70 100 C72 110 69 118 71 124 C73 128 75 122 75 114 L74 100 Z" fill="#fbf3dd" opacity=".85" />
    <ellipse cx="60" cy="256" rx="44" ry="10" fill="url(#brass)" />
    <path d="M22 256 C22 270 98 270 98 256 L96 262 C92 276 28 276 24 262 Z" fill="url(#brass)" />
    <path d="M98 256 C112 252 116 266 104 270" fill="none" stroke="url(#brass)" strokeWidth="5" />
  </svg>;
}

function InkwellAndQuill() {
  return <svg className="desk-inkwell" viewBox="0 0 220 300" aria-hidden="true">
    <defs>
      <linearGradient id="pot" x1="0" x2="1"><stop offset="0" stopColor="#140d09" /><stop offset=".35" stopColor="#3b2a1e" /><stop offset=".55" stopColor="#1c130d" /><stop offset="1" stopColor="#0c0806" /></linearGradient>
      <linearGradient id="vane" x1="0" x2="1"><stop offset="0" stopColor="#f6efdd" /><stop offset=".6" stopColor="#e6d8b8" /><stop offset="1" stopColor="#c9b58c" /></linearGradient>
    </defs>
    <g transform="rotate(-18 120 170)">
      <path d="M132 20 C112 60 104 110 112 190 L118 190 C122 120 132 70 150 30 C146 24 138 18 132 20 Z" fill="url(#vane)" />
      <path d="M132 22 C118 70 114 120 115 190" fill="none" stroke="#8a7650" strokeWidth="1.6" />
      {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${130 - i * 1.2} ${34 + i * 9} l${10 + (i % 3)} -8`} stroke="#b8a47c" strokeWidth=".7" />)}
    </g>
    <ellipse cx="106" cy="214" rx="54" ry="14" fill="#0c0806" opacity=".55" />
    <path d="M62 206 C58 176 68 160 106 158 C144 160 154 176 150 206 C146 226 66 226 62 206 Z" fill="url(#pot)" />
    <ellipse cx="106" cy="160" rx="30" ry="8" fill="#241811" /><ellipse cx="106" cy="160" rx="22" ry="5" fill="#050302" />
    <path d="M78 176 C80 170 88 166 96 165" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".25" />
  </svg>;
}

export default function TitleScreen({ hasTale, onBegin, onScriptorium }: { hasTale: boolean; onBegin: () => void; onScriptorium: () => void }) {
  const fit = useFit(W, H, 0);
  const [opening, setOpening] = useState(false);
  const [muted, setMuted] = useState(audio.settings.muted);
  useEffect(() => audio.subscribe(() => setMuted(audio.settings.muted)), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter' && !opening) begin(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const begin = () => {
    if (opening) return;
    audio.unlock(); audio.play('open');
    setOpening(true);
    window.setTimeout(onBegin, 1050);
  };
  return <div className="tale-screen title-screen">
    <div className="desk-light" aria-hidden="true" />
    <div className="motes" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${14 + (i % 5) * 3}s` }} />)}</div>
    <div className="title-stage" style={{ width: W * fit, height: H * fit }}>
      <div className="title-layout" style={{ transform: `scale(${fit})` }}>
        <Candle />
        <InkwellAndQuill />
        <div className="closed-book">
          <div className="book-block" aria-hidden="true" />
          <div className="first-leaf" aria-hidden="true"><span className="rubric">Incipit</span><p>Here beginneth a book in which you shall build the pages you walk.</p></div>
          <div className={`book-cover${opening ? ' is-opening' : ''}`}>
            <div className="cover-face">
              <Tooling />
              <div className="cover-title">
                <span className="cover-kicker">A playable book</span>
                <h1>Manuscript</h1>
                <span className="cover-tagline">Build the page · Walk the tale</span>
              </div>
              <div className="cover-medallion"><img src={srcOf('hare')} alt="" /></div>
              <nav className="cover-menu" aria-label="Begin">
                <button type="button" className="cover-choice is-main" onClick={begin} onPointerEnter={() => audio.play('tick')}>
                  <span>{hasTale ? 'Continue the tale' : 'Begin the tale'}</span>
                </button>
                <button type="button" className="cover-choice" onClick={() => { audio.unlock(); audio.play('page'); onScriptorium(); }} onPointerEnter={() => audio.play('tick')}>
                  <span>The scriptorium</span><small>build and play folios of your own</small>
                </button>
              </nav>
              <span className="cover-clasp cover-clasp--top" /><span className="cover-clasp cover-clasp--bottom" />
            </div>
            <div className="cover-inside" />
          </div>
        </div>
      </div>
    </div>
    <footer className="title-foot">
      <button type="button" className="quiet-button" onClick={() => { audio.unlock(); audio.set({ muted: !muted }); }} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}><InkIcon name="bell" size={18} />{muted ? 'Sound off' : 'Sound on'}</button>
      <button type="button" className="quiet-button" onClick={() => { audio.unlock(); audio.set({ music: audio.settings.music > .01 ? 0 : .55 }); }} aria-label="Music"><InkIcon name="lute" size={18} />{audio.settings.music > .01 ? 'Music on' : 'Music off'}</button>
      <span>Original illuminations · Press Enter to begin</span>
    </footer>
  </div>;
}
