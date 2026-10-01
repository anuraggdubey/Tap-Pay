import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { stopSmoothScroll, startSmoothScroll } from '../motion/lenisStore';

const JOINED_KEY = 'tappay_waitlist_joined';

interface WaitlistLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => void;
}

/** Show on every visit/refresh unless the user already joined the waitlist. */
export function shouldShowWaitlistLaunchModal(): boolean {
  try {
    return localStorage.getItem(JOINED_KEY) !== '1';
  } catch {
    return true;
  }
}

export const WaitlistLaunchModal: React.FC<WaitlistLaunchModalProps> = ({ isOpen, onClose, onJoin }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    stopSmoothScroll();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      startSmoothScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="waitlist-launch-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-launch-title"
      onClick={onClose}
    >
      <div className="waitlist-launch-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="waitlist-launch-close" onClick={onClose} aria-label="Close">
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
            <button type="button" className="waitlist-launch-cta" onClick={onJoin}>
              Join the waitlist
            </button>
            <button type="button" className="waitlist-launch-ghost" onClick={onClose}>
              Maybe later
            </button>
          </div>
        </div>

        <div className="waitlist-launch-visual" aria-hidden>
          <div className="waitlist-launch-nfc">)))</div>
          <div className="waitlist-launch-stack">
            <div>4cm tap range · HCE native</div>
            <div>Non-custodial · Monad Mainnet</div>
            <div>Launch email · one tap install</div>
          </div>
        </div>
      </div>
    </div>
  );
};
