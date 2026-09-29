import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';

interface NavbarProps {
  onJoinWaitlist: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onJoinWaitlist }) => {
  const [isDarkNav, setIsDarkNav] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);

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

  const splitClass = `nav-download-split nav-download-split-desktop ${isDarkNav ? 'is-dark' : ''}`;

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
          <Link
            to="/"
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
            <svg width="28" height="32" viewBox="0 0 512 512" fill="none" aria-hidden>
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
            <span style={{ letterSpacing: '-0.02em', fontWeight: 800 }}>tappay</span>
          </Link>

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
            <a href="/#how-it-works" className="phantom-nav-item">
              <span>Features</span>
              <ChevronDown size={14} opacity={0.6} />
            </a>
            <a href="/#demo" className="phantom-nav-item">
              <span>NFC Demo</span>
              <ChevronDown size={14} opacity={0.6} />
            </a>
            <Link to="/download" className="phantom-nav-item nav-download-link">
              <span>Download</span>
              <ChevronDown size={14} opacity={0.6} />
            </Link>
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

          <div
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div className={splitClass}>
              <Link to="/download" className="nav-download-soon" style={{ textDecoration: 'none' }}>
                Coming soon
              </Link>
              <button type="button" className="nav-download-join" onClick={onJoinWaitlist}>
                Join waitlist
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="phantom-icon-btn nav-mobile-toggle"
              style={{
                display: 'none',
                background: isDarkNav ? 'rgba(255, 255, 255, 0.12)' : 'var(--pill-bg)',
                color: isDarkNav ? '#FFFDF8' : 'var(--text-dark)',
                border: isDarkNav ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(26, 26, 26, 0.08)',
              }}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

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
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)' }}
          >
            Features
          </a>
          <a
            href="/#demo"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)' }}
          >
            NFC Simulator
          </a>
          <Link
            to="/download"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)' }}
          >
            Download
          </Link>
          <div className={`${splitClass} nav-download-mobile-only`} style={{ marginTop: 8 }}>
            <Link
              to="/download"
              className="nav-download-soon"
              style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Coming soon
            </Link>
            <button
              type="button"
              className="nav-download-join"
              style={{ flex: 1 }}
              onClick={() => {
                setMobileMenuOpen(false);
                onJoinWaitlist();
              }}
            >
              Join waitlist
            </button>
          </div>
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
          text-decoration: none;
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
      `}</style>
    </>
  );
};
