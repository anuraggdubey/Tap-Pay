import React from 'react';
import { Smartphone, ShieldCheck, Zap, Radio, Trophy, ArrowRight } from 'lucide-react';

export const StatsCarousel: React.FC = () => {
  return (
    <section style={{ padding: '72px 0 88px', position: 'relative' }}>
      <div className="phantom-container">
        <div className="stats-carousel-grid">
          {/* Card 1 — Award */}
          <article className="stat-card scroll-reveal scroll-delay-1" data-parallax="0.04">
            <div className="stat-card-head">
              <span className="field-kicker">Recognition</span>
              <Trophy size={16} className="stat-card-ico" />
            </div>
            <div className="stat-card-body">
              <div className="stat-figure">01</div>
              <h3 className="stat-title">Winner — Monad India Blitz V4 Hackathon</h3>
            </div>
            <div className="stat-foot stat-foot-mono">JUDGED · ON-CHAIN DEMO</div>
          </article>

          {/* Card 2 — Finality (accent card) */}
          <article className="stat-card is-accent scroll-reveal scroll-delay-2" data-parallax="-0.03">
            <div className="stat-card-head">
              <span className="field-kicker">Settlement</span>
            </div>
            <div className="stat-card-body">
              <div className="stat-figure stat-figure-xl">~1.0<span className="stat-unit">s</span></div>
              <h3 className="stat-title">Sub-second contactless transactions, settled across chains.</h3>
            </div>
            <div className="stat-foot stat-icons">
              <Smartphone size={18} strokeWidth={1.6} />
              <Radio size={18} strokeWidth={1.6} />
              <Zap size={18} strokeWidth={1.6} />
            </div>
          </article>

          {/* Card 3 — Custody gauge */}
          <article className="stat-card scroll-reveal scroll-delay-3" data-parallax="0.04">
            <div className="stat-card-head">
              <span className="field-kicker is-signal">Custody</span>
              <ShieldCheck size={16} className="stat-card-ico" />
            </div>
            <div className="stat-card-body">
              <div className="stat-figure">100<span className="stat-unit">%</span></div>
              <h3 className="stat-title">Non-custodial. Keys sealed in the Android Keystore.</h3>
            </div>
            <div className="stat-gauge">
              <div className="stat-gauge-ring">100%</div>
              <div className="stat-gauge-meta">
                <div className="stat-gauge-lead">Zero escrow</div>
                <div className="stat-gauge-sub">Keys never leave the device</div>
              </div>
            </div>
          </article>

          {/* Card 4 — Settlement feed */}
          <article className="stat-card scroll-reveal scroll-delay-4" data-parallax="-0.03">
            <div className="stat-card-head">
              <span className="field-kicker">Ledger</span>
            </div>
            <div className="stat-card-body">
              <h3 className="stat-title stat-title-lg">Atomic contactless payments</h3>
              <p className="stat-sub-mono">Direct settlement on TapPayLedger.sol</p>
            </div>
            <div className="stat-feed">
              <div className="stat-feed-row">
                <span className="stat-feed-party">@anurag <ArrowRight size={11} /> @misbah</span>
                <span className="stat-feed-tag is-signal">Settled</span>
              </div>
              <div className="stat-feed-row">
                <span className="stat-feed-party stat-feed-mono">0x1406… <ArrowRight size={11} /> 0xEebB…</span>
                <span className="stat-feed-tag">~1s</span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <style>{`
        .stats-carousel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 258px), 1fr));
          gap: 1px;
          background: var(--canvas-line);
          border: 1px solid var(--canvas-line);
          border-radius: var(--radius-card);
          overflow: hidden;
        }

        .stat-card {
          background: var(--canvas-bg-raised);
          padding: 28px 24px;
          min-height: 360px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          transition: background 0.3s var(--ease-snap);
        }
        .stat-card:hover { background: #15151A; }
        .stat-card.is-accent {
          background: linear-gradient(165deg, rgba(10,132,255,0.16), rgba(10,132,255,0.04));
        }
        .stat-card.is-accent:hover {
          background: linear-gradient(165deg, rgba(10,132,255,0.22), rgba(10,132,255,0.06));
        }

        .stat-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .stat-card-ico { color: var(--text-dark-subtle); }

        .stat-card-body { margin-top: 28px; }
        .stat-figure {
          font-family: var(--font-serif);
          font-size: 56px;
          line-height: 1;
          letter-spacing: -0.02em;
          color: var(--text-dark);
          margin-bottom: 16px;
        }
        .stat-figure-xl { font-size: 72px; }
        .stat-unit { font-size: 0.5em; color: var(--text-dark-subtle); }
        .is-accent .stat-figure { color: var(--accent-bright); }
        .is-accent .stat-unit { color: var(--accent-bright); opacity: 0.6; }

        .stat-title {
          font-family: var(--font-sans);
          font-size: 15px;
          font-weight: 500;
          line-height: 1.4;
          color: var(--text-dark-muted);
          max-width: 24ch;
        }
        .stat-title-lg { font-size: 20px; color: var(--text-dark); font-weight: 600; margin-bottom: 6px; }
        .stat-sub-mono {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.04em;
          color: var(--text-dark-subtle);
        }

        .stat-foot-mono {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          color: var(--text-dark-subtle);
          margin-top: 24px;
        }
        .stat-icons { display: flex; gap: 16px; color: var(--accent-bright); margin-top: 24px; }

        .stat-gauge {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 24px;
          padding: 16px;
          background: var(--canvas-bg-sunken);
          border: 1px solid var(--canvas-line);
          border-radius: var(--radius-card-sm);
        }
        .stat-gauge-ring {
          width: 56px; height: 56px;
          border-radius: 50%;
          border: 3px solid var(--signal);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono);
          font-weight: 600; font-size: 14px;
          color: var(--text-dark);
          flex-shrink: 0;
        }
        .stat-gauge-lead { font-size: 12px; font-weight: 700; color: var(--signal); }
        .stat-gauge-sub { font-size: 11px; color: var(--text-dark-subtle); margin-top: 2px; }

        .stat-feed { display: flex; flex-direction: column; gap: 6px; margin-top: 24px; }
        .stat-feed-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 12px;
          background: var(--canvas-bg-sunken);
          border: 1px solid var(--canvas-line);
          border-radius: var(--radius-card-sm);
          font-size: 12px; color: var(--text-dark);
        }
        .stat-feed-party { display: inline-flex; align-items: center; gap: 5px; font-weight: 500; }
        .stat-feed-mono { font-family: var(--font-mono); font-size: 11px; color: var(--text-dark-muted); }
        .stat-feed-tag {
          font-family: var(--font-mono); font-size: 10px; font-weight: 600;
          letter-spacing: 0.04em;
          padding: 2px 8px; border-radius: 2px;
          background: var(--accent-wash); color: var(--accent-bright);
        }
        .stat-feed-tag.is-signal { background: var(--signal-wash); color: var(--signal); }

        @media (max-width: 640px) {
          .stat-card { min-height: 280px; padding: 24px 20px; }
          .stat-figure { font-size: 48px; }
          .stat-figure-xl { font-size: 60px; }
        }
      `}</style>
    </section>
  );
};
