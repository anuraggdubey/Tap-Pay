import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileText } from 'lucide-react';

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

interface FooterProps {
  onJoinWaitlist: () => void;
}

function ExtLink({
  href,
  children,
  external = true,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external && href.startsWith('http')) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="footer-editorial-link footer-editorial-link--external"
      >
        <FileText size={15} strokeWidth={1.75} />
        <span>{children}</span>
        <ArrowUpRight size={13} className="footer-ext-arrow" />
      </a>
    );
  }
  return (
    <a href={href} className="footer-editorial-link">
      <span>{children}</span>
    </a>
  );
}

export const Footer: React.FC<FooterProps> = ({ onJoinWaitlist }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer-editorial">
      <div className="phantom-container">
        <div className="footer-editorial-grid">
          <div className="footer-editorial-col">
            <h3 className="footer-editorial-col-title">Product</h3>
            <nav className="footer-editorial-links" aria-label="Product">
              <Link to="/docs" className="footer-editorial-link">Documentation</Link>
              <Link to="/#how-it-works" className="footer-editorial-link">Features</Link>
              <Link to="/#watch-demo" className="footer-editorial-link">Product film</Link>
              <Link to="/#demo" className="footer-editorial-link">NFC Simulator</Link>
              <Link to="/download" className="footer-editorial-link">Download</Link>
              <Link to="/waitlist" className="footer-editorial-link">Waitlist</Link>
              <button type="button" className="footer-editorial-cta" onClick={onJoinWaitlist}>
                Join early access
                <ArrowUpRight size={14} />
              </button>
            </nav>
          </div>

          <div className="footer-editorial-col footer-editorial-col--mobile-hide">
            <h3 className="footer-editorial-col-title">Developers &amp; Docs</h3>
            <nav className="footer-editorial-links" aria-label="Developers">
              <Link to="/docs" className="footer-editorial-link">TapPay Docs</Link>
              <ExtLink href="https://docs.monad.xyz">Monad Documentation</ExtLink>
              <a
                href="https://github.com/anuraggdubey/Tap-Pay"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-editorial-link footer-editorial-link--external"
              >
                <GitHubIcon size={15} />
                <span>GitHub Repository</span>
                <ArrowUpRight size={13} className="footer-ext-arrow" />
              </a>
              <a
                href="https://x.com/tapxpay"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-editorial-link footer-editorial-link--external"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>@tapxpay on X</span>
                <ArrowUpRight size={13} className="footer-ext-arrow" />
              </a>
            </nav>
            <p className="footer-editorial-tagline">
              Phone-to-phone NFC tap payments on Monad — non-custodial, sub-second settlement.
            </p>
          </div>

          <div className="footer-editorial-col footer-editorial-col--mobile-hide">
            <h3 className="footer-editorial-col-title">Network</h3>
            <p className="footer-editorial-meta">Monad Mainnet · Chain 143</p>
            <p className="footer-editorial-locales">
              NFC HCE · ISO-DEP · @username sends · Android 10+ · ~0.8s finality · hardware keystore
            </p>
            <a href="/#prerequisites" className="footer-editorial-link" style={{ marginTop: 14 }}>
              View device requirements →
            </a>
          </div>

          <div className="footer-editorial-col footer-editorial-col--mobile-hide">
            <h3 className="footer-editorial-col-title">Trust &amp; Security</h3>
            <nav className="footer-editorial-links" aria-label="Security">
              <Link to="/#security" className="footer-editorial-link">Non-custodial keys</Link>
              <Link to="/#security" className="footer-editorial-link">Android Keystore / StrongBox</Link>
              <Link to="/#security" className="footer-editorial-link">Host card emulation</Link>
              <Link to="/#security" className="footer-editorial-link">Atomic on-chain settlement</Link>
            </nav>
          </div>
        </div>

        <div className="footer-wordmark-block" aria-hidden>
          <div className="footer-wordmark-inner">
            <svg className="footer-wordmark-mark" viewBox="0 0 512 512" fill="none">
              <circle cx="200" cy="120" r="62" fill="currentColor" />
              <circle cx="340" cy="215" r="44" fill="currentColor" opacity="0.65" />
              <circle cx="200" cy="400" r="72" fill="currentColor" />
              <path
                d="M200 182 C200 215, 240 215, 340 215"
                stroke="currentColor"
                strokeWidth="52"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M200 328 L200 182" stroke="currentColor" strokeWidth="52" strokeLinecap="round" fill="none" />
            </svg>
            <div className="footer-wordmark-text">TapPay</div>
          </div>
        </div>

        <div className="footer-legal-bar">
          <div>
            <p className="footer-legal-copy">
              © {year} TapPay. Contactless decentralized payments on Monad.
            </p>
            <div className="footer-status-pill">
              <span className="footer-status-dot" />
              <span>Monad Mainnet 143 operational</span>
            </div>
          </div>
          <div className="footer-legal-actions">
            <a
              href="https://github.com/anuraggdubey/Tap-Pay"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-legal-action"
            >
              <GitHubIcon size={16} />
              GitHub
            </a>
            <a
              href="https://x.com/tapxpay"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-legal-action"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Twitter / X
            </a>
            <a
              href="https://docs.monad.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-legal-action"
            >
              <FileText size={16} strokeWidth={1.75} />
              Documentation
            </a>
            <a
              href="https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-legal-action"
            >
              Video demo
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
