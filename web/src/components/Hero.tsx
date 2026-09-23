import React, { useState } from 'react';
import { Smartphone, Play, Radio, CheckCircle, Zap, ShieldCheck, ArrowRight } from 'lucide-react';

interface HeroProps {
  onOpenDownload: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenDownload }) => {
  // 3D Card tilt state
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Dampen rotation to max +/- 12 degrees
    const rotateX = -(y / (rect.height / 2)) * 12;
    const rotateY = (x / (rect.width / 2)) * 12;

    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <section
      style={{
        position: 'relative',
        paddingTop: '160px',
        paddingBottom: '110px',
        overflow: 'hidden',
      }}
    >
      {/* Background Ambient Glow Mesh */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '750px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(131, 110, 249, 0.22) 0%, rgba(99, 102, 241, 0.08) 50%, transparent 75%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '50px',
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          {/* Left Column: Hero Copy & Actions */}
          <div>
            {/* Pill Tag */}
            <div
              className="badge-pill"
              style={{
                marginBottom: '24px',
                padding: '8px 16px',
                fontSize: '13px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#836ef9',
                  boxShadow: '0 0 10px #836ef9',
                  display: 'inline-block',
                }}
              />
              <span>Monad Blitz Hackathon Winner · Native MON Rail</span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: 'clamp(40px, 5.5vw, 68px)',
                lineHeight: 1.08,
                fontWeight: 800,
                letterSpacing: '-0.035em',
                marginBottom: '24px',
              }}
            >
              Tap to Pay with{' '}
              <span className="gradient-text-purple">Monad</span>.
              <br />
              Phone to phone.
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 'clamp(17px, 2vw, 20px)',
                lineHeight: 1.6,
                color: '#9ea0b2',
                maxWidth: '540px',
                marginBottom: '36px',
              }}
            >
              The self-custodial Android wallet for instant contactless NFC
              payments and <span style={{ color: '#ffffff', fontWeight: 600 }}>@username</span> sends.
              Hold two phones together and settle on-chain with ~1-second finality.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '14px',
                marginBottom: '40px',
              }}
            >
              <button
                onClick={onOpenDownload}
                className="btn-phantom-primary"
                style={{ padding: '15px 32px', fontSize: '16px' }}
              >
                <Smartphone size={20} />
                <span>Download for Android</span>
              </button>

              <a
                href="https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-phantom-secondary"
                style={{ padding: '15px 26px', fontSize: '15px' }}
              >
                <Play size={18} fill="currentColor" />
                <span>Watch Video Demo</span>
              </a>
            </div>

            {/* Feature Pills */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ab9ff2', fontSize: '14px', fontWeight: 600 }}>
                <Zap size={16} color="#836ef9" />
                <span>~1s Monad Finality</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ab9ff2', fontSize: '14px', fontWeight: 600 }}>
                <Radio size={16} color="#836ef9" />
                <span>Host Card Emulation (HCE)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ab9ff2', fontSize: '14px', fontWeight: 600 }}>
                <ShieldCheck size={16} color="#836ef9" />
                <span>Android Keystore Secured</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Interactive Phone & NFC Pulse */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              perspective: '1200px',
            }}
          >
            <div
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={handleMouseLeave}
              style={{
                position: 'relative',
                transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
                transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                transformStyle: 'preserve-3d',
                cursor: 'grab',
              }}
            >
              {/* Concentric NFC Waves Emitting from top of phone */}
              <div
                style={{
                  position: 'absolute',
                  top: '-40px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
                className="nfc-wave-container"
              >
                <div className="nfc-wave-ring" />
                <div className="nfc-wave-ring" />
                <div className="nfc-wave-ring" />
              </div>

              {/* Physical Phone Frame */}
              <div
                className="phone-mockup"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div className="phone-island" />

                {/* Simulated Screen Content */}
                <div
                  style={{
                    height: '100%',
                    padding: '48px 20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(180deg, #11121d 0%, #0d0e15 100%)',
                  }}
                >
                  {/* Top Bar inside Phone */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#836ef9',
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
                          <div style={{ fontSize: '13px', fontWeight: 700 }}>@anurag</div>
                          <div style={{ fontSize: '10px', color: '#67697b' }}>0x1406...Fa002</div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: '#22c55e',
                          }}
                        />
                        Monad 10143
                      </span>
                    </div>

                    {/* Virtual TapPay Card */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #4f33d4 0%, #836ef9 60%, #a78bfa 100%)',
                        borderRadius: '20px',
                        padding: '22px 18px',
                        color: '#fff',
                        boxShadow: '0 15px 35px -10px rgba(131, 110, 249, 0.65)',
                        position: 'relative',
                        overflow: 'hidden',
                        marginBottom: '22px',
                      }}
                    >
                      {/* Holographic Sheen */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: '120px',
                          height: '120px',
                          background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)',
                          borderRadius: '50%',
                        }}
                      />

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '24px',
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', opacity: 0.9 }}>
                          TAPPAY VIRTUAL
                        </span>
                        <Radio size={22} color="#ffffff" />
                      </div>

                      <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '2px' }}>Balance</div>
                      <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '14px' }}>
                        142.50 <span style={{ fontSize: '16px', fontWeight: 600 }}>MON</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', opacity: 0.85 }}>•••• 8638</span>
                        <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.25)', padding: '2px 8px', borderRadius: '8px' }}>
                          NFC ACTIVE
                        </span>
                      </div>
                    </div>

                    {/* NFC Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '16px',
                          padding: '14px',
                          textAlign: 'center',
                        }}
                      >
                        <Radio size={20} color="#836ef9" style={{ margin: '0 auto 6px' }} />
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>Ready to Tap</div>
                        <div style={{ fontSize: '10px', color: '#9ea0b2' }}>Sender (Read)</div>
                      </div>

                      <div
                        style={{
                          background: 'rgba(131, 110, 249, 0.12)',
                          border: '1px solid rgba(131, 110, 249, 0.3)',
                          borderRadius: '16px',
                          padding: '14px',
                          textAlign: 'center',
                        }}
                      >
                        <Smartphone size={20} color="#ab9ff2" style={{ margin: '0 auto 6px' }} />
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#ab9ff2' }}>Receive Tap</div>
                        <div style={{ fontSize: '10px', color: '#ab9ff2', opacity: 0.8 }}>HCE Broadcast</div>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Recent Activity */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '16px',
                      padding: '12px 14px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#22c55e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ✓
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600 }}>NFC Tap Received</div>
                          <div style={{ fontSize: '10px', color: '#67697b' }}>from @misbah</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>+5.0 MON</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Interaction Badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-20px',
                  right: '-25px',
                  background: 'rgba(18, 19, 27, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(131, 110, 249, 0.4)',
                  borderRadius: '16px',
                  padding: '12px 18px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(131, 110, 249, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Radio size={20} color="#836ef9" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>Interactive 3D Card</div>
                  <div style={{ fontSize: '11px', color: '#9ea0b2' }}>Move cursor to tilt</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .hero-grid p {
            margin-left: auto;
            margin-right: auto;
          }
          .hero-grid div[style*="justify-content: space-between"] {
            justify-content: center !important;
          }
        }
      `}</style>
    </section>
  );
};
