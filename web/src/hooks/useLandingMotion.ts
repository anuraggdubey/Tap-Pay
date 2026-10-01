import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const REVEAL_SELECTOR =
  '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale, .scroll-stagger';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Landing motion aligned with Phantom/Codrops patterns:
 * - One-time entrance + batch reveals (no reverse-fade)
 * - Sticky *stage* scrub (whole grid), not pinned phone + flying cards
 * - No stacked parallax on the same nodes as reveals
 */
export function useLandingMotion(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) {
      root?.querySelectorAll(REVEAL_SELECTOR).forEach((el) => el.classList.add('in-view'));
      return;
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.config({ ignoreMobileResize: true });

      gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .fromTo(
          '.hero-headline-line1',
          { autoAlpha: 0, y: 64 },
          { autoAlpha: 1, y: 0, duration: 0.95, immediateRender: false }
        )
        .fromTo(
          '.hero-headline-line2',
          { autoAlpha: 0, y: 48 },
          { autoAlpha: 1, y: 0, duration: 0.85, immediateRender: false },
          '-=0.65'
        )
        .fromTo(
          '.hero-description',
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.75, immediateRender: false },
          '-=0.5'
        )
        .fromTo(
          '.hero-action-buttons',
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.7, immediateRender: false },
          '-=0.45'
        )
        .fromTo(
          '.hero-metrics-bar',
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.7, immediateRender: false },
          '-=0.5'
        )
        .fromTo(
          '.hero-phone-column',
          { autoAlpha: 0, y: 48, scale: 0.96 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 1, immediateRender: false },
          '-=0.75'
        );

      gsap.fromTo(
        '.hero-mesh-canvas',
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 1.2, ease: 'power2.out', immediateRender: false }
      );

      gsap.to('.hero-phone-device', {
        y: 32,
        ease: 'none',
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });

      ScrollTrigger.batch(REVEAL_SELECTOR, {
        start: 'top 86%',
        once: true,
        onEnter: (batch) => {
          gsap.fromTo(
            batch,
            { autoAlpha: 0, y: 48 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.85,
              stagger: 0.08,
              ease: 'power3.out',
              overwrite: 'auto',
              immediateRender: false,
            }
          );
        },
      });

      gsap.utils.toArray<HTMLElement>('.phantom-section-title').forEach((title) => {
        gsap.fromTo(
          title,
          { autoAlpha: 0, y: 40 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            immediateRender: false,
            scrollTrigger: {
              trigger: title,
              start: 'top 88%',
              once: true,
              toggleActions: 'play none none none',
            },
          }
        );
      });

      gsap.set('.showcase-card-l1, .showcase-card-l2, .showcase-card-r1, .showcase-card-r2, .showcase-phone-inner', {
        autoAlpha: 1,
      });

      const spacer = root.querySelector('.showcase-scroll-spacer');
      const stage = root.querySelector('.showcase-sticky-stage');
      const mmShowcase = gsap.matchMedia();
      mmShowcase.add('(min-width: 960px)', () => {
        if (!spacer || !stage) return;

        const stageTl = gsap.timeline({
          scrollTrigger: {
            trigger: spacer,
            start: 'top 18%',
            end: 'bottom bottom',
            scrub: 0.65,
          },
        });

        stageTl.fromTo(stage, { scale: 0.98 }, { scale: 1, ease: 'none', duration: 1 }, 0);

        stageTl.fromTo(
          '.showcase-card-l1, .showcase-card-r1',
          { y: 36 },
          { y: 0, stagger: 0.06, ease: 'none', duration: 0.35 },
          0.05
        );
        stageTl.fromTo(
          '.showcase-card-l2, .showcase-card-r2',
          { y: 48 },
          { y: 0, stagger: 0.06, ease: 'none', duration: 0.35 },
          0.12
        );
        stageTl.fromTo(
          '.showcase-phone-inner',
          { y: 28, scale: 0.97 },
          { y: 0, scale: 1, ease: 'none', duration: 0.4 },
          0.08
        );
      });

      gsap.fromTo(
        '.nfc-demo-stage',
        { autoAlpha: 0, y: 56 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.95,
          ease: 'power3.out',
          immediateRender: false,
          scrollTrigger: {
            trigger: '.nfc-demo-stage',
            start: 'top 85%',
            once: true,
            toggleActions: 'play none none none',
          },
        }
      );
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    const t = window.setTimeout(refresh, 350);
    window.addEventListener('load', refresh);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('load', refresh);
      ctx.revert();
    };
  }, [rootRef]);
}
