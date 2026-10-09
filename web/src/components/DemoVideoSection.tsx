import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import '../styles/demo-video.css';

const DEMO_SRC = '/videos/tappay-demo.mp4';
const POSTER = '/screenshots/home.jpg';

export const DemoVideoSection: React.FC = () => {
  return (
    <section id="watch-demo" className="demo-video-section" aria-labelledby="watch-demo-title">
      <div className="phantom-container">
        <div className="demo-video-grid">
          <div className="demo-video-copy scroll-reveal">
            <div className="demo-video-kicker">
              <span className="demo-video-kicker-dot" aria-hidden />
              Product film
            </div>
            <h2 id="watch-demo-title" className="demo-video-title">
              See a real tap settle on Monad.
            </h2>
            <p className="demo-video-lede">
              Phone-to-phone NFC, on-device signing, and sub-second mainnet confirmation — captured in one continuous
              take.
            </p>
            <ul className="demo-video-bullets">
              <li>
                <span>1</span>
                Two Android phones, backs together
              </li>
              <li>
                <span>2</span>
                Amount + recipient over HCE
              </li>
              <li>
                <span>3</span>
                Receipt before the animation ends
              </li>
            </ul>
            <a href="#demo" className="phantom-see-more" style={{ marginTop: 28, display: 'inline-flex' }}>
              <span>Try the NFC simulator</span>
              <ArrowUpRight size={16} />
            </a>
          </div>

          <div className="demo-video-stage scroll-reveal scroll-delay-1">
            <div className="demo-video-glow" aria-hidden />
            <div className="demo-video-phone">
              <div className="demo-video-phone-screen">
                <video
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
            <p className="demo-video-caption">TapPay on Monad Mainnet · Chain 143</p>
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
