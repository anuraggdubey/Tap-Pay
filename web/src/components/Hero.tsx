import React, { useState } from 'react';
import { Smartphone, Radio, Zap, ShieldCheck } from 'lucide-react';

interface HeroProps {
  onOpenDownload: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenDownload }) => {
  return (
    <section
      style={{
        paddingTop: '100px',
        paddingBottom: '40px',
        position: 'relative',
      }}
    >
      <div className="phantom-container">
        {/* Phantom Giant Inset Dark Hero Card */}
        <div className="phantom-hero-card">
          <div className="phantom-hero-bg" />

          {/* Floating Monad & NFC Orbiting Badges (Like Phantom's floating icons) */}
          <div
            style={{
              position: 'absolute',
              top: '15%',
              left: '8%',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              padding: '10px 18px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFDF8',
              pointerEvents: 'none',
            }}
            className="phantom-floating"
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#836EF9' }} />
            <span>Monad 10143</span>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '20%',
              right: '10%',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              padding: '10px 18px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFDF8',
              pointerEvents: 'none',
              animationDelay: '1.5s',
            }}
            className="phantom-floating"
          >
            <Radio size={14} color="#AB9FF2" />
            <span>NFC Host Card Emulation</span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '18%',
              left: '12%',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#A3A2B3',
              pointerEvents: 'none',
              animationDelay: '0.8s',
            }}
            className="phantom-floating"
          >
            ~1s Finality
          </div>

          {/* Centered Content (Exact Phantom Hierarchy) */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              textAlign: 'center',
              maxWidth: '880px',
              margin: '0 auto',
            }}
          >
            {/* Top Eyebrow Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px)',
                padding: '8px 20px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#FFFDF8',
                marginBottom: '28px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <span>Where Monad pays contactless</span>
            </div>

            {/* Headline (Warm Ivory, Exact Phantom Tone) */}
            <h1
              style={{
                fontSize: 'clamp(44px, 6.8vw, 84px)',
                lineHeight: 1.05,
                fontWeight: 400,
                letterSpacing: '-0.035em',
                color: '#FFFDF8',
                marginBottom: '36px',
              }}
            >
              Your home for contactless payments, instant tap, and more
            </h1>

            {/* Description Subtext */}
            <p
              style={{
                fontSize: 'clamp(17px, 2vw, 20px)',
                lineHeight: 1.6,
                color: '#A3A2B3',
                maxWidth: '620px',
                margin: '0 auto 40px',
              }}
            >
              The self-custodial Android wallet for instant phone-to-phone payments.
              Hold devices back-to-back to settle native MON on Monad Testnet with 1-second finality.
            </p>

            {/* Primary Action Button (Exact Phantom Pill CTA) */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button onClick={onOpenDownload} className="phantom-btn-hero">
                <Smartphone size={20} />
                <span>Download TapPay</span>
              </button>
            </div>
          </div>

          {/* Bottom Device Graphic Preview inside the Hero Card */}
          <div
            style={{
              marginTop: '60px',
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                background: 'linear-gradient(180deg, rgba(30, 24, 52, 0.9) 0%, rgba(18, 19, 29, 0.95) 100%)',
                borderRadius: '28px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '24px 28px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              }}
            >
              {/* Virtual TapPay Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#836EF9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    M
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFDF8' }}>@anurag</div>
                    <div style={{ fontSize: '11px', color: '#A3A2B3' }}>0x1406...Fa002</div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22C55E',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />
                  Monad 10143
                </div>
              </div>

              {/* Monad Balance Display */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #4f33d4 0%, #836ef9 60%, #ab9ff2 100%)',
                  borderRadius: '20px',
                  padding: '24px',
                  color: '#FFFFFF',
                  marginBottom: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>TAPPAY VIRTUAL</span>
                  <Radio size={20} />
                </div>
                <div style={{ fontSize: '12px', opacity: 0.85, marginBottom: '2px' }}>Total Balance</div>
                <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  142.50 <span style={{ fontSize: '18px', fontWeight: 600 }}>MON</span>
                </div>
              </div>

              {/* Status Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#A3A2B3' }}>
                <span>NFC Host Card Emulation Active</span>
                <span style={{ color: '#AB9FF2', fontWeight: 600 }}>Ready to Tap</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
