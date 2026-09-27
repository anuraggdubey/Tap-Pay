import { useEffect, useState } from 'react';

export function useScrollMotion() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    // 1. Intersection Observer for Scroll Reveals
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.12,
      rootMargin: '0px 0px -50px 0px',
    });

    const revealElements = document.querySelectorAll(
      '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale, .scroll-stagger'
    );
    revealElements.forEach((el) => observer.observe(el));

    // 2. Parallax and Continuous Scroll Tracking
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
          setScrollProgress(progress);

          // Update CSS variable on root for continuous scroll styling
          document.documentElement.style.setProperty('--scroll-percent', `${progress.toFixed(2)}%`);
          document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);

          // Update parallax elements
          const parallaxElements = document.querySelectorAll<HTMLElement>('[data-parallax]');
          const vh = window.innerHeight;
          parallaxElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            // Only calculate if element is anywhere near the viewport
            if (rect.bottom >= -150 && rect.top <= vh + 150) {
              const speed = parseFloat(el.getAttribute('data-parallax') || '0.1');
              const centerDiff = (rect.top + rect.height / 2) - (vh / 2);
              const parallaxY = -(centerDiff * speed);
              el.style.setProperty('--parallax-y', `${parallaxY.toFixed(1)}px`);
            }
          });

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger initial calculation
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return { scrollProgress };
}
