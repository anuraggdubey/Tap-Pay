import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Search, ChevronDown, Radio, Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenDownload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDownload }) => {
  const [isDarkNav, setIsDarkNav] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);

      // Only invert nav on the dark security section
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

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`site-navbar-header ${isScrolled ? 'is-scrolled' : ''} ${isDarkNav ? 'is-dark' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="phantom-container navbar-inner-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <a
            href="#"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 800,
              fontSize: '22px',
              letterSpacing: '-0.03em',
              color: isDarkNav ? '#FFFDF8' : 'var(--text-dark)',
              transition: 'color 0.25s ease',
              textDecoration: 'none',
              zIndex: 2,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {/* TapPay Logo */}
            <svg width="28" height="32" viewBox="0 0 512 512" fill="none">
              <circle cx="200" cy="120" r="62" fill="currentColor"/>
              <circle cx="340" cy="215" r="44" fill="currentColor" opacity="0.6"/>
              <circle cx="200" cy="400" r="72" fill="currentColor"/>
              <path d="M200 182 C200 215, 240 215, 340 215" stroke="currentColor" strokeWidth="52" strokeLinecap="round" fill="none"/>
              <path d="M200 328 L200 182" stroke="currentColor" strokeWidth="52" strokeLinecap="round" fill="none"/>
            </svg>
            <span style={{ letterSpacing: '-0.02em', fontWeight: 800 }}>tappay</span>
          </a>

          {/* Center Navigation Pill */}
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
              <span>Community</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.8, marginLeft: '2px' }}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
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
              className="phantom-icon-btn nav-search-btn"
              title="Search"
              style={{
                background: isDarkNav ? 'rgba(255, 255, 255, 0.12)' : 'var(--pill-bg)',
                color: isDarkNav ? '#FFFDF8' : 'var(--text-dark)',
                border: isDarkNav ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(26, 26, 26, 0.08)',
              }}
            >
              <Search size={18} />
            </button>

            {/* Download Pill Button */}
            <button
              onClick={onOpenDownload}
              className="phantom-btn-pill nav-download-btn"
              style={{
                background: isDarkNav ? '#FFFDF8' : 'var(--text-dark)',
                color: isDarkNav ? '#0D0D12' : '#FFFFFF',
                fontWeight: 600,
                boxShadow: isDarkNav ? '0 4px 15px rgba(0, 0, 0, 0.3)' : '0 4px 15px rgba(26, 26, 26, 0.12)',
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
                background: isDarkNav ? 'rgba(255, 255, 255, 0.12)' : 'var(--pill-bg)',
                color: isDarkNav ? '#FFFDF8' : 'var(--text-dark)',
                border: isDarkNav ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(26, 26, 26, 0.08)',
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
            background: 'var(--card-white)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(26, 26, 26, 0.08)',
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)' }}
          >
            How It Works
          </a>
          <a
            href="#demo"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)' }}
          >
            NFC Simulator
          </a>
          <a
            href="#prerequisites"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)' }}
          >
            Prerequisites (Android &amp; NFC)
          </a>
          <a
            href="#security"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)' }}
          >
            Security &amp; Keystore
          </a>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenDownload();
            }}
            className="phantom-btn-pill"
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '10px',
              background: 'var(--text-dark)',
              color: '#FFFFFF',
            }}
          >
            Download TapPay APK
          </button>
        </div>
      )}

      <style>{`
        .site-navbar-header {
          padding: 18px 24px;
          background: transparent;
        }
        .site-navbar-header.is-scrolled {
          padding: 12px 24px;
          background: var(--nav-bg-light);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(26, 26, 26, 0.06);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }
        .site-navbar-header.is-scrolled.is-dark {
          background: rgba(15, 16, 21, 0.94);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
        }

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
          background: rgba(26, 26, 26, 0.06);
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
          .site-navbar-header {
            padding: 12px 16px !important;
            background: var(--nav-bg-light) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border-bottom: 1px solid rgba(26, 26, 26, 0.06) !important;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04) !important;
          }
          .site-navbar-header.is-dark {
            background: rgba(15, 16, 21, 0.94) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
          .nav-mobile-toggle {
            display: flex !important;
          }
        }
        @media (max-width: 480px) {
          .nav-search-btn {
            display: none !important;
          }
          .nav-download-btn {
            padding: 8px 14px !important;
            font-size: 13px !important;
          }
        }
      `}</style>
    </>
  );
};
