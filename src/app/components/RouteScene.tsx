import guardrailsArt from "../../assets/redline-guardrails-citadel.webp";
import treasuryArt from "../../assets/redline-treasury-core.webp";
import evidenceArt from "../../assets/redline-evidence-observatory.webp";

const SCENE_ART: Partial<Record<string, string>> = {
  marketplace: guardrailsArt,
  agents: treasuryArt,
  guardrails: guardrailsArt,
  treasury: treasuryArt,
  audit: evidenceArt,
  analytics: evidenceArt,
  settings: evidenceArt,
};

export function RouteScene({ icon: Icon, label, scene }: { icon: React.ElementType; label: string; scene: string }) {
  const artwork = SCENE_ART[scene];
  return (
    <div
      className={`route-scene ${artwork ? "route-scene-has-art" : ""}`}
      data-scene={scene}
      aria-hidden="true"
    >
      {artwork && <img className="route-scene-art" src={artwork} alt="" loading="lazy" decoding="async" />}
      {artwork && <span className="route-scene-art-wash" />}
      <span className="route-scene-orbit route-scene-orbit-a" />
      <span className="route-scene-orbit route-scene-orbit-b" />
      <span className="route-scene-axis" />
      <span className="route-scene-core"><Icon size={25} /></span>
      <span className="route-scene-cube route-scene-cube-a" />
      <span className="route-scene-cube route-scene-cube-b" />
      <span className="route-scene-cube route-scene-cube-c" />
      <span className="route-scene-label">{label} / SPATIAL LAYER</span>
    </div>
  );
}
