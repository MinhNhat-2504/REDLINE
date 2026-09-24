import { useState } from "react";
import type { ReactNode } from "react";

// A card with two faces that flips 180° on click (or Enter/Space). Used for
// the agent identity card: the front is the agent, the back is how its hash
// is built. Purely presentational — both faces stay in the DOM.
export function FlipCard({ front, back, hint, className = "" }: { front: ReactNode; back: ReactNode; hint?: string; className?: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className={`flip-stage ${className}`.trim()}>
      <div className="flip-card" data-flip={flipped} role="button" tabIndex={0} aria-pressed={flipped}
        onClick={() => setFlipped(f => !f)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(f => !f); } }}>
        <div className="face front">{front}{hint && <span className="flip-hint">{hint}</span>}</div>
        <div className="face back">{back}<span className="flip-hint">↺ click to flip back</span></div>
      </div>
    </div>
  );
}
