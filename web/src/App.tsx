import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DownloadPage from './pages/DownloadPage';
import DocsPage from './pages/DocsPage';
import { MotionProvider } from './motion/MotionProvider';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/download" element={<DownloadPage />} />
      <Route path="/docs" element={<DocsPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <MotionProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </MotionProvider>
  );
}
