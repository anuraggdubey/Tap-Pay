import React, { useState } from 'react';
import { ArrowUpRight, Smartphone, Radio, Layers, Check, AlertCircle } from 'lucide-react';

export const Prerequisites: React.FC = () => {
  const [deviceTest, setDeviceTest] = useState<'android' | 'ios'>('android');

  return (
    <section
      id="prerequisites"
      style={{
        padding: '100px 0 80px',
        position: 'relative',
      }}
    >
      <div className="phantom-container">
        {/* Section Title */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }} className="scroll-reveal">
          <h2 className="phantom-section-title">
            Spend, Send, &amp; <span style={{ display: 'inline-flex', verticalAlign: 'middle', padding: '0 8px' }}>
              <Smartphone size={52} color="var(--text-dark)" />
            </span> Tap
          </h2>

          <a href="#how-it-works" className="phantom-see-more">
            <span>Requirements</span>
            <ArrowUpRight size={16} />
          </a>
        </div>

        {/* 3 Horizontal Cards */}
        <div
          className="prereq-cards-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          {/* Card 1: Android Only (Sky Blue) */}
          <div className="phantom-card-wrapper scroll-reveal scroll-delay-1" data-parallax="0.04">
            <div className="phantom-card-shadow-layer" style={{ background: '#1D4ED8' }} />
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
                  SYSTEM OS
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '14px',
                  }}
                >
                  Android 10+ (API 34) Only.
                </h3>
                <p style={{ color: '#6C628A', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                  TapPay requires Android because Apple iOS restricts Host Card Emulation to Apple Pay, preventing phone-to-phone wallet reads.
                </p>
              </div>

              <div
                style={{
                  background: '#FDFCFE',
                  borderRadius: '20px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Check size={22} color="#2563EB" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>HostApduService Native</div>
                  <div style={{ fontSize: '11px', color: '#9890B4' }}>Full peer-to-peer NFC stack</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: NFC Chip (Lavender) */}
          <div className="phantom-card-wrapper scroll-reveal scroll-delay-2" data-parallax="-0.03">
            <div className="phantom-card-shadow-layer" style={{ background: '#684FF6' }} />
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
                  HARDWARE SENSOR
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '14px',
                  }}
                >
                  Physical NFC Chip Required.
                </h3>
                <p style={{ color: '#6C628A', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                  Your phone must have an integrated NFC chip toggled ON in Android settings to exchange APDU keys when held against another phone.
                </p>
              </div>

              <div
                style={{
                  background: '#FDFCFE',
                  borderRadius: '20px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Radio size={22} color="#836EF9" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>ISO-DEP APDU Protocol</div>
                  <div style={{ fontSize: '11px', color: '#9890B4' }}>Radio frequency communication</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Two Devices (Mint Green) */}
          <div className="phantom-card-wrapper scroll-reveal scroll-delay-3" data-parallax="0.04">
            <div className="phantom-card-shadow-layer" style={{ background: '#059669' }} />
            <div
              className="phantom-card-main"
              style={{
                background: '#E1F8F0',
                color: '#3C315B',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#059669',
                    marginBottom: '12px',
                  }}
                >
                  TESTING SETUP
                </div>
                <h3
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '14px',
                  }}
                >
                  Two Physical Phones Needed.
                </h3>
                <p style={{ color: '#6C628A', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                  For end-to-end tap payment testing, you need two physical Android devices (one as sender, one as receiver). Emulators cannot simulate NFC.
                </p>
              </div>

              <div
                style={{
                  background: '#FDFCFE',
                  borderRadius: '20px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Layers size={22} color="#10B981" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Sender &amp; Receiver Pair</div>
                  <div style={{ fontSize: '11px', color: '#9890B4' }}>Real physical contact testing</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Device Compatibility Checker Pill */}
        <div
          className="scroll-reveal"
          style={{
            background: '#FDFCFE',
            borderRadius: '24px',
            padding: '24px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            boxShadow: '0 8px 30px rgba(60, 49, 91, 0.06)',
          }}
        >
          <div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#3C315B', marginBottom: '4px' }}>
              Is your device compatible?
            </h4>
            <p style={{ fontSize: '14px', color: '#6C628A' }}>
              Select your mobile operating system to verify TapPay support.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setDeviceTest('android')}
              className="phantom-btn-pill"
              style={{
                background: deviceTest === 'android' ? 'var(--text-dark)' : 'var(--pill-bg)',
                color: deviceTest === 'android' ? '#FFFDF8' : 'var(--text-dark)',
              }}
            >
              <Check size={16} />
              <span>Android (Supported)</span>
            </button>

            <button
              onClick={() => setDeviceTest('ios')}
              className="phantom-btn-pill"
              style={{
                background: deviceTest === 'ios' ? '#EF4444' : 'var(--pill-bg)',
                color: deviceTest === 'ios' ? '#FFFFFF' : 'var(--text-dark)',
              }}
            >
              <span>iOS (Unsupported)</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .prereq-cards-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .prereq-cards-grid .phantom-card-main {
            padding: 28px 20px !important;
          }
          .prereq-cards-grid .phantom-card-shadow-layer {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
};
