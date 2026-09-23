import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, ExternalLink, Lock, Cpu, Database } from 'lucide-react';

export const SecurityBento: React.FC = () => {
  const [copiedContract, setCopiedContract] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContract(id);
    setTimeout(() => setCopiedContract(null), 2500);
  };

  return (
    <section
      id="security"
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
            <ShieldCheck size={14} color="#836ef9" />
            <span>Smart Contracts &amp; Security</span>
          </div>
          <h2
            style={{
              fontSize: 'clamp(32px, 4vw, 50px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              marginBottom: '16px',
            }}
          >
            Verified On-Chain Architecture
          </h2>
          <p style={{ color: '#9ea0b2', fontSize: '17px', lineHeight: 1.6 }}>
            TapPay is completely non-custodial. Funds flow atomically from sender to recipient through deployed, verified smart contracts on Monad Testnet.
          </p>
        </div>

        {/* Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '24px',
          }}
          className="bento-container"
        >
          {/* Bento 1: TapPayLedger Contract (8 cols) */}
          <div
            className="glass-panel"
            style={{
              gridColumn: 'span 8',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
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
                  PAYMENT SETTLEMENT RAIL
                </span>
                <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>● VERIFIED CONTRACT</span>
              </div>

              <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>TapPayLedger.sol</h3>
              <p style={{ color: '#9ea0b2', fontSize: '15px', lineHeight: 1.6, marginBottom: '20px' }}>
                Atomic settlement contract. When sender executes NFC or keypad pay, it triggers <code>payWithLog(to, sessionIdHash)</code>. Funds pass through atomically with zero escrow custody.
              </p>

              {/* Address Display Box */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: '#ab9ff2',
                  wordBreak: 'break-all',
                }}
              >
                <span>0x5B177FEF554dA84A86be62E45fb49BB52e6D6838</span>
                <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                  <button
                    onClick={() => copyToClipboard('0x5B177FEF554dA84A86be62E45fb49BB52e6D6838', 'ledger')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                    }}
                  >
                    {copiedContract === 'ledger' ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                    <span>{copiedContract === 'ledger' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href="https://testnet.monadscan.com/address/0x5B177FEF554dA84A86be62E45fb49BB52e6D6838"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(131, 110, 249, 0.15)',
                      color: '#ab9ff2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>Explorer</span>
                  </a>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '20px',
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: '13px', color: '#9ea0b2' }}>
                🛡️ <strong>ReentrancyGuard</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#9ea0b2' }}>
                🔄 <strong>Replay Protection</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#9ea0b2' }}>
                🚫 <strong>Zero Custody</strong>
              </div>
            </div>
          </div>

          {/* Bento 2: UsernameRegistry Contract (4 cols) */}
          <div
            className="glass-panel"
            style={{
              gridColumn: 'span 4',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                  }}
                >
                  DECENTRALIZED IDENTITY
                </span>
              </div>

              <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>UsernameRegistry</h3>
              <p style={{ color: '#9ea0b2', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                On-chain registry mapping unique handles to Monad wallet addresses and powering recipient lookups.
              </p>

              <div
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#38bdf8',
                  wordBreak: 'break-all',
                  marginBottom: '14px',
                }}
              >
                0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => copyToClipboard('0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD', 'registry')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '13px',
                }}
              >
                {copiedContract === 'registry' ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                <span>{copiedContract === 'registry' ? 'Copied' : 'Copy Address'}</span>
              </button>
              <a
                href="https://testnet.monadscan.com/address/0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                }}
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Bento 3: Android Keystore (6 cols) */}
          <div
            className="glass-panel"
            style={{
              gridColumn: 'span 6',
              padding: '32px',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Lock size={20} />
            </div>
            <h4 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '8px' }}>Hardware Secure Element</h4>
            <p style={{ color: '#9ea0b2', fontSize: '14px', lineHeight: 1.6 }}>
              Private keys are generated using <code>ethers.js</code> and immediately sealed inside Android Keystore via <code>react-native-keychain</code>. The private key never traverses network layers or touches any cloud servers.
            </p>
          </div>

          {/* Bento 4: Monad Network Parameters (6 cols) */}
          <div
            className="glass-panel"
            style={{
              gridColumn: 'span 6',
              padding: '32px',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Cpu size={20} />
            </div>
            <h4 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '8px' }}>Monad Testnet Specs</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9ea0b2' }}>CHAIN ID</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>10143</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9ea0b2' }}>CURRENCY</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#836ef9' }}>MON</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9ea0b2' }}>FINALITY</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#22c55e' }}>~1s</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .bento-container {
            grid-template-columns: 1fr !important;
          }
          .bento-container > div {
            grid-column: span 1 !important;
          }
        }
      `}</style>
    </section>
  );
};
