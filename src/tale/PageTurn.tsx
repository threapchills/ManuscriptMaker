/** A leaf of vellum that lifts and turns over whatever was on screen. */
export default function PageTurn({ id, back }: { id: number; back: boolean }) {
  return <div key={id} className={`leaf-turn${back ? ' is-back' : ''}`} aria-hidden="true"><div className="leaf-turn-leaf"><div className="leaf-turn-front" /><div className="leaf-turn-back" /></div></div>;
}
