import React, { useEffect, useRef } from 'react';

/** Lightweight aurora mesh — no WebGL dependency */
export function HeroMeshCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let t = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.floor(w * devicePixelRatio);
      canvas.height = Math.floor(h * devicePixelRatio);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    const draw = () => {
      if (!w || !h) {
        raf = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      // Restrained accent glow on the dark canvas — blue + violet, low opacity,
      // so it reads as atmospheric depth rather than a candy aurora.
      const blobs = [
        { x: 0.20 + Math.sin(t * 0.00035) * 0.06, y: 0.30 + Math.cos(t * 0.00028) * 0.05, r: 0.5, c: '10, 132, 255' },
        { x: 0.72 + Math.cos(t * 0.00031) * 0.06, y: 0.58 + Math.sin(t * 0.00026) * 0.05, r: 0.42, c: '110, 84, 255' },
      ];

      blobs.forEach((b) => {
        const cx = b.x * w;
        const cy = b.y * h;
        const radius = b.r * Math.min(w, h);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, `rgba(${b.c}, 0.14)`);
        g.addColorStop(0.55, `rgba(${b.c}, 0.05)`);
        g.addColorStop(1, `rgba(${b.c}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!reduced) t += 16;
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-mesh-canvas" aria-hidden />;
}
