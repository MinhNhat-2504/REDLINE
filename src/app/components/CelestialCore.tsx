import { useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { ShieldCheck } from "lucide-react";

/** CSS perspective keeps the scene usable without WebGL or a large 3D runtime. */
export function CelestialCore() {
  const scene = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  return (
    <div className="celestial-scene" ref={scene} aria-hidden="true"
      onPointerMove={event => {
        if (reduced || event.pointerType === "touch") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        scene.current?.style.setProperty("--tilt-x", `${-(event.clientY - bounds.top - bounds.height / 2) / 30}deg`);
        scene.current?.style.setProperty("--tilt-y", `${(event.clientX - bounds.left - bounds.width / 2) / 30}deg`);
      }}
      onPointerLeave={() => {
        scene.current?.style.setProperty("--tilt-x", "0deg");
        scene.current?.style.setProperty("--tilt-y", "0deg");
      }}>
      <div className="celestial-halo" />
      <div className="celestial-system">
        {[0, 1, 2].map(index => <div key={index} className={`celestial-orbit orbit-${index}`}><i /><b /></div>)}
        <div className="celestial-crystal">
          {[0, 1, 2, 3].map(index => <i key={index} className="crystal-face" style={{ "--face": index } as CSSProperties} />)}
          <div className="crystal-heart"><ShieldCheck size={45} strokeWidth={1} /></div>
        </div>
        {Array.from({ length: 7 }, (_, index) => <span key={index} className="celestial-satellite" style={{ "--satellite": index } as CSSProperties} />)}
      </div>
      <div className="celestial-caption"><span>R / 07</span><i />THE SENTINEL CORE</div>
      <span className="celestial-coordinate">23° 07′ N · BOUNDARY SYSTEM</span>
    </div>
  );
}
