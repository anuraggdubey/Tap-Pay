import React, { useState } from 'react';
import { ArrowUpRight, Download, Video } from 'lucide-react';

interface FooterProps {
  onOpenDownload: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenDownload }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3000);
      setEmail('');
    }
  };

  return (
    <footer style={{ position: 'relative', width: '100%' }}>
      {/* UPPER CALL TO ACTION CARD (FLUSH / MATCHING REFERENCE IMAGE) */}
      <div className="phantom-container" style={{ marginBottom: 0 }}>
        <div
          style={{
            background: '#BCBFBE',
            borderRadius: '32px 32px 0 0',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            alignItems: 'flex-end',
            position: 'relative',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.04)',
          }}
          className="reference-footer-cta-card"
        >
          {/* Left Text & Badges */}
          <div
            style={{
              padding: '60px 48px 50px 60px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              zIndex: 2,
            }}
            className="reference-cta-content"
          >
            <h2
              style={{
                fontSize: 'clamp(34px, 4.2vw, 56px)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.08,
                color: '#111113',
                marginBottom: '18px',
              }}
            >
              Ready To Take Control Of Your Crypto?
            </h2>

            <p
              style={{
                color: '#34353A',
                fontSize: '17px',
                lineHeight: 1.6,
                marginBottom: '36px',
                maxWidth: '500px',
                fontWeight: 450,
              }}
            >
              Turn transactions into effortless moments. With TapPay, contactless peer-to-peer payments on Monad are just a tap away — secure, instant, and made for you.
            </p>

            {/* Badges Container */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Google Play Style Badge */}
              <button
                onClick={onOpenDownload}
                style={{
                  background: '#000000',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, background 0.15s ease',
                  textAlign: 'left',
                }}
                className="store-badge-btn"
              >
                {/* Google Play Color Triangle Icon */}
                <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
                  <path d="M0.8 0.6C0.5 0.9 0.3 1.4 0.3 2.1V21.9C0.3 22.6 0.5 23.1 0.8 23.4L0.9 23.5L12.3 12.1V11.9L0.9 0.5L0.8 0.6Z" fill="#00E676" />
                  <path d="M16.1 15.9L12.3 12.1V11.9L16.1 8.1L16.2 8.2L20.7 10.7C22 11.4 22 12.6 20.7 13.3L16.2 15.8L16.1 15.9Z" fill="#FFD600" />
                  <path d="M16.2 15.8L12.3 12L0.8 23.5C1.2 23.9 1.9 24 2.8 23.5L16.2 15.8Z" fill="#FF1744" />
                  <path d="M16.2 8.2L2.8 0.5C1.9 0 1.2 0.1 0.8 0.5L12.3 12L16.2 8.2Z" fill="#00B0FF" />
                </svg>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85, lineHeight: 1 }}>
                    GET IT ON
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                    Google Play
                  </div>
                </div>
              </button>

              {/* Android APK Style Badge */}
              <button
                onClick={onOpenDownload}
                style={{
                  background: '#000000',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, background 0.15s ease',
                  textAlign: 'left',
                }}
                className="store-badge-btn"
              >
                <Download size={22} color="#FFFFFF" />
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85, lineHeight: 1 }}>
                    DIRECT DOWNLOAD
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                    Android APK
                  </div>
                </div>
              </button>

              {/* Official 𝕏 Button */}
              <a
                href="https://x.com/tapxpay"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#000000',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'transform 0.15s ease',
                }}
                className="store-badge-btn"
              >
                {/* 𝕏 Logo */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85, lineHeight: 1 }}>
                    OFFICIAL ACCOUNT
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                    𝕏 @tapxpay
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Right Phone Hand Container — ONLY 70% OF THE PHONE VISIBLE */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              height: '430px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            className="reference-phone-wrapper"
          >
            <img
              src="/hand-holding-tap-pay.png"
              alt="TapPay Mobile Home Screen held in hand"
              style={{
                height: '620px',
                width: 'auto',
                maxWidth: 'none',
                objectFit: 'contain',
                display: 'block',
                marginTop: '-35px',
                maskImage: 'linear-gradient(to right, transparent 0%, black 12%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* LOWER SECTION: SOLID MATTE BLACK FOOTER */}
      <div
        style={{
          background: '#111113',
          color: '#FFFFFF',
          padding: '65px 0 40px',
        }}
      >
        <div className="phantom-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1.6fr',
              gap: '40px',
              marginBottom: '55px',
            }}
            className="reference-footer-links-grid"
          >
            {/* Column 1: Navigation */}
            <div>
              <ul
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <li>
                  <a href="#" style={{ color: '#E4E4E7', textDecoration: 'none', transition: 'color 0.15s ease' }}>
                    HOME
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" style={{ color: '#A1A1AA', textDecoration: 'none', transition: 'color 0.15s ease' }}>
                    OUR PRODUCT
                  </a>
                </li>
                <li>
                  <a href="#demo" style={{ color: '#A1A1AA', textDecoration: 'none', transition: 'color 0.15s ease' }}>
                    NFC SIMULATOR
                  </a>
                </li>
                <li>
                  <a href="#prerequisites" style={{ color: '#A1A1AA', textDecoration: 'none', transition: 'color 0.15s ease' }}>
                    TECHNOLOGIES
                  </a>
                </li>
                <li>
                  <a href="#security" style={{ color: '#A1A1AA', textDecoration: 'none', transition: 'color 0.15s ease' }}>
                    SECURITY &amp; KEYSTORE
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2: Legal & Network Resources */}
            <div>
              <ul
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <li>
                  <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none' }}>
                    PRIVACY POLICY
                  </a>
                </li>
                <li>
                  <a href="#" style={{ color: '#A1A1AA', textDecoration: 'none' }}>
                    TERMS AND CONDITIONS
                  </a>
                </li>
                <li>
                  <a href="https://docs.monad.xyz" target="_blank" rel="noopener noreferrer" style={{ color: '#A1A1AA', textDecoration: 'none' }}>
                    MONAD DOCS
                  </a>
                </li>
                <li>
                  <a href="https://faucet.monad.xyz" target="_blank" rel="noopener noreferrer" style={{ color: '#A1A1AA', textDecoration: 'none' }}>
                    TESTNET FAUCET
                  </a>
                </li>
                <li>
                  <a href="https://testnet.monadscan.com" target="_blank" rel="noopener noreferrer" style={{ color: '#A1A1AA', textDecoration: 'none' }}>
                    MONADSCAN EXPLORER
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Newsletter & Socials */}
            <div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  marginBottom: '8px',
                  letterSpacing: '-0.01em',
                }}
              >
                Join Our Newsletter
              </h3>
              <p
                style={{
                  color: '#8E8E93',
                  fontSize: '14px',
                  marginBottom: '20px',
                  lineHeight: 1.5,
                }}
              >
                Keep up to date with everything TapPay on Monad
              </p>

              {/* Email Form */}
              <form onSubmit={handleSubscribe} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', maxWidth: '420px' }}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    style={{
                      background: '#222226',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '13px 18px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      width: '100%',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#FFFFFF',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '13px 20px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {subscribed ? 'Joined!' : 'Join'}
                  </button>
                </div>
              </form>

              {/* Social Icons matching the reference style */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* 𝕏 Official Link */}
                <a
                  href="https://x.com/tapxpay"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Official 𝕏 (@tapxpay)"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    transition: 'transform 0.15s ease, opacity 0.15s ease',
                  }}
                  className="social-icon-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>

                {/* GitHub */}
                <a
                  href="https://github.com/anuraggdubey/Tap-Pay"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="GitHub Repository"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    transition: 'transform 0.15s ease, opacity 0.15s ease',
                  }}
                  className="social-icon-btn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </a>

                {/* Video Demo */}
                <a
                  href="https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Video Demo"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    transition: 'transform 0.15s ease, opacity 0.15s ease',
                  }}
                  className="social-icon-btn"
                >
                  <Video size={20} />
                </a>
              </div>
            </div>
          </div>

          {/* Hairline Divider & Bottom Copyright */}
          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '13px',
              color: '#71717A',
            }}
          >
            <div>© 2026 TapPay. Contactless Decentralized Payments on Monad.</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
              <span style={{ color: '#A1A1AA' }}>Monad Testnet 10143 Operational</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .store-badge-btn:hover {
          transform: translateY(-2px);
          background: #1a1a1e !important;
        }
        .social-icon-btn:hover {
          transform: translateY(-2px);
          opacity: 0.9;
        }
        @media (max-width: 960px) {
          .reference-footer-cta-card {
            grid-template-columns: 1fr !important;
            padding-bottom: 0 !important;
          }
          .reference-cta-content {
            padding: 40px 30px 20px !important;
          }
          .reference-phone-wrapper {
            height: 340px !important;
          }
          .reference-footer-links-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .reference-footer-links-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
};
