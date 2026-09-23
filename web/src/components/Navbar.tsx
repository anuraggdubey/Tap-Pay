import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Menu, X, Radio, ExternalLink } from 'lucide-react';

interface NavbarProps {
  onOpenDownload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDownload }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
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
          padding: '16px 24px',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          className="container"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: scrolled ? 'rgba(15, 16, 23, 0.85)' : 'rgba(15, 16, 23, 0.55)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '9999px',
            padding: '10px 20px',
            boxShadow: scrolled
              ? '0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 20px -5px rgba(131, 110, 249, 0.2)'
              : '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {/* Brand Logo */}
          <a
            href="#"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 800,
              fontSize: '19px',
              letterSpacing: '-0.02em',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #836ef9 0%, #4c35de 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(131, 110, 249, 0.45)',
              }}
            >
              <Radio size={18} color="#ffffff" />
            </div>
            <span>
              Tap<span style={{ color: '#836ef9' }}>Pay</span>
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '9999px',
                background: 'rgba(131, 110, 249, 0.15)',
                color: '#ab9ff2',
                border: '1px solid rgba(131, 110, 249, 0.3)',
                letterSpacing: '0.04em',
              }}
            >
              MONAD
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'none',
              gap: '28px',
              alignItems: 'center',
            }}
            className="nav-desktop"
          >
            <a href="#how-it-works" className="nav-link">
              How It Works
            </a>
            <a href="#prerequisites" className="nav-link">
              Prerequisites
            </a>
            <a href="#features" className="nav-link">
              Features
            </a>
            <a href="#demo" className="nav-link">
              NFC Demo
            </a>
            <a href="#security" className="nav-link">
              Security
            </a>
            <a
              href="https://testnet.monadscan.com/address/0x5B177FEF554dA84A86be62E45fb49BB52e6D6838"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              Explorer <ExternalLink size={12} opacity={0.7} />
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onOpenDownload}
              className="btn-phantom-primary"
              style={{
                padding: '9px 20px',
                fontSize: '14px',
              }}
            >
              <Download size={16} strokeWidth={2.4} />
              <span>Download APK</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="nav-mobile-toggle"
              aria-label="Toggle navigation"
              style={{
                display: 'none',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '84px',
            left: '16px',
            right: '16px',
            background: 'rgba(18, 19, 28, 0.95)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '24px',
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
          }}
        >
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: '#e2e4ed' }}
          >
            How It Works
          </a>
          <a
            href="#prerequisites"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: '#e2e4ed' }}
          >
            Prerequisites (Android & NFC)
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: '#e2e4ed' }}
          >
            Features
          </a>
          <a
            href="#demo"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: '#e2e4ed' }}
          >
            NFC Simulator
          </a>
          <a
            href="#security"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: '16px', fontWeight: 600, color: '#e2e4ed' }}
          >
            Contracts & Keystore
          </a>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenDownload();
            }}
            className="btn-phantom-purple"
            style={{ width: '100%', marginTop: '8px' }}
          >
            <Smartphone size={18} />
            <span>Download for Android</span>
          </button>
        </div>
      )}

      <style>{`
        .nav-link {
          font-size: 14px;
          font-weight: 500;
          color: #9ea0b2;
          transition: color 0.2s ease;
        }
        .nav-link:hover {
          color: #ffffff;
        }
        @media (min-width: 860px) {
          .nav-desktop {
            display: flex !important;
          }
        }
        @media (max-width: 859px) {
          .nav-mobile-toggle {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
};
