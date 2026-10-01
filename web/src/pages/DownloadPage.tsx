import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clock } from 'lucide-react';
import { PlayBentoGrid } from '../components/PlayBentoGrid';
import { runWaitlistPageMotion } from '../motion/initScrollAnimations';
import '../styles/waitlist.css';

export default function DownloadPage() {
  const navigate = useNavigate();

  useEffect(() => runWaitlistPageMotion(), []);

  return (
    <div className="waitlist-page">
      <div className="waitlist-shell">
        <header className="waitlist-topbar">
          <Link to="/" className="waitlist-logo">
            <svg width="26" height="30" viewBox="0 0 512 512" fill="none" aria-hidden>
              <circle cx="200" cy="120" r="62" fill="currentColor" />
              <circle cx="340" cy="215" r="44" fill="currentColor" opacity="0.6" />
              <circle cx="200" cy="400" r="72" fill="currentColor" />
              <path
                d="M200 182 C200 215, 240 215, 340 215"
                stroke="currentColor"
                strokeWidth="52"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M200 328 L200 182" stroke="currentColor" strokeWidth="52" strokeLinecap="round" fill="none" />
            </svg>
            tappay
          </Link>
          <Link to="/" className="waitlist-back">← Back to site</Link>
        </header>

        <h1 className="waitlist-headline" style={{ marginBottom: 20 }}>
          <em>Download</em>
          TapPay for Android.
        </h1>
        <p className="waitlist-lede" style={{ marginBottom: 32 }}>
          We&apos;re not shipping the APK publicly yet. Join the waitlist and we&apos;ll email you the install link on
          launch day.
        </p>

        <div className="download-split-bar">
          <div className="download-split-left">
            <Clock size={20} />
            <div>
              <div className="download-split-label">Android APK</div>
              <div className="download-split-value">Coming soon</div>
            </div>
          </div>
          <div className="download-split-divider" aria-hidden />
          <button type="button" className="download-split-right" onClick={() => navigate('/waitlist')}>
            <span>Join waitlist</span>
            <ArrowUpRight size={18} />
          </button>
        </div>

        <div style={{ marginTop: 48, marginBottom: 24 }}>
          <PlayBentoGrid variant="download" />
        </div>
      </div>
    </div>
  );
}
