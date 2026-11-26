import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmWaitlist } from '../services/waitlist';
import '../styles/waitlist.css';

type State = 'working' | 'done' | 'invalid' | 'error';

export default function ConfirmPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>('working');

  useEffect(() => {
    const token = params.get('token') ?? '';
    // Remove the single-use token from the address bar and history right away.
    window.history.replaceState(null, '', window.location.pathname);
    let cancelled = false;
    confirmWaitlist(token).then(result => {
      if (cancelled) {
        return;
      }
      setState(result.ok ? 'done' : result.error === 'invalid' ? 'invalid' : 'error');
    });
    return () => {
      cancelled = true;
    };
    // The token is read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="waitlist-page">
      <div className="waitlist-shell">
        <header className="waitlist-topbar">
          <Link to="/" className="waitlist-logo">tappay</Link>
          <Link to="/" className="waitlist-back">← Back to site</Link>
        </header>
        <div className="waitlist-form-panel" style={{ maxWidth: 520, margin: '64px auto' }} role="status" aria-live="polite">
          {state === 'working' && (
            <>
              <h2>Confirming your email…</h2>
              <p>One moment.</p>
            </>
          )}
          {state === 'done' && (
            <div className="waitlist-success">
              <div className="waitlist-success-icon">✓</div>
              <h3>You&apos;re confirmed.</h3>
              <p>You&apos;re on the TapPay waitlist. We&apos;ll email you when the Android build ships.</p>
            </div>
          )}
          {state === 'invalid' && (
            <>
              <h2>This link doesn&apos;t work</h2>
              <p>
                It may have expired or already been used. Sign up again on the site and we&apos;ll send a fresh
                confirmation email.
              </p>
            </>
          )}
          {state === 'error' && (
            <>
              <h2>Couldn&apos;t confirm right now</h2>
              <p>Please try the link again in a moment.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
