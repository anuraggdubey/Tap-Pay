import React, { useState } from 'react';
import { ArrowUpRight, Radio, AtSign, Zap, Check, RotateCcw } from 'lucide-react';

export const FeatureSlider: React.FC = () => {
  // Interactive mini simulation for Card 1
  const [tapStep, setTapStep] = useState<'idle' | 'tapping' | 'done'>('idle');
  const [keypadAmount, setKeypadAmount] = useState('15');

  const triggerTap = () => {
    setTapStep('tapping');
    setTimeout(() => {
      setTapStep('done');
    }, 1200);
  };

  return (
    <section
      id="how-it-works"
      style={{
        padding: '120px 0 80px',
        position: 'relative',
      }}
    >
      <div className="phantom-container">
        {/* Phantom Big Section Title */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 className="phantom-section-title">
            Contactless tools
            <br />
            for <span style={{ display: 'inline-flex', verticalAlign: 'middle', padding: '0 8px' }}>
              <Radio size={48} color="#836EF9" />
            </span> everyone
          </h2>

          {/* Signature Phantom 'See more ↗' Pill */}
          <a href="#demo" className="phantom-see-more">
            <span>See more</span>
            <ArrowUpRight size={16} />
          </a>
        </div>

        {/* 3 Horizontal Phantom Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
          }}
          className="phantom-cards-grid"
        >
          {/* Card 1: Tap to Pay (Lavender Card with Stacked Shadow Layer) */}
          <div className="phantom-card-wrapper">
            <div className="phantom-card-shadow-layer" />
            <div
              className="phantom-card-main"
              style={{
                background: '#EAE6FE',
                color: '#3C315B',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#836EF9',
                    marginBottom: '12px',
                  }}
                >
                  PHONE-TO-PHONE NFC
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '20px',
                  }}
                >
                  Pay and receive with an instant phone tap.
                </h3>
              </div>

              {/* Interactive Demonstration Area */}
              <div
                style={{
                  background: '#FDFCFE',
                  borderRadius: '24px',
                  padding: '24px',
                  marginTop: '20px',
                  boxShadow: '0 8px 24px rgba(60, 49, 91, 0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#836EF9',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      M
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>@misbah</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#836EF9' }}>5.0 MON</span>
                </div>

                {tapStep === 'done' ? (
                  <div
                    style={{
                      background: 'rgba(34, 197, 94, 0.12)',
                      color: '#15803d',
                      borderRadius: '16px',
                      padding: '14px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Check size={18} />
                    <span>Payment Received via NFC!</span>
                  </div>
                ) : (
                  <button
                    onClick={triggerTap}
                    disabled={tapStep === 'tapping'}
                    className="phantom-btn-pill"
                    style={{
                      width: '100%',
                      background: '#3C315B',
                      color: '#FFFDF8',
                      padding: '12px',
                    }}
                  >
                    <Radio size={16} />
                    <span>{tapStep === 'tapping' ? 'Holding Phones Together...' : 'Try Phone Tap'}</span>
                  </button>
                )}

                {tapStep === 'done' && (
                  <button
                    onClick={() => setTapStep('idle')}
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      fontSize: '12px',
                      color: '#6C628A',
                      textAlign: 'center',
                    }}
                  >
                    Tap again
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Cash App Keypad (Soft Warm Cream) */}
          <div className="phantom-card-wrapper">
            <div className="phantom-card-shadow-layer" style={{ background: '#3C315B' }} />
            <div
              className="phantom-card-main"
              style={{
                background: '#FFF6E5',
                color: '#3C315B',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#D97706',
                    marginBottom: '12px',
                  }}
                >
                  USERNAME REGISTRY
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '20px',
                  }}
                >
                  Send money to friends with @username.
                </h3>
              </div>

              {/* Mini Keypad UI */}
              <div
                style={{
                  background: '#FDFCFE',
                  borderRadius: '24px',
                  padding: '20px',
                  marginTop: '20px',
                  boxShadow: '0 8px 24px rgba(60, 49, 91, 0.06)',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#9890B4', marginBottom: '2px' }}>TO @ADITYA</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#3C315B' }}>
                    {keypadAmount} <span style={{ fontSize: '16px', color: '#836EF9' }}>MON</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                  }}
                >
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        if (k === 'C') setKeypadAmount('0');
                        else if (k === '⌫') setKeypadAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
                        else setKeypadAmount((prev) => (prev === '0' ? k : prev + k));
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: '#F5F3FF',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#3C315B',
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Monad Settlement (Soft Sky Blue) */}
          <div className="phantom-card-wrapper">
            <div className="phantom-card-shadow-layer" style={{ background: '#0D0D12' }} />
            <div
              className="phantom-card-main"
              style={{
                background: '#E2EFFE',
                color: '#3C315B',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#2563EB',
                    marginBottom: '12px',
                  }}
                >
                  HIGH THROUGHPUT
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '20px',
                  }}
                >
                  Settled on Monad in ~1 second.
                </h3>
              </div>

              {/* Telemetry Display */}
              <div
                style={{
                  background: '#FDFCFE',
                  borderRadius: '24px',
                  padding: '24px',
                  marginTop: '20px',
                  boxShadow: '0 8px 24px rgba(60, 49, 91, 0.06)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '48px', fontWeight: 900, color: '#2563EB', lineHeight: 1, marginBottom: '6px' }}>
                  ~1.0s
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#3C315B', marginBottom: '4px' }}>
                  On-Chain Finality
                </div>
                <div style={{ fontSize: '12px', color: '#6C628A', marginBottom: '16px' }}>
                  Chain ID: 10143 · TapPayLedger.sol
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, background: '#E2EFFE', color: '#2563EB', padding: '4px 10px', borderRadius: '9999px' }}>
                    10,000 TPS
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, background: '#E2EFFE', color: '#2563EB', padding: '4px 10px', borderRadius: '9999px' }}>
                    Zero Escrow
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
