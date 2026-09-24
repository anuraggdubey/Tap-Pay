import React, { useEffect } from 'react';
import { X, Smartphone, Download, QrCode } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
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

  const apkUrl = 'https://drive.google.com/file/d/1w3K3PTeqvt250qMJne4azXeU4D35dC8P/view?usp=drivesdk';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(apkUrl)}&color=1A1A1A&bgcolor=ffffff&qzone=1`;

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
        {/* Close Button */}
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

        {/* Modal Header */}
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
            Download TapPay
          </h3>
          <p style={{ color: 'var(--text-dark-muted)', fontSize: '15px' }}>
            Scan with your Android camera to download the APK directly.
          </p>
        </div>

        {/* QR Code */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(26, 26, 26, 0.08)',
          }}
        >
          <img
            src={qrCodeUrl}
            alt="Scan QR to download TapPay APK"
            style={{ width: '200px', height: '200px', display: 'block', borderRadius: '12px' }}
          />
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-dark)',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <QrCode size={16} color="#10B981" />
            <span>Android 10+ (API 34) · NFC Required</span>
          </div>
        </div>

        {/* Direct APK Link Button */}
        <a
          href={apkUrl}
          target="_blank"
          rel="noopener noreferrer"
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
            textDecoration: 'none',
          }}
        >
          <Download size={18} />
          <span>Direct Download Tap-pay.apk</span>
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
