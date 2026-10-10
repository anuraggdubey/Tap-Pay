import React from 'react';
import { ArrowUpRight, Radio, Zap, Timer } from 'lucide-react';
import '../styles/demo-video.css';

const DEMO_SRC = '/videos/tappay-demo.mp4';
const POSTER = '/screenshots/home.jpg';

const MARQUEE =
  'NFC TAP · MONAD MAINNET · CHAIN 143 · ~1S FINALITY · NON-CUSTODIAL · @USERNAME PAY · ';

const STEPS = [
  { n: '01', title: 'Tap', body: 'Hold two Android phones together — backs aligned.' },
  { n: '02', title: 'Sign', body: 'Amount and recipient over HCE; confirm on device.' },
  { n: '03', title: 'Settle', body: 'Mainnet receipt lands before the UI finishes.' },
];

export const DemoVideoSection: React.FC = () => {
  return (
    <section id="watch-demo" className="demo-cinema" aria-labelledby="watch-demo-title">
      <div className="phantom-container">
        <header className="demo-cinema-header scroll-reveal">
          <div className="demo-cinema-kicker">
            <span className="demo-cinema-rec" aria-hidden />
            <Radio size={14} strokeWidth={2.5} />
            Live product film
          </div>
          <h2 id="watch-demo-title" className="demo-cinema-title">
            One tap.
            <br />
            <em>One second.</em> On Monad.
          </h2>
          <p className="demo-cinema-sub">
            Real NFC, real devices — phone-to-phone signing and mainnet settlement in a single take.
          </p>
        </header>

        <div className="phantom-card-wrapper demo-cinema-card-wrap scroll-reveal scroll-delay-1">
          <div className="phantom-card-shadow-layer" style={{ background: '#0D0D12' }} />
          <div className="phantom-card-main demo-cinema-card">
            <div className="demo-cinema-inner">
              <div className="demo-cinema-phone-zone">
                <div className="demo-cinema-chip demo-cinema-chip--a">
                  <Zap size={14} />
                  ~1s finality
                </div>
                <div className="demo-cinema-chip demo-cinema-chip--b">
                  <Timer size={14} />
                  Chain 143
                </div>

                <div className="realistic-phone-chassis demo-cinema-phone">
                  <div className="realistic-phone-btn-vol" />
                  <div className="realistic-phone-btn-pwr" />
                  <div className="realistic-phone-screen demo-cinema-screen">
                    <div className="realistic-phone-camera" />
                    <video
                        className="demo-cinema-video"
                        controls
                        playsInline
                        preload="metadata"
                        poster={POSTER}
                        aria-label="TapPay demo: NFC tap payment on Monad Mainnet"
                      >
                        <source src={DEMO_SRC} type="video/mp4" />
                      </video>
                  </div>
                </div>
              </div>

              <div className="demo-cinema-panel">
                <p className="demo-cinema-panel-lede">
                  Watch the full flow from home screen to confirmed payment — no cuts, no custody, no seed phrases.
                </p>
                <ol className="demo-cinema-steps">
                  {STEPS.map((step) => (
                    <li key={step.n}>
                      <span className="demo-cinema-step-n">{step.n}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <a href="#demo" className="phantom-see-more demo-cinema-cta">
                  <span>Try the NFC simulator</span>
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </div>

            <div className="demo-cinema-marquee" aria-hidden>
              <div className="demo-cinema-marquee-track">
                <span>{MARQUEE}</span>
                <span>{MARQUEE}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export function DocsDemoVideo() {
  return (
    <figure className="docs-video-embed">
      <div className="docs-video-embed-inner">
        <video
          controls
          playsInline
          preload="metadata"
          poster={POSTER}
          aria-label="TapPay product demo video"
        >
          <source src={DEMO_SRC} type="video/mp4" />
        </video>
      </div>
      <figcaption className="docs-video-embed-caption">Watch the full tap-to-pay flow on a real device.</figcaption>
    </figure>
  );
}
