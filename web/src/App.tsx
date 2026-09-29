import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import WaitlistPage from './pages/WaitlistPage';
import DownloadPage from './pages/DownloadPage';
import {
  WaitlistLaunchModal,
  shouldShowWaitlistLaunchModal,
} from './components/WaitlistLaunchModal';

function AppRoutes() {
  const navigate = useNavigate();
  const [launchOpen, setLaunchOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (shouldShowWaitlistLaunchModal()) {
        setLaunchOpen(true);
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, []);

  const goWaitlist = () => {
    setLaunchOpen(false);
    navigate('/waitlist');
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage onJoinWaitlist={goWaitlist} />} />
        <Route path="/waitlist" element={<WaitlistPage />} />
        <Route path="/download" element={<DownloadPage />} />
      </Routes>

      <WaitlistLaunchModal isOpen={launchOpen} onClose={() => setLaunchOpen(false)} onJoin={goWaitlist} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
