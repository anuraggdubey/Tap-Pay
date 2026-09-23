import React, { useState } from 'react';
import { Radio, AtSign, Shield, Zap, Check, ArrowRight } from 'lucide-react';

export const FeatureSlider: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  const features = [
    {
      id: 0,
      icon: Radio,
      tag: 'NFC TAP-TO-PAY',
      title: 'Phone-to-phone contact without terminals',
      desc: 'The sender phone reads the receiver’s address over NFC Host Card Emulation (HCE), then automatically broadcasts payWithLog to TapPayLedger. No POS machine required.',
      details: [
        'Android HostApduService HCE terminal emulation',
        'ISO-DEP / APDU protocol exchange in 250ms',
        'Atomic pass-through on-chain settlement',
      ],
      previewType: 'nfc',
    },
    {
      id: 1,
      icon: AtSign,
      tag: 'USERNAME REGISTRY',
      title: 'Pay friends instantly using @username',
      desc: 'Forget tedious 42-character hex addresses. Claim your on-chain handle with UsernameRegistry.sol and send native MON with a tactile Cash App–style keypad.',
      details: [
        'On-chain mapping (UsernameRegistry.sol)',
        'Reverse lookup on all transaction receipts',
        'Cash App–style fluid numeric entry',
      ],
      previewType: 'username',
    },
    {
      id: 2,
      icon: Shield,
      tag: 'NON-CUSTODIAL',
      title: 'Secured by Android Hardware Keystore',
      desc: 'Your private keys never leave your physical device. Protected by Android Keystore and biometric auth via react-native-keychain. No custodial balances, zero middleman risk.',
      details: [
        'Hardware-backed Android Keystore integration',
        'Non-custodial: funds go directly to recipient',
        'ReentrancyGuard & session-based replay protection',
      ],
      previewType: 'security',
    },
    {
      id: 3,
      icon: Zap,
      tag: 'MONAD TESTNET',
      title: '~1s Finality with Native MON Settling',
      desc: 'Built specifically for Monad’s parallelized EVM architecture. Payments settle with near-instant finality and negligible gas fees on Monad Testnet (Chain ID 10143).',
      details: [
        '10,000 TPS parallelized execution pipeline',
        '1-second block finality for instant receipts',
        'Standard EVM compatibility with ethers.js v6',
      ],
      previewType: 'monad',
    },
  ];

  const current = features[activeTab];

  return (
    <section
      id="features"
      style={{
        padding: '100px 0',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 60px' }}>
          <div className="badge-pill" style={{ marginBottom: '16px' }}>
            <Zap size={14} color="#836ef9" />
            <span>Built for Speed &amp; Self-Custody</span>
          </div>
          <h2
            style={{
              fontSize: 'clamp(32px, 4vw, 50px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              marginBottom: '16px',
            }}
          >
            Engineering contactless crypto on <span className="gradient-text-purple">Android</span>
          </h2>
          <p style={{ color: '#9ea0b2', fontSize: '17px', lineHeight: 1.6 }}>
            TapPay blends native mobile hardware capabilities with high-throughput smart contract rails.
          </p>
        </div>

        {/* Feature Tab Selector (Phantom Pill Selector) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '40px',
          }}
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            const isActive = activeTab === feat.id;
            return (
              <button
                key={feat.id}
                onClick={() => setActiveTab(feat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.25s ease',
                  background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#0a0b0e' : '#9ea0b2',
                  border: isActive ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isActive ? '0 4px 20px rgba(255, 255, 255, 0.25)' : 'none',
                }}
              >
                <Icon size={16} color={isActive ? '#0a0b0e' : '#836ef9'} />
                <span>{feat.tag}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Feature Display Showcase */}
        <div
          className="glass-panel feature-showcase-grid"
          style={{
            padding: '48px',
            background: 'linear-gradient(135deg, rgba(20, 21, 32, 0.95) 0%, rgba(13, 14, 22, 0.98) 100%)',
            border: '1px solid rgba(131, 110, 249, 0.25)',
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          {/* Left: Text & Specs */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#ab9ff2',
                letterSpacing: '0.06em',
                marginBottom: '12px',
              }}
            >
              {current.tag}
            </div>
            <h3
              style={{
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                marginBottom: '18px',
              }}
            >
              {current.title}
            </h3>
            <p
              style={{
                fontSize: '16px',
                lineHeight: 1.6,
                color: '#9ea0b2',
                marginBottom: '28px',
              }}
            >
              {current.desc}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '30px' }}>
              {current.details.map((detail, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#22c55e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} />
                  </div>
                  <span style={{ fontSize: '14px', color: '#e2e4ed', fontWeight: 500 }}>{detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Visual Demonstration Card */}
          <div
            style={{
              background: 'rgba(10, 11, 17, 0.8)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '30px',
              minHeight: '340px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {current.previewType === 'nfc' && (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(131, 110, 249, 0.3) 0%, rgba(131, 110, 249, 0.05) 70%)',
                    border: '2px solid #836ef9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: '0 0 40px rgba(131, 110, 249, 0.5)',
                  }}
                >
                  <Radio size={44} color="#836ef9" />
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>HCE Tap Handshake</div>
                <div style={{ fontSize: '13px', color: '#9ea0b2', marginBottom: '16px' }}>
                  AID: <code>F00102030405</code> · APDU ISO-DEP
                </div>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#ab9ff2',
                    display: 'inline-block',
                  }}
                >
                  payWithLog(0xEebB...1aDD, sessionHash)
                </div>
              </div>
            )}

            {current.previewType === 'username' && (
              <div style={{ width: '100%', maxWidth: '300px' }}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#9ea0b2', marginBottom: '6px' }}>SEARCH USERNAME</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AtSign size={18} color="#836ef9" />
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>aditya</span>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                      FOUND
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    textAlign: 'center',
                  }}
                >
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((num, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '12px',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {current.previewType === 'security' && (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '24px',
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '2px solid rgba(34, 197, 94, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}
                >
                  <Shield size={40} color="#22c55e" />
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Hardware Keystore</div>
                <div style={{ fontSize: '13px', color: '#9ea0b2', marginBottom: '16px', maxWidth: '280px', margin: '0 auto 16px' }}>
                  Private keys generated within Android Secure Element. Never leaves the phone.
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e',
                    padding: '4px 12px',
                    borderRadius: '20px',
                  }}
                >
                  react-native-keychain
                </span>
              </div>
            )}

            {current.previewType === 'monad' && (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div
                  style={{
                    fontSize: '60px',
                    fontWeight: 900,
                    color: '#836ef9',
                    lineHeight: 1,
                    marginBottom: '8px',
                    letterSpacing: '-0.04em',
                  }}
                >
                  ~1.0s
                </div>
                <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>Block Finality</div>
                <div style={{ fontSize: '13px', color: '#9ea0b2', marginBottom: '20px' }}>
                  Chain ID: <code>10143</code> · Monad Testnet
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px 14px', borderRadius: '10px', fontSize: '12px' }}>
                    10,000 TPS
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px 14px', borderRadius: '10px', fontSize: '12px' }}>
                    Asynchronous I/O
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .feature-showcase-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
