import { useEffect, useRef } from "react";

type Point = { x: number; y: number; z: number; speed: number; phase: number; tone: 0 | 1 };

export function SpatialBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let points: Point[] = [];
    let pointerX = 0;
    let pointerY = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(72, Math.max(28, Math.floor((width * height) / 24_000)));
      points = Array.from({ length: count }, (_, index) => ({
        x: (Math.random() - 0.5) * width * 1.4,
        y: (Math.random() - 0.5) * height * 1.4,
        z: 180 + Math.random() * 900,
        speed: 0.12 + Math.random() * 0.34,
        phase: index * 0.73,
        tone: index % 4 === 0 ? 1 : 0,
      }));
    };

    const move = (event: PointerEvent) => {
      pointerX = (event.clientX / Math.max(width, 1) - 0.5) * 24;
      pointerY = (event.clientY / Math.max(height, 1) - 0.5) * 18;
    };

    const draw = (time = 0) => {
      ctx.clearRect(0, 0, width, height);
      const projected: { x: number; y: number; alpha: number; radius: number }[] = [];

      for (const point of points) {
        if (!reduced) point.z -= point.speed;
        if (point.z < 160) point.z = 1080;
        const scale = 520 / point.z;
        const x = width / 2 + (point.x + pointerX * (point.z / 900)) * scale;
        const y = height / 2 + (point.y + pointerY * (point.z / 900)) * scale;
        const alpha = Math.max(0.06, Math.min(0.42, 1 - point.z / 1160));
        projected.push({ x, y, alpha, radius: Math.max(0.6, 2.2 * scale) });
      }

      ctx.lineWidth = 0.55;
      for (let i = 0; i < projected.length; i += 1) {
        const a = projected[i];
        const point = points[i];
        const rgb = point.tone === 0 ? "167, 139, 250" : "34, 211, 238";
        const shimmer = Math.sin(time * 0.00065 + point.phase);
        const glowAlpha = Math.min(0.65, a.alpha + shimmer * 0.06 + 0.06);
        ctx.fillStyle = `rgba(${rgb}, ${a.alpha + shimmer * 0.06})`;
        if (a.radius > 1.4) {
          // A soft halo on the nearer points — the light this scene is short on.
          ctx.shadowBlur = 9;
          ctx.shadowColor = `rgba(${rgb}, ${glowAlpha})`;
        }
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (a.radius > 1.25 && shimmer > 0.72) {
          ctx.strokeStyle = `rgba(${rgb}, ${a.alpha * 0.55})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y + 4);
          ctx.lineTo(a.x - pointerX * 0.4, a.y + 18 + a.radius * 3);
          ctx.stroke();
        }
        for (let j = i + 1; j < projected.length; j += 1) {
          const b = projected[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > 115) continue;
          ctx.strokeStyle = `rgba(${rgb}, ${(1 - distance / 115) * 0.09})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      if (!reduced && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="fixed inset-0 pointer-events-none redline-spatial-canvas" />;
}
