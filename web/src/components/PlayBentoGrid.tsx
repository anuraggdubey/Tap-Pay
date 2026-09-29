import React from 'react';
import { Radio, Send, ShieldCheck, Zap, Smartphone, Mail } from 'lucide-react';

type PlayBentoGridProps = {
  variant?: 'waitlist' | 'download';
};

export const PlayBentoGrid: React.FC<PlayBentoGridProps> = ({ variant = 'waitlist' }) => {
  const centerTitle =
    variant === 'download'
      ? 'Android APK is almost ready.'
      : 'Reserve your spot before we flip the switch.';

  return (
    <div className="play-bento-grid">
      <div className="play-bento-col">
        <div className="play-bento-card play-bento-card--navy">
          <div>
            <h3>Contactless NFC payments in 4cm</h3>
            <p>Tap two phones — no QR, no addresses at the counter.</p>
          </div>
          <Radio size={44} color="#A78BFA" strokeWidth={1.8} className="play-bento-icon" />
        </div>
        <div className="play-bento-card play-bento-card--pink">
          <h3>Send and receive crypto, instantly</h3>
          <Send size={40} color="#701A75" strokeWidth={1.8} className="play-bento-icon" />
        </div>
      </div>

      <div className="play-bento-center">
        <p className="play-bento-center-kicker">{variant === 'download' ? 'Download' : 'Waitlist'}</p>
        <h3>{centerTitle}</h3>
        {variant === 'download' ? (
          <Smartphone size={48} color="#1A1A1A" strokeWidth={1.6} style={{ marginTop: 20, opacity: 0.85 }} />
        ) : (
          <Mail size={48} color="#1A1A1A" strokeWidth={1.6} style={{ marginTop: 20, opacity: 0.85 }} />
        )}
      </div>

      <div className="play-bento-col">
        <div className="play-bento-card play-bento-card--green">
          <div>
            <h3>100% Non-Custodial &amp; Keystore secured</h3>
            <p>Keys stay on your device. Zero escrow.</p>
          </div>
          <ShieldCheck size={44} color="#34D399" strokeWidth={1.8} className="play-bento-icon" />
        </div>
        <div className="play-bento-card play-bento-card--coral">
          <h3>Built on Monad — sub-second finality</h3>
          <Zap size={42} color="#DC2626" strokeWidth={1.8} className="play-bento-icon" />
        </div>
      </div>
    </div>
  );
};
