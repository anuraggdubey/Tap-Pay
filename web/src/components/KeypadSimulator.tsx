import React, { useState } from 'react';
import { AtSign, Send, CheckCircle2, Delete } from 'lucide-react';

export const KeypadSimulator: React.FC = () => {
  const [val, setVal] = useState('10');
  const [targetUser, setTargetUser] = useState('aditya');
  const [isSent, setIsSent] = useState(false);

  const handlePress = (char: string) => {
    if (isSent) setIsSent(false);

    if (char === 'DEL') {
      setVal((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (char === '.') {
      if (!val.includes('.')) setVal((prev) => prev + '.');
      return;
    }
    if (val === '0') {
      setVal(char);
    } else if (val.length < 7) {
      setVal((prev) => prev + char);
    }
  };

  const handleSend = () => {
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setVal('10');
    }, 3500);
  };

  return (
    <section
      style={{
        padding: '90px 0',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '50px',
            alignItems: 'center',
          }}
          className="keypad-grid"
        >
          {/* Left: Explanatory Copy */}
          <div>
            <div className="badge-pill" style={{ marginBottom: '16px' }}>
              <AtSign size={14} color="#836ef9" />
              <span>Username &amp; Direct Send Rail</span>
            </div>
            <h2
              style={{
                fontSize: 'clamp(32px, 4vw, 46px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                marginBottom: '20px',
              }}
            >
              Don't have phones touching?
              <br />
              <span className="gradient-text-purple">Pay by @username.</span>
            </h2>
            <p
              style={{
                color: '#9ea0b2',
                fontSize: '17px',
                lineHeight: 1.6,
                marginBottom: '28px',
              }}
            >
              TapPay includes a dedicated Cash App–style numeric keypad. Search your friend’s handle, punch in the amount, and broadcast directly to <code>UsernameRegistry.sol</code> with 1-second finality.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#836ef9' }} />
                <span style={{ fontSize: '15px', color: '#e2e4ed' }}>
                  Decentralized registry mapped to EVM addresses
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#836ef9' }} />
                <span style={{ fontSize: '15px', color: '#e2e4ed' }}>
                  Reverse lookup on transaction receipts &amp; history
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#836ef9' }} />
                <span style={{ fontSize: '15px', color: '#e2e4ed' }}>
                  Tactile haptic feedback on physical Android keypad
                </span>
              </div>
            </div>
          </div>

          {/* Right: Interactive Keypad Component */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '360px',
                padding: '30px 24px',
                borderRadius: '32px',
                background: 'rgba(16, 17, 26, 0.95)',
                border: '1px solid rgba(131, 110, 249, 0.3)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              }}
            >
              {/* Recipient Picker */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '10px 16px',
                  borderRadius: '16px',
                  marginBottom: '20px',
                }}
              >
                <AtSign size={16} color="#836ef9" />
                <input
                  type="text"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value.toLowerCase())}
                  placeholder="recipient username"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 700,
                    outline: 'none',
                    width: '100%',
                  }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#22c55e',
                    background: 'rgba(34, 197, 94, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  VERIFIED
                </span>
              </div>

              {/* Display Value */}
              <div style={{ textAlign: 'center', margin: '24px 0 28px' }}>
                <div style={{ fontSize: '12px', color: '#9ea0b2', marginBottom: '4px' }}>SENDING</div>
                <div
                  style={{
                    fontSize: '44px',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: '#ffffff',
                  }}
                >
                  {val} <span style={{ fontSize: '20px', color: '#836ef9' }}>MON</span>
                </div>
              </div>

              {/* Sent Confirmation Alert */}
              {isSent ? (
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '20px',
                    padding: '30px 20px',
                    textAlign: 'center',
                    color: '#22c55e',
                  }}
                >
                  <CheckCircle2 size={36} style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>Payment Sent!</div>
                  <div style={{ fontSize: '12px', color: '#e2e4ed', marginTop: '4px' }}>
                    {val} MON sent to @{targetUser} on Monad
                  </div>
                </div>
              ) : (
                <>
                  {/* Numeric Keypad Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px',
                      marginBottom: '20px',
                    }}
                  >
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((char) => (
                      <button
                        key={char}
                        onClick={() => handlePress(char)}
                        style={{
                          height: '56px',
                          borderRadius: '16px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          color: '#ffffff',
                          fontSize: '20px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(131, 110, 249, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(131, 110, 249, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                      >
                        {char === 'DEL' ? <Delete size={20} /> : char}
                      </button>
                    ))}
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    className="btn-phantom-purple"
                    style={{ width: '100%', padding: '14px', borderRadius: '16px' }}
                  >
                    <Send size={18} />
                    <span>Send {val} MON to @{targetUser}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .keypad-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
