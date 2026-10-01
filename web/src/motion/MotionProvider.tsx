import React, { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setLenisInstance } from './lenisStore';

import 'lenis/dist/lenis.css';

interface MotionProviderProps {
  children: ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('motion-reduced', reducedMotion);

    if (reducedMotion) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.1,
    });

    setLenisInstance(lenis);
    document.documentElement.classList.add('lenis-smooth-active');

    lenis.on('scroll', ScrollTrigger.update);

    const onLenisScroll = () => {
      window.dispatchEvent(new Event('tappay-scroll'));
    };
    lenis.on('scroll', onLenisScroll);

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      lenis.destroy();
      setLenisInstance(null);
      document.documentElement.classList.remove('lenis-smooth-active');
    };
  }, []);

  return <>{children}</>;
}
