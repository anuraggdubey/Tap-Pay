import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Search, ChevronDown, Radio, Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenDownload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDownload }) => {
  const [isDarkNav, setIsDarkNav] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Invert nav on the security dark section
      const sec = document.getElementById('security');
      if (sec) {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= 80 && rect.bottom >= 80) {
          setIsDarkNav(true);
          return;
        }
      }
      setIsDarkNav(false);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '20px 24px',
          pointerEvents: 'none',
        }}
      >
        <div
          className="phantom-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo (Phantom Style) */}
          <a
            href="#"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              fontSize: '22px',
              letterSpacing: '-0.03em',
              color: isDarkNav ? '#FFFDF8' : '#3C315B',
              transition: 'color 0.3s ease',
            }}
          >
            {/* Custom TapPay Contactless Ghost Mark */}
            <svg width="32" height="28" viewBox="0 0 32 28" fill="none">
              <path
                d="M4 22C4 25.3 6.7 28 10 28C13.3 28 16 25.3 16 22C16 15.4 21.4 10 28 10C29.1 10 30 9.1 30 8C30 3.6 26.4 0 22 0C12.1 0 4 8.1 4 18V22Z"
                fill={isDarkNav ? '#AB9FF2' : '#836EF9'}
              />
              <circle cx="11" cy="9" r="2.2" fill={isDarkNav ? '#1F1934' : '#FFFDF8'} />
              <circle cx="18" cy="9" r="2.2" fill={isDarkNav ? '#1F1934' : '#FFFDF8'} />
            </svg>
            <span>tappay</span>
          </a>

          {/* Center Navigation Pill (Exact Phantom Container) */}
          <nav
            className={`phantom-nav-pill ${isDarkNav ? 'is-dark' : ''} nav-center-desktop`}
            style={{
              pointerEvents: 'auto',
              display: 'none',
              alignItems: 'center',
              padding: '6px 12px',
              gap: '4px',
            }}
          >
            <a href="#how-it-works" className="phantom-nav-item">
              <span>Features</span>
              <ChevronDown size={14} opacity={0.6} />
            </a>
            <a href="#demo" className="phantom-nav-item">
              <span>NFC Demo</span>
              <ChevronDown size={14} opacity={0.6} />
            </a>
            <a href="#prerequisites" className="phantom-nav-item">
              <span>Prerequisites</span>
            </a>
            <a href="#security" className="phantom-nav-item">
              <span>Security</span>
            </a>
            <a
              href="https://testnet.monadscan.com/address/0x5B177FEF554dA84A86be62E45fb49BB52e6D6838"
              target="_blank"
              rel="noopener noreferrer"
              className="phantom-nav-item"
            >
              <span>Contracts</span>
              <ChevronDown size={14} opacity={0.6} />
            </a>
            <a
              href="https://x.com/tapxpay"
              target="_blank"
              rel="noopener noreferrer"
              className="phantom-nav-item"
            >
              <span>Community (𝕏)</span>
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {/* Search Icon Circle */}
            <button
              onClick={onOpenDownload}
              className="phantom-icon-btn"
              title="Search"
              style={{
                background: isDarkNav ? 'rgba(255, 255, 255, 0.12)' : '#FDFCFE',
                color: isDarkNav ? '#FFFDF8' : '#3C315B',
              }}
            >
              <Search size={18} />
            </button>

            {/* Download Pill Button */}
            <button
              onClick={onOpenDownload}
              className="phantom-btn-pill"
              style={{
                background: isDarkNav ? '#836EF9' : '#E2DDFE',
                color: isDarkNav ? '#FFFFFF' : '#3C315B',
              }}
            >
              <span>Download</span>
            </button>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="phantom-icon-btn nav-mobile-toggle"
              style={{
                display: 'none',
                background: isDarkNav ? 'rgba(255, 255, 255, 0.12)' : '#FDFCFE',
                color: isDarkNav ? '#FFFDF8' : '#3C315B',
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '16px',
            right: '16px',
            background: '#FDFCFE',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(60, 49, 91, 0.2)',
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: '#3C315B' }}
          >
            How It Works
          </a>
          <a
            href="#demo"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: '#3C315B' }}
          >
            NFC Simulator
          </a>
          <a
            href="#prerequisites"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: '#3C315B' }}
          >
            Prerequisites (Android &amp; NFC)
          </a>
          <a
            href="#security"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: '#3C315B' }}
          >
            Security &amp; Keystore
          </a>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenDownload();
            }}
            className="phantom-btn-pill"
            style={{ width: '100%', padding: '14px', marginTop: '10px' }}
          >
            Download TapPay APK
          </button>
        </div>
      )}

      <style>{`
        .phantom-nav-item {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 500;
          color: inherit;
          transition: background 0.15s ease;
        }
        .phantom-nav-item:hover {
          background: rgba(60, 49, 91, 0.05);
        }
        .phantom-nav-pill.is-dark .phantom-nav-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        @media (min-width: 900px) {
          .nav-center-desktop {
            display: flex !important;
          }
        }
        @media (max-width: 899px) {
          .nav-mobile-toggle {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
};
