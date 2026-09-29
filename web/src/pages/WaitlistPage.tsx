import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { joinWaitlist } from '../services/waitlist';
import { PlayBentoGrid } from '../components/PlayBentoGrid';
import '../styles/waitlist.css';

const MARQUEE_ITEMS = [
  'EARLY ACCESS',
  'NFC TAP PAY',
  'MONAD TESTNET',
  'ANDROID BUILD',
  'NO APK YET',
  'JOIN THE QUEUE',
];

export default function WaitlistPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await joinWaitlist(name, email);
    setLoading(false);
    if (result.ok) {
      setDone(true);
      return;
    }
    setError(result.message);
  };

  return (
    <div className="waitlist-page">
      <div className="waitlist-shell">
        <header className="waitlist-topbar">
          <Link to="/" className="waitlist-logo">
            <svg width="26" height="30" viewBox="0 0 512 512" fill="none" aria-hidden>
              <circle cx="200" cy="120" r="62" fill="currentColor" />
              <circle cx="340" cy="215" r="44" fill="currentColor" opacity="0.6" />
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
            tappay
          </Link>
          <Link to="/" className="waitlist-back">← Back to site</Link>
        </header>

        <div className="waitlist-marquee-wrap" aria-hidden>
          <div className="waitlist-marquee-track">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={`${item}-${i}`}>{item}</span>
            ))}
          </div>
        </div>

        <div className="waitlist-grid">
          <div>
            <h1 className="waitlist-headline">
              <em>Waitlist</em>
              Be first to tap
              <br />
              on Monad.
            </h1>
            <p className="waitlist-lede">
              The APK isn&apos;t public yet. Drop your name and email — we&apos;ll send you the download link and launch
              notes the day we ship. No spam, just the tap.
            </p>

          </div>

          <div className="waitlist-form-panel">
            {done ? (
              <div className="waitlist-success">
                <div className="waitlist-success-icon">✓</div>
                <h3>You&apos;re on the list.</h3>
                <p>We&apos;ll email you at launch. Keep NFC on — we&apos;re almost there.</p>
              </div>
            ) : (
              <>
                <h2>Join waitlist</h2>
                <p>Name + email. That&apos;s it. We&apos;ll notify you when TapPay goes live on Android.</p>
                <form onSubmit={onSubmit}>
                  <div className="waitlist-field">
                    <label htmlFor="waitlist-name">Full name</label>
                    <input
                      id="waitlist-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Anurag Dubey"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      disabled={loading}
                    />
                  </div>
                  <div className="waitlist-field">
                    <label htmlFor="waitlist-email">Email</label>
                    <input
                      id="waitlist-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  {error && <p className="waitlist-error" role="alert">{error}</p>}
                  <button type="submit" className="waitlist-submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 size={18} className="spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        Reserve my spot
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
                <p className="waitlist-fine">
                  By joining, you agree to receive one launch email from TapPay. Unsubscribe anytime. Stored securely in
                  our Supabase backend.
                </p>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 56 }}>
          <PlayBentoGrid variant="waitlist" />
        </div>
      </div>

      <style>{`
        .spin {
          animation: wl-spin 0.8s linear infinite;
        }
        @keyframes wl-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
