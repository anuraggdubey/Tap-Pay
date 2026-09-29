import React, { useState } from 'react';
import { useScrollMotion } from '../hooks/useScrollMotion';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { StatsCarousel } from '../components/StatsCarousel';
import { CenterPhoneShowcase } from '../components/CenterPhoneShowcase';
import { FeatureSlider } from '../components/FeatureSlider';
import { Prerequisites } from '../components/Prerequisites';
import { NfcSimulator } from '../components/NfcSimulator';
import { SecurityBento } from '../components/SecurityBento';
import { Footer } from '../components/Footer';
import { DownloadModal } from '../components/DownloadModal';

interface LandingPageProps {
  onJoinWaitlist: () => void;
}

export default function LandingPage({ onJoinWaitlist }: LandingPageProps) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const { scrollProgress } = useScrollMotion();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="scroll-progress-beam" style={{ width: `${scrollProgress}%` }} />

      <Navbar onJoinWaitlist={onJoinWaitlist} />

      <main style={{ flex: 1 }}>
        <Hero onJoinWaitlist={onJoinWaitlist} />
        <StatsCarousel />
        <CenterPhoneShowcase />
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
