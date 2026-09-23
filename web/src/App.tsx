import React, { useState } from 'react';
import { useScrollMotion } from './hooks/useScrollMotion';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { StatsCarousel } from './components/StatsCarousel';
import { CenterPhoneShowcase } from './components/CenterPhoneShowcase';
import { FeatureSlider } from './components/FeatureSlider';
import { Prerequisites } from './components/Prerequisites';
import { NfcSimulator } from './components/NfcSimulator';
import { SecurityBento } from './components/SecurityBento';
import { Footer } from './components/Footer';
import { DownloadModal } from './components/DownloadModal';

export default function App() {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const { scrollProgress } = useScrollMotion();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Ambient Scroll Progress Glow Beam */}
      <div className="scroll-progress-beam" style={{ width: `${scrollProgress}%` }} />

      {/* Floating Pill Header */}
      <Navbar onOpenDownload={() => setDownloadOpen(true)} />

      {/* Main Content Sections */}
      <main style={{ flex: 1 }}>
        {/* Hero Card */}
        <Hero onOpenDownload={() => setDownloadOpen(true)} />

        {/* Image 1: 4 Geometric Patterned Cards (Winner, ~1s Finality, 100% Non-Custodial, Atomic Ticker) */}
        <StatsCarousel />

        {/* Image 2: Center Realistic Phone Flanked by 4 Vibrant Cards */}
        <CenterPhoneShowcase />

        {/* Feature Cards: "Contactless tools for everyone" */}
        <FeatureSlider />

        {/* Requirements: "Spend, Send, & Tap" */}
        <Prerequisites />

        {/* Live Interactive Phone Proximity Stage */}
        <NfcSimulator />

        {/* Security Dark Card: "Controlled by you, secured by Keystore" */}
        <SecurityBento />
      </main>

      {/* Footer with Two Ultra-Realistic Phones (Home & Settings) + Directory */}
      <Footer onOpenDownload={() => setDownloadOpen(true)} />

      {/* Phantom Download Modal */}
      <DownloadModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </div>
  );
}
