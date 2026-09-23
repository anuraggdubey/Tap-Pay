import React from 'react';
import { Award, Play, ExternalLink } from 'lucide-react';

export const HackathonStory: React.FC = () => {
  const builders = [
    {
      name: 'Anurag Dubey',
      role: 'Fullstack & Mobile Engineer',
      handle: '@anuraggdubeyy',
      link: 'https://x.com/anuraggdubeyy',
    },
    {
      name: 'Misbah Ansari',
      role: 'Agentic & Smart Contracts',
      handle: '@Misbahtwts',
      link: 'https://x.com/Misbahtwts',
    },
    {
      name: '0xAdityaa',
      role: 'Core Systems & NFC HCE',
      handle: '@AdityaNishad987',
      link: 'https://x.com/AdityaNishad987',
    },
  ];

  return (
    <section
      style={{
        padding: '90px 0',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div className="container">
        <div
          className="glass-panel"
          style={{
            padding: '48px 40px',
            background: 'linear-gradient(135deg, rgba(20, 21, 32, 0.95) 0%, rgba(13, 14, 22, 0.98) 100%)',
            border: '1px solid rgba(131, 110, 249, 0.25)',
            borderRadius: '32px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: '40px',
              alignItems: 'center',
            }}
            className="story-grid"
          >
            {/* Story Copy */}
            <div>
              <div
                className="badge-pill"
                style={{
                  marginBottom: '16px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                  color: '#fbbf24',
                }}
              >
                <Award size={14} />
                <span>Monad India Blitz V4</span>
              </div>

              <h2
                style={{
                  fontSize: 'clamp(28px, 3.5vw, 42px)',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  marginBottom: '16px',
                }}
              >
                Built live at Monad Blitz
              </h2>

              <p
                style={{
                  fontSize: '16px',
                  lineHeight: 1.6,
                  color: '#9ea0b2',
                  marginBottom: '24px',
                }}
              >
                TapPay was conceived and built during the Monad India Blitz V4 hackathon. In under 24 hours, the team engineered low-level Android Host Card Emulation to bridge physical device touch with on-chain parallelized Monad blocks.
              </p>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <a
                  href="https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-phantom-purple"
                  style={{ padding: '12px 24px', fontSize: '14px' }}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Watch Judges Demo Video</span>
                </a>
                <a
                  href="https://github.com/anuraggdubey/Tap-Pay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-phantom-secondary"
                  style={{ padding: '12px 20px', fontSize: '14px' }}
                >
                  <ExternalLink size={16} />
                  <span>GitHub Repository</span>
                </a>
              </div>

              {/* Builders list */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#67697b', marginBottom: '12px', letterSpacing: '0.04em' }}>
                  BUILT BY
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {builders.map((b, i) => (
                    <a
                      key={i}
                      href={b.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(131, 110, 249, 0.15)',
                          color: '#ab9ff2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                        }}
                      >
                        {b.name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{b.name}</div>
                        <div style={{ fontSize: '11px', color: '#836ef9' }}>{b.handle}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Hackathon Video Card Preview */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: '100%',
                  borderRadius: '24px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(131, 110, 249, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Play size={28} color="#836ef9" fill="#836ef9" />
                </div>
                <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px' }}>Phone-to-Phone Tap in Real Life</div>
                <p style={{ fontSize: '13px', color: '#9ea0b2', marginBottom: '20px' }}>
                  Watch two real Android devices held back-to-back exchanging keys and settling on Monad Testnet.
                </p>
                <a
                  href="https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-phantom-primary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  <span>Play tappay.mp4</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .story-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
