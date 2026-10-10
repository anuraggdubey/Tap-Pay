import React, { useRef, useState } from 'react';
import { useScrollMotion } from '../hooks/useScrollMotion';
import { useLandingMotion } from '../hooks/useLandingMotion';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { StatsCarousel } from '../components/StatsCarousel';
import { CenterPhoneShowcase } from '../components/CenterPhoneShowcase';
import { DemoVideoSection } from '../components/DemoVideoSection';
import { FeatureSlider } from '../components/FeatureSlider';
import { Prerequisites } from '../components/Prerequisites';
import { NfcSimulator } from '../components/NfcSimulator';
import { SecurityBento } from '../components/SecurityBento';
import { Footer } from '../components/Footer';
import { DownloadModal } from '../components/DownloadModal';
import { CursorSpotlight } from '../components/effects/CursorSpotlight';
import { BrandMarquee } from '../components/effects/BrandMarquee';

interface LandingPageProps {
  onJoinWaitlist: () => void;
}

export default function LandingPage({ onJoinWaitlist }: LandingPageProps) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const { scrollProgress } = useScrollMotion();
  useLandingMotion(shellRef);

  return (
    <div
      ref={shellRef}
      className="landing-motion-shell"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      <CursorSpotlight />
      <div className="site-ambient-layer" aria-hidden>
        <div className="ambient-orb ambient-orb-a" />
        <div className="ambient-orb ambient-orb-b" />
        <div className="ambient-orb ambient-orb-c" />
      </div>
      <div className="scroll-progress-beam" style={{ width: `${scrollProgress}%` }} />
      <div className="scroll-progress-glow" style={{ left: `${scrollProgress}%` }} />

      <Navbar onJoinWaitlist={onJoinWaitlist} />

      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <Hero onJoinWaitlist={onJoinWaitlist} />
        <BrandMarquee />
        <StatsCarousel />
        <CenterPhoneShowcase />
        <DemoVideoSection />
        <FeatureSlider />
        <Prerequisites />
        <NfcSimulator />
        <SecurityBento />
      </main>

      <Footer onJoinWaitlist={onJoinWaitlist} />

      <DownloadModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} onJoinWaitlist={onJoinWaitlist} />
    </div>
  );
}
