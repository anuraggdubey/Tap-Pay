import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function runWaitlistPageMotion() {
  if (prefersReducedMotion() || !document.querySelector('.waitlist-page')) {
    return () => {};
  }

  const ctx = gsap.context(() => {
    gsap.fromTo(
      '.waitlist-topbar',
      { autoAlpha: 0, y: -16 },
      { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', immediateRender: false }
    );
    gsap.fromTo(
      '.waitlist-headline',
      { autoAlpha: 0, y: 48 },
      { autoAlpha: 1, y: 0, duration: 1, ease: 'power4.out', delay: 0.05, immediateRender: false }
    );
    gsap.fromTo(
      '.waitlist-lede',
      { autoAlpha: 0, y: 32 },
      { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out', delay: 0.15, immediateRender: false }
    );
    gsap.fromTo(
      '.waitlist-form-panel, .download-split-bar',
      { autoAlpha: 0, y: 40, scale: 0.98 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.95,
        ease: 'power3.out',
        delay: 0.12,
        stagger: 0.08,
        immediateRender: false,
      }
    );
    gsap.utils.toArray<HTMLElement>('.waitlist-bento-motion').forEach((el) => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 36 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          ease: 'power3.out',
          immediateRender: false,
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });
  });

  return () => ctx.revert();
}
