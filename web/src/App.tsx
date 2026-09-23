import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Prerequisites } from './components/Prerequisites';
import { NfcSimulator } from './components/NfcSimulator';
import { FeatureSlider } from './components/FeatureSlider';
import { HowItWorks } from './components/HowItWorks';
import { KeypadSimulator } from './components/KeypadSimulator';
import { SecurityBento } from './components/SecurityBento';
import { HackathonStory } from './components/HackathonStory';
import { DownloadModal } from './components/DownloadModal';
import { Footer } from './components/Footer';

export default function App() {
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Floating Header */}
      <Navbar onOpenDownload={() => setDownloadModalOpen(true)} />

      {/* Main Content Sections */}
      <main style={{ flex: 1 }}>
        <Hero onOpenDownload={() => setDownloadModalOpen(true)} />
        <Prerequisites />
        <NfcSimulator />
        <FeatureSlider />
        <HowItWorks />
        <KeypadSimulator />
        <SecurityBento />
        <HackathonStory />
      </main>

      {/* Footer */}
      <Footer onOpenDownload={() => setDownloadModalOpen(true)} />

      {/* Download APK / QR Modal */}
      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
      />
    </div>
  );
}
