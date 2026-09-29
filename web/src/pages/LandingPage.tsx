import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  WaitlistLaunchModal,
  markWaitlistLaunchShown,
  shouldShowWaitlistLaunchModal,
} from '../components/WaitlistLaunchModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const { scrollProgress } = useScrollMotion();

  const goWaitlist = () => {
    markWaitlistLaunchShown();
    navigate('/waitlist');
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (shouldShowWaitlistLaunchModal()) {
        setLaunchOpen(true);
        markWaitlistLaunchShown();
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="scroll-progress-beam" style={{ width: `${scrollProgress}%` }} />

      <Navbar onOpenDownload={() => setDownloadOpen(true)} onJoinWaitlist={goWaitlist} />

      <main style={{ flex: 1 }}>
        <Hero onJoinWaitlist={goWaitlist} />
        <StatsCarousel />
        <CenterPhoneShowcase />
        <FeatureSlider />
        <Prerequisites />
        <NfcSimulator />
        <SecurityBento />
      </main>

      <Footer onJoinWaitlist={goWaitlist} />

      <DownloadModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} onJoinWaitlist={goWaitlist} />

      <WaitlistLaunchModal
        isOpen={launchOpen}
        onClose={() => setLaunchOpen(false)}
        onJoin={goWaitlist}
      />
    </div>
  );
}
