import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const GITHUB = 'https://github.com/anuraggdubey/Tap-Pay';
const X_URL = 'https://x.com/tapxpay';

const COLUMNS: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', to: '/#how-it-works' },
      { label: 'NFC simulator', to: '/#demo' },
      { label: 'Product film', to: '/#watch-demo' },
      { label: 'Download', to: '/download' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Documentation', to: '/docs' },
      { label: 'GitHub', href: GITHUB },
      { label: 'Monad docs', href: 'https://docs.monad.xyz' },
      { label: 'Requirements', to: '/#prerequisites' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { label: 'Non-custodial keys', to: '/#security' },
      { label: 'Android Keystore', to: '/#security' },
      { label: 'Host card emulation', to: '/#security' },
      { label: 'On-chain settlement', to: '/#security' },
    ],
  },
];

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer-editorial">
      <div className="phantom-container">
        {/* Closing call to action */}
        <div className="footer-cta">
          <h2 className="footer-cta-title">
            One tap.
            <br />
            <em>Money moved.</em>
          </h2>
          <div className="footer-cta-side">
            <p>Non-custodial NFC payments for Android, settled on-chain in under a second.</p>
            <Link to="/download" className="footer-cta-btn">
              <span>Get the app</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        {/* Link grid */}
        <div className="footer-editorial-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-brand-link" aria-label="TapPay home">
              <svg width="26" height="26" viewBox="0 0 512 512" fill="none" aria-hidden>
                <circle cx="200" cy="120" r="62" fill="currentColor" />
                <circle cx="340" cy="215" r="44" fill="currentColor" opacity="0.6" />
                <circle cx="200" cy="400" r="72" fill="currentColor" />
                <path d="M200 182 C200 215, 240 215, 340 215" stroke="currentColor" strokeWidth="52" strokeLinecap="round" fill="none" />
                <path d="M200 328 L200 182" stroke="currentColor" strokeWidth="52" strokeLinecap="round" fill="none" />
              </svg>
              <span>TapPay</span>
            </Link>
            <p className="footer-brand-copy">
              Tap-to-pay across Monad, Stellar, Solana and Base.
            </p>
            <div className="footer-socials">
              <a href={GITHUB} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="footer-social">
                <GitHubIcon size={16} />
              </a>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="TapPay on X" className="footer-social">
                <XIcon size={14} />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} className="footer-editorial-col" aria-label={col.title}>
              <h3 className="footer-editorial-col-title">{col.title}</h3>
              <ul className="footer-editorial-links">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="footer-editorial-link">
                        {l.label}
                        <ArrowUpRight size={12} className="footer-ext-arrow" />
                      </a>
                    ) : (
                      <Link to={l.to!} className="footer-editorial-link">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Watermark */}
        <div className="footer-wordmark-block" aria-hidden>
          <div className="footer-wordmark-text">TapPay</div>
        </div>

        {/* Legal */}
        <div className="footer-legal-bar">
          <p className="footer-legal-copy">© {year} TapPay</p>
          <div className="footer-status-pill">
            <span className="footer-status-dot" />
            <span>All chains operational</span>
          </div>
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="footer-legal-action">
            Follow @tapxpay
            <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
    </footer>
  );
};
