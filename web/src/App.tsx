import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FeatureSlider } from './components/FeatureSlider';
import { Prerequisites } from './components/Prerequisites';
import { NfcSimulator } from './components/NfcSimulator';
import { SecurityBento } from './components/SecurityBento';
import { Footer } from './components/Footer';
import { DownloadModal } from './components/DownloadModal';

export default function App() {
  const [downloadOpen, setDownloadOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Floating Pill Header */}
      <Navbar onOpenDownload={() => setDownloadOpen(true)} />

      {/* Main Content Sections (Exact Phantom Structure) */}
      <main style={{ flex: 1 }}>
        {/* Hero Card */}
        <Hero onOpenDownload={() => setDownloadOpen(true)} />

        {/* Feature Cards: "Contactless tools for everyone" */}
        <FeatureSlider />

        {/* Requirements: "Spend, Send, & Tap" */}
        <Prerequisites />

        {/* Live Interactive Phone Proximity Stage */}
        <NfcSimulator />

        {/* Security Dark Card: "Controlled by you, secured by Keystore" */}
        <SecurityBento />
      </main>

      {/* Silk White Footer */}
      <Footer onOpenDownload={() => setDownloadOpen(true)} />

      {/* Phantom Download Modal */}
      <DownloadModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </div>
  );
}
