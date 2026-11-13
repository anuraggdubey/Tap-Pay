import { useEffect } from 'react';

const TILT = '.phantom-card-main, .play-bento-card';
const MAGNET = '.phantom-btn-pill, .btn-phantom-purple';

/** Cursor-driven 3D tilt, glow position and magnetic buttons (fine pointers only). */
export function MotionFx() {
  useEffect(() => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }

    const onMove = (e: PointerEvent) => {
      const t = e.target as Element | null;
      const card = t?.closest<HTMLElement>(TILT);
      if (card) {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.classList.add('tilt-live');
        card.style.setProperty('--ry', `${(px - 0.5) * 8}deg`);
        card.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
      }
      const btn = t?.closest<HTMLElement>(MAGNET);
      if (btn) {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.25;
        btn.style.translate = `${dx}px ${dy}px`;
      }
    };

    const onOut = (e: PointerEvent) => {
      const t = e.target as Element | null;
      const card = t?.closest<HTMLElement>(TILT);
      if (card && !card.contains(e.relatedTarget as Node)) {
        card.classList.remove('tilt-live');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      }
      const btn = t?.closest<HTMLElement>(MAGNET);
      if (btn && !btn.contains(e.relatedTarget as Node)) btn.style.translate = '';
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
    };
  }, []);

  return null;
}
