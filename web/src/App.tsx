import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DownloadPage from './pages/DownloadPage';
import DocsPage from './pages/DocsPage';
import ConfirmPage from './pages/ConfirmPage';
import { MotionProvider } from './motion/MotionProvider';
import { MotionFx } from './components/effects/MotionFx';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/download" element={<DownloadPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/confirm" element={<ConfirmPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <MotionProvider>
      <BrowserRouter>
        <MotionFx />
        <AppRoutes />
      </BrowserRouter>
    </MotionProvider>
  );
}
