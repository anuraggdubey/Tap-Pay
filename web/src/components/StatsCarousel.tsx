import React from 'react';
import { Smartphone, ShieldCheck, Zap, Radio, Check, Trophy } from 'lucide-react';

export const StatsCarousel: React.FC = () => {
  return (
    <section
      style={{
        padding: '60px 0 80px',
        position: 'relative',
      }}
    >
      <div className="phantom-container">
        {/* 4 Geometric Cards (Exact Image 1 Replica) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Card 1: Deep Emerald Green (App / Hackathon Award) */}
          <div
            style={{
              background: 'linear-gradient(145deg, #09392b 0%, #05261d 100%)',
              borderRadius: '28px',
              padding: '34px 28px',
              color: '#E8F5E9',
              minHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(5, 38, 29, 0.25)',
            }}
            className="card-geo-pattern"
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '24px', fontWeight: 800, marginBottom: '6px', color: '#6EE7B7' }}>
                <span>Winner</span>
                <Trophy size={20} color="#6EE7B7" />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3, color: '#FDFCFE' }}>
                Monad India Blitz V4 Hackathon
              </h3>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Trophy size={48} color="#6EE7B7" strokeWidth={1.8} className="phantom-floating" />
            </div>
          </div>

          {/* Card 2: Electric Periwinkle Blue */}
          <div
            style={{
              background: 'linear-gradient(145deg, #517df7 0%, #3a62d6 100%)',
              borderRadius: '28px',
              padding: '34px 28px',
              color: '#FFFFFF',
              minHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(58, 98, 214, 0.25)',
            }}
            className="card-geo-pattern"
          >
            <div>
              <div style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>
                ~1.0s Finality
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1.35, opacity: 0.95 }}>
                Sub-second contactless transactions settled on Monad Testnet
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Smartphone size={32} color="#FFFFFF" strokeWidth={1.8} />
              <Radio size={32} color="#FFFFFF" strokeWidth={1.8} />
              <Zap size={32} color="#FFFFFF" strokeWidth={1.8} />
            </div>
          </div>

          {/* Card 3: Neon Lime Green (Coinspect / Security Gauge) */}
          <div
            style={{
              background: 'linear-gradient(145deg, #8fe61b 0%, #76c70e 100%)',
              borderRadius: '28px',
              padding: '34px 28px',
              color: '#1A3300',
              minHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(118, 199, 14, 0.25)',
            }}
            className="card-geo-pattern"
          >
            <div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.3, color: '#132800', marginBottom: '16px' }}>
                100% Non-Custodial protected by Keystore
              </h3>
            </div>

            {/* Embedded Dark Gauge Widget */}
            <div
              style={{
                background: '#0D0E12',
                borderRadius: '20px',
                padding: '20px 16px',
                color: '#FFF',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={18} color="#8fe61b" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFF' }}>Android Keystore</span>
              </div>

              {/* Circle Gauge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    border: '5px solid #8fe61b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '17px',
                    color: '#FFF',
                  }}
                >
                  100%
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: 1.4 }}>
                  <div style={{ color: '#8fe61b', fontWeight: 700 }}>Zero Escrow</div>
                  <div>Keys never leave device</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Vibrant Purple / Magenta with Transaction Feed */}
          <div
            style={{
              background: 'linear-gradient(145deg, #c44af5 0%, #9e19d4 100%)',
              borderRadius: '28px',
              padding: '34px 28px',
              color: '#FFFFFF',
              minHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(158, 25, 212, 0.25)',
            }}
            className="card-geo-pattern"
          >
            <div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.3, marginBottom: '8px' }}>
                Atomic contactless payments
              </h3>
              <p style={{ fontSize: '13px', opacity: 0.9 }}>
                Direct settlement on TapPayLedger.sol
              </p>
            </div>

            {/* Stacked Pills Ticker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '9999px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#3C315B',
                  fontSize: '11px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <span>@anurag → @misbah</span>
                <span style={{ background: '#E2DDFE', color: '#684FF6', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                  Settled
                </span>
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '9999px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#3C315B',
                  fontSize: '11px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <span>0x1406... → 0xEebB...</span>
                <span style={{ background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                  ~1s Final
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
