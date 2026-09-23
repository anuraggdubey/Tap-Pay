import React, { useState } from 'react';
import { Radio, Smartphone, Send, Zap, ChevronDown, Check, Coins, ArrowRightLeft } from 'lucide-react';

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
      style={{
        padding: '80px 0 100px',
        position: 'relative',
      }}
    >
      <div className="phantom-container">
        {/* 5-Element Grid: Center Phone flanked by 4 cards (Exact Image 2 Structure) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.15fr 1fr',
            gap: '24px',
            alignItems: 'center',
          }}
          className="center-phone-grid"
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

              {/* Free Floating Coin Icon */}
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

              {/* Free Floating Send Icon */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Send size={46} color="#5B48D9" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>
          </div>

          {/* Center Column: The Realistic Phone Mockup with Interactive Screen */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              className="realistic-phone-chassis scroll-reveal-scale"
              data-parallax="0.14"
              style={{
                width: '320px',
                height: '640px',
                borderRadius: '52px',
                padding: '12px',
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
                  padding: '36px 20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: '#FFF',
                }}
              >
                <div className="glass-sheen-sweep" />

                {/* Screen Top Header */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '13px', color: '#A3A2B3' }}>‹ Back</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>Send MON</span>
                    <span style={{ width: '20px' }} />
                  </div>

                  {/* Main Amount Display */}
                  <div style={{ textAlign: 'center', margin: '30px 0 20px' }}>
                    <div style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFDF8' }}>
                      ${val}
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#AB9FF2',
                        marginTop: '6px',
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
                        padding: '20px',
                        textAlign: 'center',
                        color: '#4ADE80',
                        marginBottom: '16px',
                      }}
                    >
                      <Check size={28} style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>Sent {val} MON</div>
                      <div style={{ fontSize: '11px', opacity: 0.8 }}>Settled in ~0.9s on Monad</div>
                    </div>
                  ) : (
                    <button
                      onClick={handlePay}
                      className="phantom-btn-pill"
                      style={{
                        width: '100%',
                        background: '#FFFFFF',
                        color: '#0B0C12',
                        padding: '14px',
                        fontWeight: 700,
                        fontSize: '15px',
                        borderRadius: '16px',
                        marginBottom: '20px',
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
                      gap: '8px',
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
                          height: '46px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#FFF',
                          fontSize: '17px',
                          fontWeight: 700,
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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

              {/* Free Floating Contactless Radio Icon */}
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

              {/* Free Floating Swap Icon */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ArrowRightLeft size={48} color="#EA580C" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 990px) {
          .center-phone-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
