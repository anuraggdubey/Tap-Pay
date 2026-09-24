import React, { useState } from 'react';
import {
  Smartphone,
  Radio,
  ArrowUpRight,
  Home as HomeIcon,
  Clock,
  Sliders,
  Wifi,
  Battery,
} from 'lucide-react';

interface HeroProps {
  onOpenDownload: () => void;
}

type TabType = 'home' | 'pay' | 'history' | 'settings';

export const Hero: React.FC<HeroProps> = ({ onOpenDownload }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  return (
    <section
      id="hero"
      style={{
        background: 'var(--canvas-bg)',
        color: 'var(--text-dark)',
        paddingTop: '140px',
        paddingBottom: '80px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div className="phantom-container" style={{ width: '100%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '60px',
            alignItems: 'center',
          }}
          className="hero-split-grid"
        >
          {/* LEFT SIDE: TEXT */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {/* Tag */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(60, 49, 91, 0.08)',
                border: '1px solid rgba(60, 49, 91, 0.12)',
                borderRadius: '9999px',
                padding: '7px 16px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-dark-muted)',
                marginBottom: '28px',
              }}
            >
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#22C55E',
              }} />
              <span>Monad Testnet · Live</span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: 'clamp(42px, 5.2vw, 72px)',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
                color: 'var(--text-dark)',
                marginBottom: '22px',
              }}
            >
              Tap to Pay.{' '}
              <br />
              <span style={{ color: 'var(--text-dark-subtle)' }}>
                Crypto, Simplified.
              </span>
            </h1>

            {/* Description */}
            <p
              style={{
                fontSize: '17px',
                lineHeight: 1.65,
                color: 'var(--text-dark-muted)',
                maxWidth: '480px',
                marginBottom: '36px',
                fontWeight: 400,
              }}
            >
              The first non-custodial Android wallet for instant NFC touch payments. Bring two phones within 4cm and execute an atomic Monad transfer. No QR codes.
            </p>

            {/* Action Buttons */}
            <div className="hero-action-buttons" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '44px' }}>
              <button
                onClick={onOpenDownload}
                className="phantom-btn-pill"
                style={{
                  background: 'var(--text-dark)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '14px 28px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <Smartphone size={18} />
                <span>Download APK</span>
              </button>

              <a
                href="https://x.com/tapxpay"
                target="_blank"
                rel="noopener noreferrer"
                className="phantom-btn-pill"
                style={{
                  background: 'var(--pill-bg)',
                  color: 'var(--pill-text)',
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '14px 24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                }}
              >
                <span>@tapxpay</span>
                <ArrowUpRight size={16} />
              </a>
            </div>

            {/* Quick Stats */}
            <div
              className="hero-quick-stats"
              style={{
                display: 'flex',
                gap: '40px',
                borderTop: '1px solid rgba(60, 49, 91, 0.1)',
                paddingTop: '24px',
              }}
            >
              {[
                { value: '~1s', label: 'Finality' },
                { value: '4cm', label: 'NFC Range' },
                { value: '100%', label: 'Non-Custodial' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dark-subtle)', fontWeight: 400, marginTop: '2px' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE: PHONE */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {/* Phone Frame */}
            <div
              className="realistic-phone-chassis"
              data-parallax="0.09"
              style={{
                width: '300px',
                height: '620px',
                borderRadius: '44px',
                background: '#12131b',
                padding: '8px',
                position: 'relative',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 0 0 4px #232432, 0 30px 70px -10px rgba(60, 49, 91, 0.4)',
              }}
            >
              {/* Side Buttons */}
              <div className="realistic-phone-btn-vol" />
              <div className="realistic-phone-btn-pwr" />

              <div
                className="realistic-phone-screen"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '36px',
                  overflow: 'hidden',
                  background: '#000',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {/* Glass Sheen */}
                <div className="glass-sheen-sweep" />

                {/* Camera */}
                <div className="realistic-phone-camera" />

                {/* Status Bar */}
                <div
                  style={{
                    height: '42px',
                    padding: '12px 20px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#FFF',
                    zIndex: 10,
                    background: '#0A0A0F',
                    userSelect: 'none',
                  }}
                >
                  <span>9:41</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Wifi size={12} />
                    <Battery size={12} />
                  </div>
                </div>

                {/* Screen Content */}
                <div
                  style={{ flex: 1, overflowY: 'auto', background: '#0A0A0F', display: 'flex', flexDirection: 'column' }}
                  className="hide-scrollbar"
                >
                  {activeTab === 'home' && (
                    <div style={{ width: '100%', height: '100%' }}>
                      <img src="/screenshots/home.png" alt="TapPay Home" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  )}

                  {activeTab === 'pay' && (
                    <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', height: '100%', color: '#F5F5F7' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700 }}>Send Tap (NFC)</div>
                        <div style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', padding: '3px 8px', borderRadius: '9999px', fontWeight: 600 }}>NFC Active</div>
                      </div>
                      <div style={{ background: '#151520', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '20px 16px', textAlign: 'center', marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>TRANSFER AMOUNT</div>
                        <div style={{ fontSize: '34px', fontWeight: 800, color: '#FFFFFF' }}>5.0 <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>MON</span></div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>≈ $14.25 USD</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '14px' }}>
                          {['1.0', '5.0', '10.0', '25.0'].map((amt) => (
                            <div key={amt} style={{ background: amt === '5.0' ? '#FFF' : 'rgba(255,255,255,0.06)', color: amt === '5.0' ? '#0A0A0F' : 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: 600 }}>{amt}</div>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'heroPulse 2.5s ease-in-out infinite' }}>
                          <Radio size={38} color="#FFFFFF" />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: '12px' }}>Ready to Tap</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: '180px', marginTop: '4px' }}>Hold phone within 4cm of receiver</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                        <span>Gas: ~0.0004 MON</span>
                        <span style={{ color: '#22C55E' }}>1s Finality</span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F5F7' }}>Activity</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Monad Testnet</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                        {['All', 'Sent', 'Received'].map((f, i) => (
                          <div key={f} style={{ background: i === 0 ? '#FFF' : 'rgba(255,255,255,0.06)', color: i === 0 ? '#0A0A0F' : 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '9999px' }}>{f}</div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {[
                          { name: 'Paid @misbah', amount: '-5.0 MON', time: '2m ago', isNeg: true },
                          { name: 'From @aditya', amount: '+25.0 MON', time: '1h ago', isNeg: false },
                          { name: 'NFC Coffee Bar', amount: '-1.2 MON', time: '4h ago', isNeg: true },
                          { name: 'Faucet Drop', amount: '+10.0 MON', time: 'Yesterday', isNeg: false },
                          { name: 'Paid @anurag', amount: '-2.0 MON', time: '2d ago', isNeg: true },
                        ].map((t, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: t.isNeg ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: t.isNeg ? '#EF4444' : '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{t.isNeg ? '↗' : '↘'}</div>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#F5F5F7' }}>{t.name}</div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{t.time}</div>
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: t.isNeg ? '#F5F5F7' : '#22C55E' }}>{t.amount}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <div style={{ width: '100%', height: '100%' }}>
                      <img src="/screenshots/settings.png" alt="TapPay Settings" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  )}
                </div>

                {/* Bottom Nav */}
                <div style={{ background: '#0D0D14', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 8px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'center', zIndex: 15 }}>
                  {[
                    { id: 'home' as TabType, icon: <HomeIcon size={18} />, label: 'Home' },
                    { id: 'pay' as TabType, icon: <Radio size={18} />, label: 'Pay' },
                    { id: 'history' as TabType, icon: <Clock size={18} />, label: 'History' },
                    { id: 'settings' as TabType, icon: <Sliders size={18} />, label: 'Settings' },
                  ].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', color: activeTab === tab.id ? '#FFF' : 'rgba(255,255,255,0.3)', padding: '4px 0', transition: 'color 0.15s ease' }}>
                      {tab.icon}
                      <span style={{ fontSize: '10px', fontWeight: activeTab === tab.id ? 600 : 400 }}>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Home Indicator */}
                <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', margin: '2px auto 6px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes heroPulse {
          0% { transform: scale(0.97); opacity: 0.85; }
          50% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(0.97); opacity: 0.85; }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 960px) {
          .hero-split-grid {
            grid-template-columns: 1fr !important;
            text-align: center !important;
            gap: 40px !important;
          }
          .hero-split-grid > div:first-child {
            align-items: center !important;
          }
          .hero-action-buttons {
            justify-content: center !important;
          }
          .hero-quick-stats {
            justify-content: center !important;
          }
        }
        @media (max-width: 640px) {
          #hero {
            padding-top: 110px !important;
            padding-bottom: 50px !important;
            min-height: auto !important;
          }
          .hero-action-buttons {
            width: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .hero-action-buttons button, .hero-action-buttons a {
            width: 100% !important;
            justify-content: center !important;
          }
          .hero-quick-stats {
            gap: 20px !important;
            justify-content: space-around !important;
            width: 100% !important;
          }
          .realistic-phone-chassis {
            width: min(290px, 86vw) !important;
            height: min(560px, 70vh) !important;
          }
        }
      `}</style>
    </section>
  );
};
