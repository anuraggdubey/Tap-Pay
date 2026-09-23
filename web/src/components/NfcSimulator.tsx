import React, { useState, useEffect } from 'react';
import { Radio, ArrowRight, CheckCircle2, RotateCcw, Zap, ExternalLink, ShieldCheck } from 'lucide-react';

export const NfcSimulator: React.FC = () => {
  const [step, setStep] = useState<'idle' | 'tapping' | 'broadcasting' | 'settled'>('idle');
  const [amount, setAmount] = useState('2.5');
  const [senderBalance, setSenderBalance] = useState(142.5);
  const [receiverBalance, setReceiverBalance] = useState(8.0);
  const [txHash, setTxHash] = useState('0x7f9a...3b4c');

  const runSimulation = () => {
    if (step !== 'idle') return;

    setStep('tapping');

    // Step 1: NFC Handshake (1.2s)
    setTimeout(() => {
      setStep('broadcasting');

      // Step 2: Monad ledger settlement (1.0s)
      setTimeout(() => {
        setStep('settled');
        const num = parseFloat(amount) || 2.5;
        setSenderBalance((prev) => +(prev - num).toFixed(2));
        setReceiverBalance((prev) => +(prev + num).toFixed(2));
        setTxHash('0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('').slice(0, 10) + '...monad');
      }, 1100);
    }, 1300);
  };

  const resetSimulation = () => {
    setStep('idle');
    setSenderBalance(142.5);
    setReceiverBalance(8.0);
  };

  return (
    <section
      id="demo"
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
            <Radio size={14} color="#836ef9" />
            <span>Interactive Live Simulation</span>
          </div>
          <h2
            style={{
              fontSize: 'clamp(32px, 4vw, 50px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              marginBottom: '16px',
            }}
          >
            Experience the <span className="gradient-text-purple">NFC Tap</span> in action
          </h2>
          <p style={{ color: '#9ea0b2', fontSize: '17px', lineHeight: 1.6 }}>
            See how two Android phones execute contactless Host Card Emulation and settle atomic MON funds on-chain in 1 second.
          </p>
        </div>

        {/* Simulation Sandbox Panel */}
        <div
          className="glass-panel-glow"
          style={{
            maxWidth: '1040px',
            margin: '0 auto',
            padding: '40px 30px',
            background: 'linear-gradient(180deg, rgba(20, 21, 32, 0.95) 0%, rgba(13, 14, 21, 0.98) 100%)',
            border: '1px solid rgba(131, 110, 249, 0.3)',
            borderRadius: '32px',
          }}
        >
          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              paddingBottom: '30px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '40px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '14px', color: '#9ea0b2', fontWeight: 600 }}>Amount to Send:</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '6px 14px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
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
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 700,
                    width: '60px',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ab9ff2' }}>MON</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {step === 'idle' ? (
                <button
                  onClick={runSimulation}
                  className="btn-phantom-purple"
                  style={{ padding: '12px 28px', fontSize: '15px' }}
                >
                  <Radio size={18} />
                  <span>Simulate NFC Tap Now</span>
                </button>
              ) : step === 'settled' ? (
                <button
                  onClick={resetSimulation}
                  className="btn-phantom-secondary"
                  style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                  <RotateCcw size={16} />
                  <span>Reset Simulation</span>
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 20px',
                    background: 'rgba(131, 110, 249, 0.15)',
                    borderRadius: '9999px',
                    color: '#ab9ff2',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#836ef9',
                      animation: 'pulse 1s infinite',
                    }}
                  />
                  <span>
                    {step === 'tapping'
                      ? 'NFC Beam: Exchanging APDU keys...'
                      : 'Broadcasting payWithLog on Monad...'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Dual Phone Stage */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '24px',
              alignItems: 'center',
              position: 'relative',
            }}
            className="sim-stage"
          >
            {/* Phone 1: Sender (Anurag) */}
            <div
              className="glass-panel"
              style={{
                padding: '24px',
                borderRadius: '24px',
                background: 'rgba(16, 17, 26, 0.85)',
                border: step === 'broadcasting' ? '1px solid #836ef9' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: step === 'broadcasting' ? '0 0 30px rgba(131, 110, 249, 0.3)' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(131, 110, 249, 0.15)',
                    color: '#ab9ff2',
                  }}
                >
                  SENDER PHONE (NFC READER)
                </span>
                <span style={{ fontSize: '11px', color: '#67697b' }}>Android API 34</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #836ef9, #5037d8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '16px',
                  }}
                >
                  A
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>@anurag</div>
                  <div style={{ fontSize: '11px', color: '#67697b' }}>0x1406...Fa002</div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#9ea0b2', marginBottom: '4px' }}>MON Balance</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff' }}>
                  {senderBalance} <span style={{ fontSize: '15px', color: '#836ef9' }}>MON</span>
                </div>
              </div>

              {step === 'settled' ? (
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#22c55e',
                  }}
                >
                  <CheckCircle2 size={20} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Sent {amount} MON</div>
                    <div style={{ fontSize: '10px', opacity: 0.8 }}>Logged on TapPayLedger</div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: step === 'tapping' ? 'rgba(131, 110, 249, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '14px',
                    padding: '14px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: step === 'tapping' ? '#ab9ff2' : '#9ea0b2',
                  }}
                >
                  {step === 'idle' && 'Ready to Tap Sender...'}
                  {step === 'tapping' && '📡 Reading Receiver NFC Card...'}
                  {step === 'broadcasting' && '⚡ Signing & Broadcasting tx...'}
                </div>
              )}
            </div>

            {/* Middle: NFC Wave Handshake Channel */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 10px',
                minWidth: '120px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: step === 'tapping' || step === 'broadcasting' ? '#836ef9' : 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow:
                    step === 'tapping' || step === 'broadcasting'
                      ? '0 0 35px rgba(131, 110, 249, 0.8)'
                      : 'none',
                  transition: 'all 0.3s ease',
                  marginBottom: '10px',
                }}
              >
                <Radio
                  size={28}
                  color={step === 'tapping' || step === 'broadcasting' ? '#fff' : '#67697b'}
                />
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: step === 'settled' ? '#22c55e' : step !== 'idle' ? '#ab9ff2' : '#67697b',
                  textAlign: 'center',
                }}
              >
                {step === 'idle' && 'NFC PROXIMITY'}
                {step === 'tapping' && 'APDU BEAM'}
                {step === 'broadcasting' && '1s FINALITY'}
                {step === 'settled' && 'CONFIRMED'}
              </span>
            </div>

            {/* Phone 2: Receiver (Misbah) */}
            <div
              className="glass-panel"
              style={{
                padding: '24px',
                borderRadius: '24px',
                background: 'rgba(16, 17, 26, 0.85)',
                border: step === 'settled' ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: step === 'settled' ? '0 0 30px rgba(34, 197, 94, 0.25)' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e',
                  }}
                >
                  RECEIVER PHONE (HCE EMULATOR)
                </span>
                <span style={{ fontSize: '11px', color: '#67697b' }}>HostApduService</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '16px',
                  }}
                >
                  M
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>@misbah</div>
                  <div style={{ fontSize: '11px', color: '#67697b' }}>0xEebB...1aDD</div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#9ea0b2', marginBottom: '4px' }}>MON Balance</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff' }}>
                  {receiverBalance} <span style={{ fontSize: '15px', color: '#22c55e' }}>MON</span>
                </div>
              </div>

              {step === 'settled' ? (
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#22c55e',
                  }}
                >
                  <CheckCircle2 size={20} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Received +{amount} MON</div>
                    <div style={{ fontSize: '10px', opacity: 0.8 }}>Glow receipt generated</div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '14px',
                    padding: '14px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#9ea0b2',
                  }}
                >
                  {step === 'idle' && 'Waiting for Tap contact...'}
                  {step === 'tapping' && 'Broadcasting AID F00102030405...'}
                  {step === 'broadcasting' && 'Verifying payment on Monad...'}
                </div>
              )}
            </div>
          </div>

          {/* Settlement Proof Footer */}
          {step === 'settled' && (
            <div
              style={{
                marginTop: '30px',
                padding: '16px 20px',
                background: 'rgba(131, 110, 249, 0.08)',
                border: '1px solid rgba(131, 110, 249, 0.25)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={18} color="#836ef9" />
                <span style={{ fontSize: '13px', color: '#e2e4ed' }}>
                  Settled on Monad Testnet in <strong>0.92 seconds</strong> · Tx: <code style={{ color: '#ab9ff2' }}>{txHash}</code>
                </span>
              </div>
              <a
                href="https://testnet.monadscan.com/address/0x5B177FEF554dA84A86be62E45fb49BB52e6D6838"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ab9ff2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>View on Monadscan</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .sim-stage {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
