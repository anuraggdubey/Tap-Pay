import React, { useState } from 'react';
import { Radio, Check, RotateCcw, Zap, ExternalLink, ArrowDown, Wifi } from 'lucide-react';

export const NfcSimulator: React.FC = () => {
  const [step, setStep] = useState<'idle' | 'tapping' | 'broadcasting' | 'settled'>('idle');
  const [amount, setAmount] = useState('2.5');
  const [senderBal, setSenderBal] = useState(142.5);
  const [receiverBal, setReceiverBal] = useState(8.0);
  const [txHash, setTxHash] = useState('0x7f9a...3b4c');

  const startTap = () => {
    if (step !== 'idle') return;
    setStep('tapping');

    setTimeout(() => {
      setStep('broadcasting');

      setTimeout(() => {
        setStep('settled');
        const num = parseFloat(amount) || 2.5;
        setSenderBal((prev) => +(prev - num).toFixed(2));
        setReceiverBal((prev) => +(prev + num).toFixed(2));
        setTxHash('0x' + Math.random().toString(16).slice(2, 10) + '...monad');
      }, 1000);
    }, 1200);
  };

  const reset = () => {
    setStep('idle');
    setSenderBal(142.5);
    setReceiverBal(8.0);
  };

  return (
    <section
      id="demo"
      style={{
        padding: '100px 0 80px',
        position: 'relative',
      }}
    >
      <div className="phantom-container">
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }} className="scroll-reveal">
          <h2 className="phantom-section-title">
            Interactive phone-to-phone
            <br />
            tap simulation
          </h2>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              borderRadius: '9999px',
              background: 'var(--pill-bg)',
              color: 'var(--pill-text)',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            <span>Live APDU &amp; Monad Ledger</span>
          </div>
        </div>

        {/* Large Stage Card (Silk White) */}
        <div
          className="scroll-reveal-scale sim-stage-card"
          style={{
            background: '#FDFCFE',
            borderRadius: '32px',
            padding: '44px 36px',
            boxShadow: '0 10px 40px rgba(26, 26, 26, 0.06)',
            maxWidth: '1080px',
            margin: '0 auto',
            border: '1px solid rgba(26, 26, 26, 0.08)',
          }}
        >
          {/* Action Row */}
          <div
            className="sim-action-row"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              paddingBottom: '28px',
              borderBottom: '1px solid rgba(60, 49, 91, 0.08)',
              marginBottom: '32px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#3C315B' }}>Amount to Tap:</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#F5F3FF',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(131, 110, 249, 0.15)',
                }}
              >
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={step !== 'idle'}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    width: '60px',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#3C315B',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#836EF9' }}>MON</span>
              </div>
            </div>

            <div className="sim-btn-wrapper">
              {step === 'idle' ? (
                <button
                  onClick={startTap}
                  className="phantom-btn-pill sim-action-btn"
                  style={{
                    background: '#3C315B',
                    color: '#FFFDF8',
                    padding: '14px 28px',
                    fontSize: '15px',
                    cursor: 'pointer',
                  }}
                >
                  <Radio size={18} />
                  <span>Tap Phones Together</span>
                </button>
              ) : step === 'settled' ? (
                <button
                  onClick={reset}
                  className="phantom-btn-pill sim-action-btn"
                  style={{
                    background: '#E2DDFE',
                    color: '#3C315B',
                    padding: '14px 28px',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Reset Demo</span>
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#F0EEFE',
                    color: '#3C315B',
                    padding: '12px 20px',
                    borderRadius: '9999px',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#836EF9',
                      animation: 'phantomFloat 1s infinite',
                    }}
                  />
                  <span>
                    {step === 'tapping'
                      ? 'NFC Beam: Exchanging AID F00102030405...'
                      : 'Broadcasting payWithLog to Monad...'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dual Phone Visualization Stage */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '20px',
              alignItems: 'center',
            }}
            className="sim-dual-phones"
          >
            {/* Sender Device */}
            <div
              className="sim-phone-card sim-sender-card"
              style={{
                background: '#F8F7FF',
                borderRadius: '24px',
                padding: '24px',
                border: step === 'broadcasting' ? '2px solid #836EF9' : '1px solid rgba(60, 49, 91, 0.08)',
                transition: 'all 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#836EF9', letterSpacing: '0.04em' }}>
                  SENDER PHONE
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: 'rgba(131, 110, 249, 0.1)',
                    color: '#836EF9',
                  }}
                >
                  NFC Reader
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#E2DDFE',
                    color: '#3C315B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px',
                  }}
                >
                  A
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#3C315B' }}>@anurag</div>
                  <div style={{ fontSize: '11px', color: '#9890B4', fontFamily: 'monospace' }}>0x1406...Fa002</div>
                </div>
              </div>

              <div style={{ background: '#FFFDF8', borderRadius: '16px', padding: '14px 16px', marginBottom: '14px', border: '1px solid rgba(60, 49, 91, 0.06)' }}>
                <div style={{ fontSize: '11px', color: '#9890B4', marginBottom: '2px', fontWeight: 500 }}>Balance</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#3C315B' }}>
                  {senderBal} <span style={{ fontSize: '14px', color: '#836EF9' }}>MON</span>
                </div>
              </div>

              {step === 'settled' ? (
                <div style={{ background: '#ECFDF5', color: '#047857', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Check size={16} />
                  <span>Sent {amount} MON via NFC</span>
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#9890B4', padding: '8px' }}>
                  {step === 'idle' ? 'Ready to tap...' : 'Reading receiver card...'}
                </div>
              )}
            </div>

            {/* Middle Proximity Indicator (Desktop & Mobile Adaptive) */}
            <div className="sim-proximity-bridge">
              {/* Desktop Horizontal View */}
              <div className="sim-desktop-proximity">
                <Radio
                  size={36}
                  color={step !== 'idle' ? '#836EF9' : '#A39CC2'}
                  strokeWidth={2}
                  style={{
                    transition: 'all 0.3s ease',
                    transform: step !== 'idle' ? 'scale(1.2)' : 'scale(1)',
                    filter: step !== 'idle' ? 'drop-shadow(0 0 16px rgba(131, 110, 249, 0.6))' : 'none',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: step === 'settled' ? '#059669' : '#3C315B',
                    marginTop: '10px',
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step === 'settled' ? 'CONFIRMED' : 'PROXIMITY'}
                </span>
              </div>

              {/* Mobile Vertical View (Zero sideways text!) */}
              <div className="sim-mobile-proximity">
                <div className="sim-mobile-bridge-line" />
                <div
                  className="sim-mobile-bridge-badge"
                  style={{
                    background: step === 'settled' ? '#ECFDF5' : step !== 'idle' ? '#F0EEFE' : '#F5F3FF',
                    borderColor: step === 'settled' ? '#A7F3D0' : step !== 'idle' ? '#C4B5FD' : 'rgba(60, 49, 91, 0.1)',
                  }}
                >
                  <Radio
                    size={16}
                    color={step === 'settled' ? '#059669' : step !== 'idle' ? '#836EF9' : '#71698E'}
                    strokeWidth={2}
                  />
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: step === 'settled' ? '#047857' : step !== 'idle' ? '#6D28D9' : '#5B5377',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {step === 'settled'
                      ? '✓ 1s ATOMIC SETTLEMENT'
                      : step === 'broadcasting'
                      ? '⚡ MONAD BROADCAST'
                      : step === 'tapping'
                      ? '((●)) NFC BEAM ACTIVE'
                      : '2–4 CM NFC TAP ZONE'}
                  </span>
                </div>
                <div className="sim-mobile-bridge-line" />
              </div>
            </div>

            {/* Receiver Device */}
            <div
              className="sim-phone-card sim-receiver-card"
              style={{
                background: '#F8F7FF',
                borderRadius: '24px',
                padding: '24px',
                border: step === 'settled' ? '2px solid #10B981' : '1px solid rgba(60, 49, 91, 0.08)',
                transition: 'all 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', letterSpacing: '0.04em' }}>
                  RECEIVER PHONE
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                  }}
                >
                  HCE Terminal
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#E1F8F0',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px',
                  }}
                >
                  M
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#3C315B' }}>@misbah</div>
                  <div style={{ fontSize: '11px', color: '#9890B4', fontFamily: 'monospace' }}>0xEebB...1aDD</div>
                </div>
              </div>

              <div style={{ background: '#FFFDF8', borderRadius: '16px', padding: '14px 16px', marginBottom: '14px', border: '1px solid rgba(60, 49, 91, 0.06)' }}>
                <div style={{ fontSize: '11px', color: '#9890B4', marginBottom: '2px', fontWeight: 500 }}>Balance</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#3C315B' }}>
                  {receiverBal} <span style={{ fontSize: '14px', color: '#059669' }}>MON</span>
                </div>
              </div>

              {step === 'settled' ? (
                <div style={{ background: '#ECFDF5', color: '#047857', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Check size={16} />
                  <span>Received +{amount} MON</span>
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#9890B4', padding: '8px' }}>
                  {step === 'idle' ? 'Emulating contactless card...' : 'Receiving payment on Monad...'}
                </div>
              )}
            </div>
          </div>

          {/* Settled Transaction Banner */}
          {step === 'settled' && (
            <div
              style={{
                marginTop: '28px',
                padding: '16px 20px',
                borderRadius: '16px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#22C55E',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                    Atomic Settlement Confirmed on Monad (~0.9s)
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803D', fontFamily: 'monospace' }}>
                    TxHash: {txHash} · Gas: ~0.0004 MON
                  </div>
                </div>
              </div>

              <a
                href="https://testnet.monadscan.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                }}
              >
                <span>MonadScan</span>
                <ExternalLink size={13} />
              </a>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Desktop styles */
        .sim-desktop-proximity {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 12px;
        }
        .sim-mobile-proximity {
          display: none;
        }

        /* Mobile styles */
        @media (max-width: 800px) {
          #demo {
            padding: 60px 0 60px !important;
          }
          .sim-stage-card {
            padding: 24px 16px !important;
            border-radius: 24px !important;
          }
          .sim-action-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
            margin-bottom: 24px !important;
            padding-bottom: 20px !important;
          }
          .sim-action-row > div:first-child {
            justify-content: space-between !important;
          }
          .sim-btn-wrapper {
            width: 100% !important;
          }
          .sim-action-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .sim-dual-phones {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }
          .sim-phone-card {
            padding: 20px 16px !important;
          }

          /* Hide desktop proximity and show mobile vertical bridge */
          .sim-desktop-proximity {
            display: none !important;
          }
          .sim-mobile-proximity {
            display: flex !important;
            align-items: center;
            justifyContent: center;
            margin: 14px 0 !important;
            width: 100% !important;
            position: relative;
          }
          .sim-mobile-bridge-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, rgba(131, 110, 249, 0.1), rgba(131, 110, 249, 0.4), rgba(131, 110, 249, 0.1));
          }
          .sim-mobile-bridge-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 9999px;
            border: 1px solid;
            box-shadow: 0 2px 10px rgba(60, 49, 91, 0.05);
            transition: all 0.25s ease;
          }
        }
      `}</style>
    </section>
  );
};
