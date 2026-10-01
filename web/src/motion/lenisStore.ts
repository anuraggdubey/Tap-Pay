import type Lenis from 'lenis';

let lenisRef: Lenis | null = null;

export function setLenisInstance(instance: Lenis | null) {
  lenisRef = instance;
}

export function getLenisInstance() {
  return lenisRef;
}

export function stopSmoothScroll() {
  lenisRef?.stop();
}

export function startSmoothScroll() {
  lenisRef?.start();
}
