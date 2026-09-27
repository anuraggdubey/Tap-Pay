import React, { useState } from 'react';
import { Radio, Send, ChevronDown, Check, Coins, ArrowRightLeft } from 'lucide-react';

interface PhoneProps {
  val: string;
  setVal: React.Dispatch<React.SetStateAction<string>>;
  paid: boolean;
  onPay: () => void;
  isMobile?: boolean;
}

const InteractivePhone: React.FC<PhoneProps> = ({ val, setVal, paid, onPay, isMobile = false }) => {
  return (
    <div
      className="realistic-phone-chassis"
      style={{
        width: isMobile ? 'min(290px, 82vw)' : '320px',
        height: isMobile ? '530px' : '640px',
        borderRadius: isMobile ? '44px' : '52px',
        padding: isMobile ? '10px' : '12px',
        background: '#0D0E15',
        boxShadow: '0 30px 80px rgba(60, 49, 91, 0.35), 0 0 50px rgba(131, 110, 249, 0.3)',
      }}
    >
      <div className="realistic-phone-camera" />
      <div className="realistic-phone-btn-vol" />
      <div className="realistic-phone-btn-pwr" />

      {/* Phone Screen */}
      <div
        className="realistic-phone-screen"
        style={{
          background: '#0B0C12',
          padding: isMobile ? '28px 16px 18px' : '36px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#FFF',
        }}
      >
        <div className="glass-sheen-sweep" />

        {/* Screen Top Header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '14px' : '24px' }}>
            <span style={{ fontSize: '13px', color: '#A3A2B3' }}>‹ Back</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>Send MON</span>
            <span style={{ width: '20px' }} />
          </div>

          {/* Main Amount Display */}
          <div style={{ textAlign: 'center', margin: isMobile ? '16px 0 14px' : '30px 0 20px' }}>
            <div style={{ fontSize: isMobile ? '38px' : '48px', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFDF8' }}>
              ${val}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '5px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#AB9FF2',
                marginTop: '4px',
              }}
            >
              <span>Monad Testnet</span>
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* Bottom Keypad & Action */}
        <div>
          {paid ? (
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '16px',
                padding: isMobile ? '14px' : '20px',
                textAlign: 'center',
                color: '#4ADE80',
                marginBottom: isMobile ? '12px' : '16px',
              }}
            >
              <Check size={24} style={{ margin: '0 auto 4px' }} />
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Sent {val} MON</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>Settled in ~0.9s on Monad</div>
            </div>
          ) : (
            <button
              onClick={onPay}
              className="phantom-btn-pill"
              style={{
                width: '100%',
                background: '#FFFFFF',
                color: '#0B0C12',
                padding: isMobile ? '12px' : '14px',
                fontWeight: 700,
                fontSize: '14px',
                borderRadius: '14px',
                marginBottom: isMobile ? '12px' : '20px',
              }}
            >
              Send {val} MON
            </button>
          )}

          {/* Tactile 3x2 Numbers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              textAlign: 'center',
            }}
          >
            {['1', '2', '3', '4', '5', '6'].map((n) => (
              <button
                key={n}
                onClick={() => {
                  if (!paid) setVal((prev) => (prev.length < 5 ? prev + n : prev));
                }}
                style={{
                  height: isMobile ? '38px' : '46px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  color: '#FFF',
                  fontSize: isMobile ? '15px' : '17px',
                  fontWeight: 700,
                  transition: 'background 0.15s ease',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CenterPhoneShowcase: React.FC = () => {
  const [val, setVal] = useState('100');
  const [paid, setPaid] = useState(false);

  const handlePay = () => {
    setPaid(true);
    setTimeout(() => {
      setPaid(false);
      setVal('100');
    }, 2800);
  };

  return (
    <section
      className="center-showcase-section"
      style={{
        padding: '80px 0 100px',
        position: 'relative',
      }}
    >
      <div className="phantom-container">
        {/* ======================================================== */}
        {/* 1. DESKTOP VIEW: 3-Column Layout (Cards - Phone - Cards) */}
        {/* ======================================================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.15fr 1fr',
            gap: '24px',
            alignItems: 'center',
          }}
          className="center-phone-desktop-grid"
        >
          {/* Left Column (2 Cards) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} data-parallax="0.05">
            {/* Top Left Card: Deep Navy/Indigo */}
            <div
              className="scroll-reveal-left scroll-delay-1"
              style={{
                background: 'linear-gradient(145deg, #130e2e 0%, #090717 100%)',
                borderRadius: '32px',
                padding: '36px 30px',
                color: '#FFFDF8',
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <h3 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.25, maxWidth: '240px' }}>
                Earn &amp; Transact with Monad TapPay
              </h3>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Coins size={52} color="#A78BFA" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>

            {/* Bottom Left Card: Soft Lavender */}
            <div
              className="scroll-reveal-left scroll-delay-2"
              style={{
                background: '#EAE6FE',
                borderRadius: '32px',
                padding: '36px 30px',
                color: '#3C315B',
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 10px 30px rgba(60, 49, 91, 0.06)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <h3 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.25, maxWidth: '240px' }}>
                Send and receive money globally, instantly
              </h3>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Send size={46} color="#5B48D9" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>
          </div>

          {/* Center Column: The Realistic Phone Mockup with Interactive Screen */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="scroll-reveal-scale" data-parallax="0.14">
              <InteractivePhone val={val} setVal={setVal} paid={paid} onPay={handlePay} />
            </div>
          </div>

          {/* Right Column (2 Cards) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} data-parallax="0.05">
            {/* Top Right Card: Deep Emerald Green */}
            <div
              className="scroll-reveal-right scroll-delay-1"
              style={{
                background: 'linear-gradient(145deg, #05261d 0%, #031711 100%)',
                borderRadius: '32px',
                padding: '36px 30px',
                color: '#FFFDF8',
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <h3 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.25, maxWidth: '240px' }}>
                Spend anywhere with TapPay NFC, instant tap
              </h3>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Radio size={50} color="#34D399" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>

            {/* Bottom Right Card: Warm Peach/Coral */}
            <div
              className="scroll-reveal-right scroll-delay-2"
              style={{
                background: '#FFD7C2',
                borderRadius: '32px',
                padding: '36px 30px',
                color: '#3C315B',
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 10px 30px rgba(60, 49, 91, 0.06)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <h3 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.25, maxWidth: '240px' }}>
                One handle that connects to everything: @username
              </h3>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ArrowRightLeft size={48} color="#EA580C" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. MOBILE VIEW: Sticky Pinned Screen & Moving Cards       */}
        {/* The screen stays still, and cards move up above it       */}
        {/* ======================================================== */}
        <div className="center-phone-mobile-showcase">
          {/* Section Header for Mobile */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(60, 49, 91, 0.08)',
                padding: '6px 16px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-dark-muted)',
                marginBottom: '10px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#836EF9' }} />
              <span>Interactive Monad Prototype</span>
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-dark)' }}>
              Touch &amp; Transact
            </h2>
          </div>

          {/* Sticky Phone Anchor: Pinned in the viewport ("Screen stays still") */}
          <div className="mobile-sticky-phone-stage">
            <InteractivePhone val={val} setVal={setVal} paid={paid} onPay={handlePay} isMobile={true} />
          </div>

          {/* Scrolling Stream of Cards: Glides UP and ABOVE the stationary phone */}
          <div className="mobile-cards-stream">
            {/* Scroll Indicator Prompt */}
            <div className="mobile-scroll-prompt">
              <span>Scroll down to see cards glide over &darr;</span>
            </div>

            {/* Card 1: Earn & Transact */}
            <div
              className="mobile-stack-card mobile-stack-card-1"
              style={{
                background: 'linear-gradient(145deg, #130e2e 0%, #090717 100%)',
                color: '#FFFDF8',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#A78BFA', letterSpacing: '0.06em' }}>
                  FEATURE 01 · STAKING &amp; YIELD
                </span>
                <span style={{ fontSize: '12px', opacity: 0.6 }}>01 / 04</span>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.25, margin: '14px 0' }}>
                Earn &amp; Transact with Monad TapPay
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,253,248,0.7)', maxWidth: '200px', lineHeight: 1.4 }}>
                  Instant touch payments with liquid Monad staking returns.
                </p>
                <Coins size={44} color="#A78BFA" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>

            {/* Card 2: Send Globally */}
            <div
              className="mobile-stack-card mobile-stack-card-2"
              style={{
                background: '#EAE6FE',
                color: '#3C315B',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#836EF9', letterSpacing: '0.06em' }}>
                  FEATURE 02 · INSTANT TRANSFERS
                </span>
                <span style={{ fontSize: '12px', color: '#6C628A' }}>02 / 04</span>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.25, margin: '14px 0' }}>
                Send and receive money globally, instantly
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <p style={{ fontSize: '13px', color: '#6C628A', maxWidth: '200px', lineHeight: 1.4 }}>
                  Sub-second finality anywhere on earth with zero friction.
                </p>
                <Send size={42} color="#5B48D9" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>

            {/* Card 3: Spend Anywhere NFC */}
            <div
              className="mobile-stack-card mobile-stack-card-3"
              style={{
                background: 'linear-gradient(145deg, #05261d 0%, #031711 100%)',
                color: '#FFFDF8',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#34D399', letterSpacing: '0.06em' }}>
                  FEATURE 03 · HARDWARE NFC
                </span>
                <span style={{ fontSize: '12px', opacity: 0.6 }}>03 / 04</span>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.25, margin: '14px 0' }}>
                Spend anywhere with TapPay NFC, instant tap
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,253,248,0.7)', maxWidth: '200px', lineHeight: 1.4 }}>
                  Bring two Android phones within 4cm for atomic settlements.
                </p>
                <Radio size={44} color="#34D399" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>

            {/* Card 4: One Handle @username */}
            <div
              className="mobile-stack-card mobile-stack-card-4"
              style={{
                background: '#FFD7C2',
                color: '#3C315B',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#EA580C', letterSpacing: '0.06em' }}>
                  FEATURE 04 · ON-CHAIN IDENTITY
                </span>
                <span style={{ fontSize: '12px', color: '#6C628A' }}>04 / 04</span>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.25, margin: '14px 0' }}>
                One handle that connects to everything: @username
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <p style={{ fontSize: '13px', color: '#6C628A', maxWidth: '200px', lineHeight: 1.4 }}>
                  No 0x hexadecimal addresses needed. Just send to @tag.
                </p>
                <ArrowRightLeft size={42} color="#EA580C" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Desktop Grid Display */
        @media (min-width: 991px) {
          .center-phone-desktop-grid {
            display: grid !important;
          }
          .center-phone-mobile-showcase {
            display: none !important;
          }
        }

        /* Mobile Experience: Sticky Still Screen & Upward Moving Cards */
        @media (max-width: 990px) {
          .center-showcase-section {
            padding: 50px 0 80px !important;
          }
          .center-phone-desktop-grid {
            display: none !important;
          }
          .center-phone-mobile-showcase {
            display: block !important;
            position: relative;
            max-width: 480px;
            margin: 0 auto;
          }

          /* Stationary Phone Anchor: Stays locked in viewport as user scrolls */
          .mobile-sticky-phone-stage {
            position: sticky;
            top: 80px;
            z-index: 2;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: -500px;
            pointer-events: auto;
            transform: translateZ(0);
          }

          /* Scrolling Stream that glides up and ABOVE the phone */
          .mobile-cards-stream {
            position: relative;
            z-index: 10;
            margin-top: 480px;
            display: flex;
            flex-direction: column;
            pointer-events: none;
          }

          .mobile-scroll-prompt {
            text-align: center;
            margin-bottom: 24px;
            pointer-events: auto;
          }
          .mobile-scroll-prompt span {
            display: inline-block;
            background: rgba(246, 244, 240, 0.95);
            backdrop-filter: blur(8px);
            padding: 8px 18px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            color: var(--text-dark);
            box-shadow: 0 4px 15px rgba(26, 26, 26, 0.08);
            border: 1px solid rgba(26, 26, 26, 0.06);
            animation: phantomFloat 2.5s ease-in-out infinite;
          }

          /* Physical Stacking Card Styles */
          .mobile-stack-card {
            pointer-events: auto;
            position: sticky;
            border-radius: 28px;
            padding: 30px 24px;
            min-height: 220px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.25), 0 20px 45px rgba(60, 49, 91, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            margin-bottom: 260px;
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            will-change: transform;
          }

          .mobile-stack-card:last-child {
            margin-bottom: 60px;
          }

          /* Layered Sticky Offsets (Wallet-Deck Effect) */
          .mobile-stack-card-1 {
            top: 85px;
            z-index: 11;
          }
          .mobile-stack-card-2 {
            top: 108px;
            z-index: 12;
          }
          .mobile-stack-card-3 {
            top: 131px;
            z-index: 13;
          }
          .mobile-stack-card-4 {
            top: 154px;
            z-index: 14;
          }
        }
      `}</style>
    </section>
  );
};
