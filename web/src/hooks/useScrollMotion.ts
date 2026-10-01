import { useEffect, useState } from 'react';

export function useScrollMotion() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const observerCallback: IntersectionObserverCallback = (entries) => {
      if (document.documentElement.classList.contains('lenis-smooth-active')) {
        return;
      }
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

    let lastScrollY = 0;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
          setScrollProgress(progress);

          document.documentElement.style.setProperty('--scroll-percent', `${progress.toFixed(2)}%`);
          document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
          document.documentElement.style.setProperty(
            '--scroll-velocity',
            `${Math.min(1, Math.abs(scrollY - lastScrollY) / 48)}`
          );
          lastScrollY = scrollY;

          if (!document.documentElement.classList.contains('lenis-smooth-active')) {
            const parallaxElements = document.querySelectorAll<HTMLElement>('[data-parallax]');
            const vh = window.innerHeight;
            parallaxElements.forEach((el) => {
              const rect = el.getBoundingClientRect();
              if (rect.bottom >= -150 && rect.top <= vh + 150) {
                const speed = parseFloat(el.getAttribute('data-parallax') || '0.1');
                const centerDiff = rect.top + rect.height / 2 - vh / 2;
                const parallaxY = -(centerDiff * speed);
                el.style.setProperty('--parallax-y', `${parallaxY.toFixed(1)}px`);
              }
            });
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('tappay-scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('tappay-scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return { scrollProgress };
}
