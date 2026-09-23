import React from 'react';
import { Radio, ExternalLink, Code2 } from 'lucide-react';

interface FooterProps {
  onOpenDownload: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenDownload }) => {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#07080b',
        padding: '80px 0 40px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
            gap: '40px',
            marginBottom: '60px',
          }}
          className="footer-grid"
        >
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #836ef9, #5037d8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Radio size={18} color="#fff" />
              </div>
              <span style={{ fontSize: '20px', fontWeight: 800 }}>
                Tap<span style={{ color: '#836ef9' }}>Pay</span>
              </span>
            </div>

            <p style={{ color: '#67697b', fontSize: '14px', lineHeight: 1.6, maxWidth: '300px', marginBottom: '24px' }}>
              Phone-to-phone contactless cryptocurrency payments powered by Monad and native Android NFC Host Card Emulation.
            </p>

            <button
              onClick={onOpenDownload}
              className="btn-phantom-primary"
              style={{ padding: '10px 22px', fontSize: '13px' }}
            >
              <span>Download APK</span>
            </button>
          </div>

          {/* Column 1: Product */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '16px', letterSpacing: '0.04em' }}>
              PRODUCT
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#9ea0b2' }}>
              <li><a href="#how-it-works" className="nav-link">How It Works</a></li>
              <li><a href="#prerequisites" className="nav-link">Requirements</a></li>
              <li><a href="#features" className="nav-link">Features</a></li>
              <li><a href="#demo" className="nav-link">NFC Simulator</a></li>
              <li><a href="#security" className="nav-link">Keystore &amp; Security</a></li>
            </ul>
          </div>

          {/* Column 2: Contracts & Dev */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '16px', letterSpacing: '0.04em' }}>
              CONTRACTS
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#9ea0b2' }}>
              <li>
                <a
                  href="https://testnet.monadscan.com/address/0x5B177FEF554dA84A86be62E45fb49BB52e6D6838"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  TapPayLedger <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://testnet.monadscan.com/address/0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  UsernameRegistry <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://faucet.monad.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Monad Faucet <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://docs.monad.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Monad Docs <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Hackathon & Team */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '16px', letterSpacing: '0.04em' }}>
              TEAM &amp; COMMUNITY
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#9ea0b2' }}>
              <li>
                <a
                  href="https://github.com/anuraggdubey/Tap-Pay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Code2 size={14} /> GitHub Repo
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/anuraggdubeyy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                >
                  @anuraggdubeyy
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/Misbahtwts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                >
                  @Misbahtwts
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/AdityaNishad987"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                >
                  @AdityaNishad987
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            paddingTop: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '13px',
            color: '#67697b',
          }}
        >
          <div>
            Built at <strong>Monad India Blitz V4</strong> · MIT Licensed Open Source.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Settling in ~1s on Monad Testnet</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
};
