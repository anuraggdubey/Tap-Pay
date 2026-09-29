import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'tappay_waitlist_promo_dismissed_until';
const JOINED_KEY = 'tappay_waitlist_joined';
const SESSION_KEY = 'tappay_waitlist_promo_session';

interface WaitlistLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => void;
}

export function shouldShowWaitlistLaunchModal(): boolean {
  try {
    if (localStorage.getItem(JOINED_KEY) === '1') return false;
    const until = localStorage.getItem(DISMISS_KEY);
    if (until && Date.now() < Number(until)) return false;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return false;
  } catch {
    return true;
  }
  return true;
}

export function markWaitlistLaunchShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function dismissWaitlistLaunchForDays(days = 2): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

export const WaitlistLaunchModal: React.FC<WaitlistLaunchModalProps> = ({ isOpen, onClose, onJoin }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLater = () => {
    dismissWaitlistLaunchForDays(2);
    onClose();
  };

  const handleJoin = () => {
    markWaitlistLaunchShown();
    onJoin();
  };

  return (
    <div
      className="waitlist-launch-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-launch-title"
      onClick={handleLater}
    >
      <div className="waitlist-launch-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="waitlist-launch-close" onClick={handleLater} aria-label="Close">
          <X size={18} />
        </button>

        <div className="waitlist-launch-copy">
          <div className="waitlist-launch-tag">
            <span className="pulse" aria-hidden />
            Early access
          </div>
          <h2 id="waitlist-launch-title" className="waitlist-launch-title">
            TapPay isn&apos;t in the store yet.
            <br />
            Get on the list.
          </h2>
          <p className="waitlist-launch-sub">
            We&apos;re finishing phone-to-phone NFC on Monad. Join the waitlist — we&apos;ll email you the moment the
            Android build goes live.
          </p>
          <div className="waitlist-launch-actions">
            <button type="button" className="waitlist-launch-cta" onClick={handleJoin}>
              Join the waitlist
            </button>
            <button type="button" className="waitlist-launch-ghost" onClick={handleLater}>
              Maybe later
            </button>
          </div>
        </div>

        <div className="waitlist-launch-visual" aria-hidden>
          <div className="waitlist-launch-nfc">)))</div>
          <div className="waitlist-launch-stack">
            <div>4cm tap range · HCE native</div>
            <div>Non-custodial · Monad testnet</div>
            <div>Launch email · one tap install</div>
          </div>
        </div>
      </div>
    </div>
  );
};
