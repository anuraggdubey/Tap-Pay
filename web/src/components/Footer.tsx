import React from 'react';
import { ArrowUpRight, Video, Radio, Send, ShieldCheck, Zap } from 'lucide-react';

interface FooterProps {
  onOpenDownload: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenDownload }) => {
  return (
    <footer
      style={{
        background: 'var(--canvas-bg)',
        padding: '0 0 48px',
        position: 'relative',
      }}
    >
      {/* ============================================= */}
      {/* SINGLE BENTO CTA — MetaMask Style             */}
      {/* 4 colorful cards flanking a center phone       */}
      {/* ============================================= */}
      <div className="phantom-container">
        {/* Section Title */}
        <div style={{ textAlign: 'center', marginBottom: '40px', paddingTop: '40px' }}>
          <h2
            style={{
              fontSize: 'clamp(36px, 5vw, 60px)',
              fontWeight: 400,
              letterSpacing: '-0.035em',
              lineHeight: 1.08,
              color: 'var(--text-dark)',
            }}
          >
            Get started with TapPay
          </h2>
        </div>

        {/* Bento Grid: 3 columns — Left cards | Center phone | Right cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr 1fr',
            gap: '16px',
            alignItems: 'stretch',
            minHeight: '560px',
            marginBottom: '60px',
          }}
          className="footer-bento-grid"
        >
          {/* LEFT COLUMN — Two stacked cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-parallax="0.05">
            {/* Card: Deep Navy — NFC Touch */}
            <div
              className="scroll-reveal-left scroll-delay-1"
              style={{
                background: 'linear-gradient(145deg, #1E1B4B 0%, #312E81 100%)',
                borderRadius: '28px',
                padding: '32px 26px',
                color: '#FFFFFF',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div>
                <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.2, marginBottom: '10px' }}>
                  Contactless NFC payments in 4cm
                </div>
                <p style={{ fontSize: '14px', opacity: 0.7, lineHeight: 1.5 }}>
                  Just tap two phones together — no scanning, no QR codes
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                <Radio size={46} color="#836EF9" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>

            {/* Card: Soft Pink — Send Globally */}
            <div
              className="scroll-reveal-left scroll-delay-2"
              style={{
                background: '#F5D0FE',
                borderRadius: '28px',
                padding: '32px 26px',
                color: '#701A75',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.2 }}>
                Send and receive crypto, instantly
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Send size={42} color="#701A75" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>
          </div>

          {/* CENTER — Phone showing home screen, 70% visible from top */}
          <div
            className="scroll-reveal-scale"
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              overflow: 'hidden',
              borderRadius: '28px',
              background: '#EBE7FE',
            }}
          >
            {/* CTA Text above phone */}
            <div style={{ padding: '32px 28px 0', textAlign: 'center', zIndex: 2 }}>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--text-dark)',
                  letterSpacing: '-0.02em',
                  marginBottom: '14px',
                  lineHeight: 1.15,
                }}
              >
                Ready to take control of your crypto?
              </div>
              <button
                onClick={onOpenDownload}
                className="phantom-btn-pill"
                style={{
                  background: 'var(--text-dark)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  padding: '12px 24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  border: 'none',
                  marginBottom: '20px',
                }}
              >
                Download APK
                <ArrowUpRight size={16} />
              </button>
            </div>

            {/* Phone — sits at bottom, overflows down (70% visible) with dynamic scroll lift */}
            <div
              data-parallax="0.16"
              style={{
                width: '260px',
                flexShrink: 0,
                position: 'relative',
                marginBottom: '-160px',
              }}
            >
              <div
                style={{
                  background: '#12131B',
                  borderRadius: '38px 38px 0 0',
                  padding: '8px 8px 0',
                  boxShadow: '0 -20px 60px rgba(60, 49, 91, 0.25)',
                }}
              >
                <div
                  style={{
                    borderRadius: '30px 30px 0 0',
                    overflow: 'hidden',
                    background: '#000',
                  }}
                >
                  <img
                    src="/screenshots/home.png"
                    alt="TapPay Home Screen"
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Two stacked cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-parallax="0.05">
            {/* Card: Dark Teal — Security */}
            <div
              className="scroll-reveal-right scroll-delay-1"
              style={{
                background: 'linear-gradient(145deg, #064E3B 0%, #065F46 100%)',
                borderRadius: '28px',
                padding: '32px 26px',
                color: '#ECFDF5',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.2, marginBottom: '10px' }}>
                  100% Non-Custodial &amp; Keystore secured
                </div>
                <p style={{ fontSize: '14px', opacity: 0.75, lineHeight: 1.5 }}>
                  Your keys never leave your device. Zero escrow.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                <ShieldCheck size={46} color="#34D399" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>

            {/* Card: Peach/Salmon — Built on Monad */}
            <div
              className="scroll-reveal-right scroll-delay-2"
              style={{
                background: '#FECACA',
                borderRadius: '28px',
                padding: '32px 26px',
                color: '#991B1B',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.2 }}>
                Built on Monad — sub-second finality
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Zap size={44} color="#DC2626" strokeWidth={1.8} className="phantom-floating" />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================= */}
        {/* BOTTOM BAR — Links, Socials, Copyright         */}
        {/* All in ONE row, same lavender bg               */}
        {/* ============================================= */}
        <div
          style={{
            borderTop: '1px solid rgba(60, 49, 91, 0.1)',
            paddingTop: '36px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '32px',
          }}
          className="footer-bottom-grid"
        >
          {/* Nav Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Home', href: '#' },
              { label: 'Our Product', href: '#how-it-works' },
              { label: 'NFC Simulator', href: '#demo' },
              { label: 'Prerequisites', href: '#prerequisites' },
              { label: 'Security', href: '#security' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  color: 'var(--text-dark-muted)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'color 0.15s ease',
                }}
                className="footer-link-item"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* External Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Monad Docs', href: 'https://docs.monad.xyz' },
              { label: 'Testnet Faucet', href: 'https://faucet.monad.xyz' },
              { label: 'MonadScan Explorer', href: 'https://testnet.monadscan.com' },
              { label: 'Privacy Policy', href: '#' },
              { label: 'Terms & Conditions', href: '#' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                style={{
                  color: 'var(--text-dark-muted)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'color 0.15s ease',
                }}
                className="footer-link-item"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Socials */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)' }}>Follow us</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {/* X */}
              <a
                href="https://x.com/tapxpay"
                target="_blank"
                rel="noopener noreferrer"
                title="X @tapxpay"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--text-dark)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'transform 0.15s ease',
                }}
                className="social-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/anuraggdubey/Tap-Pay"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--text-dark)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'transform 0.15s ease',
                }}
                className="social-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>

              {/* Video Demo */}
              <a
                href="https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                title="Video Demo"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--text-dark)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'transform 0.15s ease',
                }}
                className="social-btn"
              >
                <Video size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div
          style={{
            borderTop: '1px solid rgba(26, 26, 26, 0.08)',
            marginTop: '32px',
            paddingTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '13px',
            color: 'var(--text-dark-subtle)',
          }}
        >
          <div>© 2025 TapPay. Contactless Decentralized Payments on Monad.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E' }} />
            <span>Monad Testnet 10143 Operational</span>
          </div>
        </div>
      </div>

      <style>{`
        .footer-link-item:hover {
          color: var(--text-dark) !important;
        }
        .social-btn:hover {
          opacity: 0.9;
        }
        @media (max-width: 960px) {
          .footer-bento-grid {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
          .footer-bottom-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .footer-bottom-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
};
