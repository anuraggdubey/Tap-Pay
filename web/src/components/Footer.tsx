import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

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
    <footer style={{ paddingBottom: '30px' }}>
      <div className="phantom-container">
        {/* Large White Silk Footer Card (Exact Phantom Geometry) */}
        <div
          style={{
            background: '#FDFCFE',
            borderRadius: '32px',
            padding: '70px 50px 40px',
            boxShadow: '0 10px 40px rgba(60, 49, 91, 0.08)',
          }}
        >
          {/* Top Email Section */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '30px',
              paddingBottom: '60px',
              borderBottom: '1px solid rgba(60, 49, 91, 0.08)',
              marginBottom: '60px',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 'clamp(36px, 5vw, 64px)',
                  fontWeight: 400,
                  letterSpacing: '-0.03em',
                  color: '#3C315B',
                  marginBottom: '12px',
                  lineHeight: 1.05,
                }}
              >
                Enter your email
              </h3>
              <p style={{ color: '#6C628A', fontSize: '17px' }}>
                Sign up for updates on TapPay and the contactless Monad ecosystem.
              </p>
            </div>

            <form
              onSubmit={handleSubscribe}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#F5F3FF',
                padding: '6px 6px 6px 18px',
                borderRadius: '9999px',
                width: '100%',
                maxWidth: '420px',
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#3C315B',
                  fontSize: '15px',
                  width: '100%',
                }}
              />
              <button
                type="submit"
                className="phantom-btn-pill"
                style={{
                  background: '#E2DDFE',
                  color: '#3C315B',
                  fontWeight: 700,
                  padding: '12px 24px',
                }}
              >
                {subscribed ? 'Subscribed!' : 'Sign up'}
              </button>
            </form>
          </div>

          {/* Links Directory (4 Columns) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '30px',
              marginBottom: '60px',
            }}
            className="phantom-footer-links"
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#3C315B', marginBottom: '16px' }}>
                Product
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px', color: '#6C628A' }}>
                <li>
                  <button onClick={onOpenDownload} style={{ color: '#6C628A', fontWeight: 500, textAlign: 'left' }}>
                    Download APK
                  </button>
                </li>
                <li><a href="#how-it-works" style={{ color: '#6C628A' }}>How It Works</a></li>
                <li><a href="#prerequisites" style={{ color: '#6C628A' }}>Prerequisites</a></li>
                <li><a href="#security" style={{ color: '#6C628A' }}>Security</a></li>
              </ul>
            </div>

            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#3C315B', marginBottom: '16px' }}>
                Resources
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px', color: '#6C628A' }}>
                <li>
                  <a href="https://docs.monad.xyz" target="_blank" rel="noopener noreferrer" style={{ color: '#6C628A' }}>
                    Monad Docs
                  </a>
                </li>
                <li>
                  <a href="https://faucet.monad.xyz" target="_blank" rel="noopener noreferrer" style={{ color: '#6C628A' }}>
                    Testnet Faucet
                  </a>
                </li>
                <li>
                  <a href="https://testnet.monadscan.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6C628A' }}>
                    Monadscan Explorer
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#3C315B', marginBottom: '16px' }}>
                Hackathon
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px', color: '#6C628A' }}>
                <li><span style={{ color: '#6C628A' }}>Monad India Blitz V4</span></li>
                <li>
                  <a href="https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing" target="_blank" rel="noopener noreferrer" style={{ color: '#6C628A' }}>
                    Video Demo
                  </a>
                </li>
                <li>
                  <a href="https://github.com/anuraggdubey/Tap-Pay" target="_blank" rel="noopener noreferrer" style={{ color: '#6C628A' }}>
                    GitHub Repo
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#3C315B', marginBottom: '16px' }}>
                Builders
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px', color: '#6C628A' }}>
                <li>
                  <a href="https://x.com/anuraggdubeyy" target="_blank" rel="noopener noreferrer" style={{ color: '#6C628A' }}>
                    𝕏 @anuraggdubeyy
                  </a>
                </li>
                <li>
                  <a href="https://x.com/Misbahtwts" target="_blank" rel="noopener noreferrer" style={{ color: '#6C628A' }}>
                    𝕏 @Misbahtwts
                  </a>
                </li>
                <li>
                  <a href="https://x.com/AdityaNishad987" target="_blank" rel="noopener noreferrer" style={{ color: '#6C628A' }}>
                    𝕏 @AdityaNishad987
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Operational Status & Legal Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              paddingTop: '30px',
              borderTop: '1px solid rgba(60, 49, 91, 0.06)',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#F0EEFE',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#3C315B',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
              <span>Monad Testnet 10143 Operational</span>
            </div>

            <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#6C628A' }}>
              <span>© TapPay 2026</span>
              <a href="#" style={{ color: '#6C628A' }}>Terms</a>
              <a href="#" style={{ color: '#6C628A' }}>Privacy</a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .phantom-footer-links {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 500px) {
          .phantom-footer-links {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
};
