import React, { useState } from 'react';
import { ArrowUpRight, Radio, Check, RotateCcw, Zap, ExternalLink } from 'lucide-react';

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
        <div style={{ textAlign: 'center', marginBottom: '60px' }} className="scroll-reveal">
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
              background: '#E2DDFE',
              color: '#3C315B',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            <span>Live APDU &amp; Monad Ledger</span>
          </div>
        </div>

        {/* Large Stage Card (Silk White) */}
        <div
          className="scroll-reveal-scale"
          style={{
            background: '#FDFCFE',
            borderRadius: '32px',
            padding: '50px 40px',
            boxShadow: '0 10px 40px rgba(60, 49, 91, 0.08)',
            maxWidth: '1080px',
            margin: '0 auto',
          }}
        >
          {/* Action Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px',
              paddingBottom: '32px',
              borderBottom: '1px solid rgba(60, 49, 91, 0.08)',
              marginBottom: '40px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#3C315B' }}>Amount to Tap:</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#F5F3FF',
                  padding: '8px 16px',
                  borderRadius: '9999px',
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

            <div>
              {step === 'idle' ? (
                <button
                  onClick={startTap}
                  className="phantom-btn-pill"
                  style={{
                    background: '#3C315B',
                    color: '#FFFDF8',
                    padding: '14px 32px',
                    fontSize: '15px',
                  }}
                >
                  <Radio size={18} />
                  <span>Tap Phones Together</span>
                </button>
              ) : step === 'settled' ? (
                <button
                  onClick={reset}
                  className="phantom-btn-pill"
                  style={{
                    background: '#E2DDFE',
                    color: '#3C315B',
                    padding: '14px 28px',
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
                    padding: '12px 24px',
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
              gap: '24px',
              alignItems: 'center',
            }}
            className="sim-dual-phones"
          >
            {/* Sender Device */}
            <div
              style={{
                background: '#F8F7FF',
                borderRadius: '24px',
                padding: '28px',
                border: step === 'broadcasting' ? '2px solid #836EF9' : '1px solid rgba(60, 49, 91, 0.08)',
                transition: 'border 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#836EF9', letterSpacing: '0.04em' }}>
                  SENDER PHONE
                </span>
                <span style={{ fontSize: '11px', color: '#9890B4' }}>NFC Reader</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
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
                  <div style={{ fontSize: '11px', color: '#9890B4' }}>0x1406...Fa002</div>
                </div>
              </div>

              <div style={{ background: '#FFFDF8', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#9890B4', marginBottom: '2px' }}>Balance</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#3C315B' }}>
                  {senderBal} <span style={{ fontSize: '15px', color: '#836EF9' }}>MON</span>
                </div>
              </div>

              {step === 'settled' ? (
                <div style={{ background: '#ECFDF5', color: '#047857', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Check size={16} />
                  <span>Sent {amount} MON via NFC</span>
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#9890B4', padding: '12px' }}>
                  {step === 'idle' ? 'Ready to tap...' : 'Reading receiver card...'}
                </div>
              )}
            </div>

            {/* Middle Proximity Indicator */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
              <Radio
                size={38}
                color={step !== 'idle' ? '#836EF9' : '#A39CC2'}
                strokeWidth={2}
                style={{
                  transition: 'all 0.3s ease',
                  transform: step !== 'idle' ? 'scale(1.2)' : 'scale(1)',
                  filter: step !== 'idle' ? 'drop-shadow(0 0 16px rgba(131, 110, 249, 0.6))' : 'none',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#3C315B', marginTop: '12px' }}>
                {step === 'settled' ? 'CONFIRMED' : 'PROXIMITY'}
              </span>
            </div>

            {/* Receiver Device */}
            <div
              style={{
                background: '#F8F7FF',
                borderRadius: '24px',
                padding: '28px',
                border: step === 'settled' ? '2px solid #10B981' : '1px solid rgba(60, 49, 91, 0.08)',
                transition: 'border 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', letterSpacing: '0.04em' }}>
                  RECEIVER PHONE
                </span>
                <span style={{ fontSize: '11px', color: '#9890B4' }}>HCE Terminal</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
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
                  <div style={{ fontSize: '11px', color: '#9890B4' }}>0xEebB...1aDD</div>
                </div>
              </div>

              <div style={{ background: '#FFFDF8', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#9890B4', marginBottom: '2px' }}>Balance</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#3C315B' }}>
                  {receiverBal} <span style={{ fontSize: '15px', color: '#059669' }}>MON</span>
                </div>
              </div>

              {step === 'settled' ? (
                <div style={{ background: '#ECFDF5', color: '#047857', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Check size={16} />
                  <span>Received +{amount} MON</span>
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#9890B4', padding: '12px' }}>
                  {step === 'idle' ? 'Emulating contactless card...' : 'Receiving payment on Monad...'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .sim-dual-phones {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
