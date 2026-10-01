import React, { useEffect } from 'react';
import { X, Smartphone, Clock, ArrowUpRight } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinWaitlist: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, onJoinWaitlist }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'rgba(10, 10, 15, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      onClick={onClose}
    >
      <div
        className="phantom-modal-box"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#FFFDF9',
          borderRadius: '32px',
          padding: '40px 32px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          color: 'var(--text-dark)',
          border: '1px solid rgba(26, 26, 26, 0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--pill-bg)',
            color: 'var(--text-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--pill-bg)',
              color: 'var(--text-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Smartphone size={28} />
          </div>
          <h3 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Android app — coming soon
          </h3>
          <p style={{ color: 'var(--text-dark-muted)', fontSize: '15px', lineHeight: 1.55, maxWidth: '360px', margin: '0 auto' }}>
            We&apos;re still polishing NFC tap-to-pay on Monad. The public APK isn&apos;t available yet — we&apos;ll post here when it&apos;s ready.
          </p>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px 20px',
            marginBottom: '24px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(26, 26, 26, 0.08)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '9999px',
              background: 'var(--pill-bg)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-dark)',
              marginBottom: '12px',
            }}
          >
            <Clock size={16} color="#10B981" />
            <span>Coming soon</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-dark-muted)', lineHeight: 1.5, margin: 0 }}>
            Android 10+ · NFC required · Monad Mainnet
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onJoinWaitlist();
          }}
          className="phantom-btn-pill"
          style={{
            width: '100%',
            background: '#1A1A1A',
            color: '#FFFDF8',
            padding: '16px',
            fontSize: '15px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            marginBottom: '12px',
          }}
        >
          <span>Join the waitlist</span>
          <ArrowUpRight size={18} />
        </button>
        <a
          href="https://x.com/tapxpay"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-dark-muted)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Follow @tapxpay
        </a>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .phantom-modal-box {
            padding: 28px 20px !important;
            border-radius: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};
