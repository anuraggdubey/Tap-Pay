import React, { useEffect } from 'react';
import { X, Download, Smartphone, Check, ExternalLink, QrCode, AlertCircle } from 'lucide-react';

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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(apkUrl)}&color=000000&bgcolor=ffffff&qzone=1`;

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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'rgba(18, 19, 29, 0.98)',
          border: '1px solid rgba(131, 110, 249, 0.35)',
          borderRadius: '32px',
          padding: '36px 32px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 50px rgba(131, 110, 249, 0.25)',
          position: 'relative',
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
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease',
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #836ef9, #5037d8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(131, 110, 249, 0.4)',
            }}
          >
            <Smartphone size={28} color="#fff" />
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>Download TapPay APK</h3>
          <p style={{ color: '#9ea0b2', fontSize: '14px' }}>
            Version 1.0 · Android 10+ (API 34) · Contactless NFC Ready
          </p>
        </div>

        {/* QR Code Card (Scan with Phone Camera) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#ffffff',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          <img
            src={qrCodeUrl}
            alt="Scan QR to download TapPay APK"
            style={{ width: '180px', height: '180px', display: 'block', borderRadius: '8px' }}
          />
          <div
            style={{
              color: '#0a0b0e',
              fontSize: '13px',
              fontWeight: 700,
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <QrCode size={16} />
            <span>Scan with your Android camera</span>
          </div>
        </div>

        {/* Direct Download Button */}
        <a
          href={apkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-phantom-purple"
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '16px',
            marginBottom: '16px',
            borderRadius: '16px',
          }}
        >
          <Download size={18} />
          <span>Direct Download Tap-pay.apk</span>
        </a>

        {/* Installation Guidelines */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#ab9ff2', fontSize: '13px', fontWeight: 700 }}>
            <AlertCircle size={16} />
            <span>Android Installation Steps</span>
          </div>
          <ol style={{ fontSize: '12px', color: '#9ea0b2', lineHeight: 1.6, paddingLeft: '18px' }}>
            <li>Tap downloaded <strong>Tap-pay.apk</strong> and enable "Allow from this source".</li>
            <li>Enable <strong>NFC</strong> in your Android Quick Settings toggles.</li>
            <li>For end-to-end tap testing, install on two phones (one sender, one receiver).</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
