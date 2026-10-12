import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Smartphone } from 'lucide-react';
import { PlayBentoGrid } from '../components/PlayBentoGrid';
import { runWaitlistPageMotion } from '../motion/initScrollAnimations';
import '../styles/waitlist.css';

import { APK_DOWNLOAD_URL } from '../config';

export default function DownloadPage() {
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
          Get the TapPay APK and start making instant NFC tap-to-pay transactions on Monad Mainnet.
        </p>

        <div className="download-split-bar">
          <div className="download-split-left">
            <Smartphone size={20} />
            <div>
              <div className="download-split-label">Android APK</div>
              <div className="download-split-value">Ready to install</div>
            </div>
          </div>
          <div className="download-split-divider" aria-hidden />
          <a
            href={APK_DOWNLOAD_URL}
            download="TapPay.apk"
            className="download-split-right"
            style={{ textDecoration: 'none' }}
          >
            <span>Download APK</span>
            <ArrowUpRight size={18} />
          </a>
        </div>

        <div style={{ marginTop: 48, marginBottom: 24 }}>
          <PlayBentoGrid variant="download" />
        </div>
      </div>
    </div>
  );
}
