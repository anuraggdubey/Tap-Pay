import React, { useState } from 'react';
import { ArrowUpRight, ShieldCheck, Lock, ExternalLink, Copy, Check } from 'lucide-react';

export const SecurityBento: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyAddress = (addr: string, id: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section
      id="security"
      style={{
        background: '#1F1934',
        color: '#FFFDF8',
        padding: '120px 0',
        position: 'relative',
        transition: 'background 0.3s ease',
      }}
    >
      <div className="phantom-container">
        {/* Phantom Section Title */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 className="phantom-section-title is-dark">
            Controlled by you,
            <br />
            secured by <span style={{ display: 'inline-flex', verticalAlign: 'middle', padding: '0 8px' }}>
              <Lock size={48} color="#AB9FF2" />
            </span> Keystore.
          </h2>

          <a
            href="https://testnet.monadscan.com/address/0x5B177FEF554dA84A86be62E45fb49BB52e6D6838"
            target="_blank"
            rel="noopener noreferrer"
            className="phantom-see-more"
            style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#FFFDF8' }}
          >
            <span>View Contracts</span>
            <ArrowUpRight size={16} />
          </a>
        </div>

        {/* 3 Large Off-White Cards in Dark Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Card 1: Self Custodial Guarantee */}
          <div className="phantom-card-wrapper">
            <div className="phantom-card-shadow-layer" style={{ background: '#0D0D12' }} />
            <div
              className="phantom-card-main"
              style={{
                background: '#FFFDF9',
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
                  ZERO CUSTODY
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '16px',
                  }}
                >
                  Self-custodial means you control your funds. We never have access.
                </h3>
                <p style={{ color: '#6C628A', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                  TapPay does not hold a single token in escrow. Every payment executes atomically between sender and receiver via TapPayLedger.
                </p>
              </div>

              <div
                style={{
                  background: '#F5F3FF',
                  borderRadius: '20px',
                  padding: '18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#6C628A',
                }}
              >
                ✓ ReentrancyGuard protected<br />
                ✓ Session replay protection<br />
                ✓ Direct peer-to-peer delivery
              </div>
            </div>
          </div>

          {/* Card 2: Hardware Secure Element */}
          <div className="phantom-card-wrapper">
            <div className="phantom-card-shadow-layer" style={{ background: '#0D0D12' }} />
            <div
              className="phantom-card-main"
              style={{
                background: '#FFFDF9',
                color: '#3C315B',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#10B981',
                    marginBottom: '12px',
                  }}
                >
                  ANDROID KEYSTORE
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '16px',
                  }}
                >
                  Private keys never leave your physical device.
                </h3>
                <p style={{ color: '#6C628A', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                  Keys are generated using standard ethers.js curves and sealed in the hardware Secure Element via react-native-keychain.
                </p>
              </div>

              <div
                style={{
                  background: '#ECFDF5',
                  borderRadius: '20px',
                  padding: '18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#047857',
                }}
              >
                ✓ Biometric / PIN authorization<br />
                ✓ No cloud backup vulnerability<br />
                ✓ Zero third-party telemetry
              </div>
            </div>
          </div>

          {/* Card 3: Deployed Contracts */}
          <div className="phantom-card-wrapper">
            <div className="phantom-card-shadow-layer" style={{ background: '#0D0D12' }} />
            <div
              className="phantom-card-main"
              style={{
                background: '#FFFDF9',
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
                  MONAD TESTNET
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '16px',
                  }}
                >
                  Publicly deployed &amp; verified smart contracts.
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    background: '#F0F9FF',
                    borderRadius: '16px',
                    padding: '14px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0369A1', marginBottom: '4px' }}>TapPayLedger.sol</div>
                  <div style={{ fontFamily: 'monospace', color: '#64748B', wordBreak: 'break-all' }}>
                    0x5B177FEF554dA84A86be62E45fb49BB52e6D6838
                  </div>
                  <button
                    onClick={() => copyAddress('0x5B177FEF554dA84A86be62E45fb49BB52e6D6838', 'ledger')}
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0284C7',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copied === 'ledger' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied === 'ledger' ? 'Copied' : 'Copy Address'}</span>
                  </button>
                </div>

                <div
                  style={{
                    background: '#F5F3FF',
                    borderRadius: '16px',
                    padding: '14px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#6D28D9', marginBottom: '4px' }}>UsernameRegistry.sol</div>
                  <div style={{ fontFamily: 'monospace', color: '#64748B', wordBreak: 'break-all' }}>
                    0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD
                  </div>
                  <button
                    onClick={() => copyAddress('0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD', 'registry')}
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#7C3AED',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copied === 'registry' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied === 'registry' ? 'Copied' : 'Copy Address'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
