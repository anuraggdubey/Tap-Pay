import React from 'react';
import { Smartphone, UserPlus, Droplets, Radio, CheckCircle, ArrowRight } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Generate Wallet in 1 Tap',
      desc: 'Open TapPay. The app generates an Ethereum-compatible keypair on device and saves it directly into Android Keystore (react-native-keychain). No seed phrase stress.',
      tag: '100% SELF-CUSTODIAL',
      icon: Smartphone,
    },
    {
      num: '02',
      title: 'Claim Your @username',
      desc: 'Register a human-readable on-chain alias (e.g., @anurag) via UsernameRegistry.sol. Your handle maps permanently to your 0x address for instant discovery.',
      tag: 'ON-CHAIN IDENTITY',
      icon: UserPlus,
    },
    {
      num: '03',
      title: 'Fund with Testnet MON',
      desc: 'Request free testnet MON tokens from the official Monad Faucet (faucet.monad.xyz). Test transactions with zero real money risk on Chain ID 10143.',
      tag: 'MONAD TESTNET',
      icon: Droplets,
    },
    {
      num: '04',
      title: 'Hold Phones Back-to-Back',
      desc: 'Receiver taps "Receive Tap" (broadcasting HCE). Sender enters amount, touches phones together, and TapPayLedger settles the native MON payment in ~1 second.',
      tag: 'CONTACTLESS SETTLEMENT',
      icon: Radio,
    },
  ];

  return (
    <section
      id="how-it-works"
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
            <CheckCircle size={14} color="#836ef9" />
            <span>Step-by-Step Guide</span>
          </div>
          <h2
            style={{
              fontSize: 'clamp(32px, 4vw, 50px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              marginBottom: '16px',
            }}
          >
            How <span className="gradient-text-purple">TapPay</span> Works
          </h2>
          <p style={{ color: '#9ea0b2', fontSize: '17px', lineHeight: 1.6 }}>
            From installation to your first contactless tap payment in under 60 seconds.
          </p>
        </div>

        {/* 4 Step Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}
        >
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div
                key={i}
                className="glass-panel"
                style={{
                  padding: '36px 26px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Big Step Number Watermark */}
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '20px',
                    fontSize: '44px',
                    fontWeight: 900,
                    color: 'rgba(255, 255, 255, 0.04)',
                    userSelect: 'none',
                  }}
                >
                  {st.num}
                </div>

                <div>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, rgba(131, 110, 249, 0.2), rgba(131, 110, 249, 0.05))',
                      border: '1px solid rgba(131, 110, 249, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ab9ff2',
                      marginBottom: '24px',
                    }}
                  >
                    <Icon size={22} />
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#836ef9',
                      letterSpacing: '0.04em',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    {st.tag}
                  </span>

                  <h3
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      marginBottom: '12px',
                      color: '#ffffff',
                    }}
                  >
                    {st.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: '#9ea0b2',
                    }}
                  >
                    {st.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
