import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, ExternalLink } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { DocsDemoVideo } from '../components/DemoVideoSection';
import { Footer } from '../components/Footer';
import '../styles/docs.css';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'tap-pay', label: 'Tap Pay (NFC)' },
  { id: 'receive-tap', label: 'Receive via tap' },
  { id: 'username-pay', label: 'Username pay' },
  { id: 'address-pay', label: 'Address pay' },
  { id: 'tokens', label: 'Tokens & amounts' },
  { id: 'security', label: 'Security' },
  { id: 'network', label: 'Network' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'testing', label: 'Get the app' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'community', label: 'Updates & X' },
] as const;

export default function DocsPage() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string>('overview');

  useEffect(() => {
    const ids = SECTIONS.map((s) => s.id);
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const joinWaitlist = () => navigate('/waitlist');

  return (
    <div className="docs-page">
      <Navbar onJoinWaitlist={joinWaitlist} />

      <div className="phantom-container docs-main">
        <header className="docs-hero">
          <div className="docs-hero-kicker">
            <BookOpen size={14} strokeWidth={2.25} />
            Product documentation
          </div>
          <h1>Everything you need to use TapPay</h1>
          <p className="docs-hero-lede">
            TapPay is a non-custodial Android wallet for Monad. Send money with a physical NFC tap, search{' '}
            <span className="docs-code">@username</span>, or pay a wallet address directly — with passkey onboarding,
            on-device signing, and ~1 second settlement on Monad Mainnet.
          </p>
          <div className="docs-hero-cta-row">
            <Link to="/#prerequisites" className="phantom-btn-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              View landing requirements
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/#watch-demo" className="phantom-btn-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid rgba(26,26,26,0.12)' }}>
              Watch product film
            </Link>
          </div>
        </header>

        <nav className="docs-mobile-nav" aria-label="Documentation sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.label}</a>
          ))}
        </nav>

        <div className="docs-layout">
          <aside className="docs-sidebar" aria-label="On this page">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`docs-nav-link${activeId === s.id ? ' is-active' : ''}`}
              >
                {s.label}
              </a>
            ))}
          </aside>

          <main className="docs-content">
            <section id="overview" className="docs-section">
              <h2>Overview</h2>
              <p>
                TapPay combines contactless NFC with human-readable payments on{' '}
                <strong style={{ color: 'var(--text-dark)' }}>Monad Mainnet (Chain ID 143)</strong>. You never paste seed
                phrases in normal use — accounts are created with passkeys (Face ID / fingerprint via Mera), and private
                keys stay in Android secure storage.
              </p>
              <DocsDemoVideo />
              <div className="docs-table-wrap">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Mode</th>
                      <th>Best for</th>
                      <th>What happens</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Tap Pay (NFC)</strong></td>
                      <td>In-person, two phones</td>
                      <td>Sender advertises payment data over HCE; receiver reads it; sender signs and settles on-chain.</td>
                    </tr>
                    <tr>
                      <td><strong>Username pay</strong></td>
                      <td>Remote / no tap</td>
                      <td>Search <span className="docs-code">@username</span> → resolved to wallet → send MON or stablecoins.</td>
                    </tr>
                    <tr>
                      <td><strong>Address pay</strong></td>
                      <td>Power users &amp; integrations</td>
                      <td>Paste or scan a <span className="docs-code">0x…</span> address, pick token, confirm send.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="requirements" className="docs-section">
              <h2>Requirements</h2>
              <p>Before installing TapPay, confirm your setup matches these constraints — NFC tap pay cannot run in a browser or on iOS.</p>
              <div className="docs-card docs-card--mint">
                <h3 style={{ marginTop: 0 }}>Device &amp; OS</h3>
                <ul>
                  <li><strong>Android 10+</strong> (target API 34). TapPay is Android-only.</li>
                  <li><strong>NFC hardware</strong> enabled in system settings.</li>
                  <li><strong>Two NFC-capable Android phones</strong> to test tap-to-pay end-to-end (sender + receiver).</li>
                  <li>iOS does not allow third-party Host Card Emulation — Apple Pay owns card emulation on iPhone.</li>
                </ul>
              </div>
              <div className="docs-card">
                <h3 style={{ marginTop: 0 }}>Account setup</h3>
                <ul>
                  <li>Create a wallet with <strong>passkey / biometric</strong> onboarding (no seed phrase required for daily use).</li>
                  <li>Optionally <strong>claim a username</strong> (e.g. <span className="docs-code">@anurag</span>) linked to your wallet on Monad.</li>
                  <li>Keep a small balance of <strong>MON</strong> for gas and/or supported stablecoins (AUSD, USDC, USDT) for sends.</li>
                  <li>Grant <strong>NFC</strong> and notification permissions when prompted.</li>
                </ul>
              </div>
              <div className="docs-card docs-card--lavender">
                <h3 style={{ marginTop: 0 }}>Network</h3>
                <ul>
                  <li>App is configured for <strong>Monad Mainnet</strong> — Chain ID <span className="docs-code">143</span>, RPC <span className="docs-code">https://rpc.monad.xyz</span>.</li>
                  <li>Transactions confirm in about <strong>one second</strong> under normal conditions.</li>
                </ul>
              </div>
            </section>

            <section id="tap-pay" className="docs-section">
              <h2>Tap Pay (NFC)</h2>
              <p>
                Tap Pay uses <strong>Host Card Emulation (HCE)</strong> on the sender&apos;s phone and NFC reader mode on the
                receiver&apos;s phone. Payment details travel over a short-range NFC session; signing and broadcast always happen
                on-device — never on a TapPay server.
              </p>
              <h3>Sender flow</h3>
              <ol className="docs-steps">
                <li>Open TapPay and choose <strong>Send</strong> (or Tap Pay from home).</li>
                <li>Enter the amount and token (native MON or supported ERC-20).</li>
                <li>When you see <strong>Ready to tap</strong>, your phone begins advertising the session over HCE.</li>
                <li>Hold your phone back-to-back with the receiver&apos;s phone (~4&nbsp;cm).</li>
                <li>After the receiver accepts, your phone <strong>signs locally</strong> and submits via <span className="docs-code">TapPayLedger</span> or <span className="docs-code">MultiTokenLedger</span>.</li>
                <li>Wait for the receipt — explorer link appears once the transaction is mined.</li>
              </ol>
              <div className="docs-card">
                <p style={{ margin: 0 }}>
                  <strong>Why native Android?</strong> Web NFC in Chrome can read/write NDEF tags but cannot emulate a payment
                  card. <span className="docs-code">HostApduService</span> is a system API only available to installed apps.
                </p>
              </div>
            </section>

            <section id="receive-tap" className="docs-section">
              <h2>Receive via tap</h2>
              <p>Receiving is the NFC <strong>reader</strong> role — your wallet address is what the sender needs to complete payment.</p>
              <ol className="docs-steps">
                <li>Open TapPay and tap <strong>Receive</strong> (or follow the in-app prompt when a tap session is detected).</li>
                <li>Hold your phone near the sender&apos;s device when they are on the tap screen.</li>
                <li>Review amount, token, and sender details on the confirmation sheet.</li>
                <li>Tap <strong>Accept</strong> so the sender can finish signing and broadcasting.</li>
                <li>Your activity feed updates when the on-chain payment confirms.</li>
              </ol>
            </section>

            <section id="username-pay" className="docs-section">
              <h2>Username pay</h2>
              <p>
                Username pay works like sending to a handle instead of a hex address. Usernames map to wallet addresses via the
                on-chain <span className="docs-code">UsernameRegistry</span> contract, with Supabase caching for fast lookup on
                chain ID 143.
              </p>
              <h3>Claim your username</h3>
              <ul>
                <li>From <strong>Account</strong> or onboarding, pick a unique handle (stored without the <span className="docs-code">@</span> in the registry).</li>
                <li>Registration is an on-chain transaction — your public address is bound to that name.</li>
              </ul>
              <h3>Pay someone by username</h3>
              <ol className="docs-steps">
                <li>Tap <strong>Pay</strong> and search for <span className="docs-code">@username</span>.</li>
                <li>Confirm the resolved wallet (truncated address shown for safety).</li>
                <li>Select token: MON, AUSD, USDC, or USDT.</li>
                <li>Enter amount on the keypad and confirm with biometrics.</li>
                <li>Transaction routes through <span className="docs-code">MultiTokenLedger</span> for ERC-20 or native ledger methods for MON.</li>
              </ol>
            </section>

            <section id="address-pay" className="docs-section">
              <h2>Address pay</h2>
              <p>
                When you already have a wallet address (from a friend, invoice, or another app), use <strong>Send to address</strong>{' '}
                in the Pay flow.
              </p>
              <ol className="docs-steps">
                <li>Choose <strong>Pay</strong> → enter or paste a valid <span className="docs-code">0x</span> Ethereum-style address.</li>
                <li>The app validates checksum/format before you continue.</li>
                <li>Pick token and amount, then confirm — same signing pipeline as username pay.</li>
                <li>Receipts show the address and, when available, reverse username lookup.</li>
              </ol>
              <p>
                You can copy your own address from <strong>Home</strong> or <strong>Settings</strong> to receive funds from others
                without NFC.
              </p>
            </section>

            <section id="tokens" className="docs-section">
              <h2>Tokens &amp; amounts</h2>
              <p>TapPay supports native MON and major stablecoins on Monad Mainnet for username and address sends. NFC tap flows use the same token picker before tapping.</p>
              <div className="docs-table-wrap">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Use</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>MON</strong></td>
                      <td>Native gas and transfers via <span className="docs-code">payWithLog</span></td>
                    </tr>
                    <tr>
                      <td><strong>AUSD</strong></td>
                      <td>Agora Dollar — cross-border stablecoin sends</td>
                    </tr>
                    <tr>
                      <td><strong>USDC / USDT</strong></td>
                      <td>ERC-20 stablecoin sends via <span className="docs-code">payERC20WithLog</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>Ensure sufficient token balance and a little MON for gas on ERC-20 transfers.</p>
            </section>

            <section id="security" className="docs-section">
              <h2>Security</h2>
              <ul>
                <li><strong>Non-custodial</strong> — TapPay never holds your funds; smart contracts forward payments atomically.</li>
                <li><strong>Keys on device</strong> — private material is stored with Android Keystore / Keychain wrappers, not plaintext.</li>
                <li><strong>Passkeys (Mera)</strong> — unlock and sign with biometrics; no seed phrase in the default onboarding path.</li>
                <li><strong>Session IDs</strong> — NFC payments use session hashing on <span className="docs-code">TapPayLedger</span> to reduce replay risk.</li>
                <li><strong>Verify before accept</strong> — on receive-tap, always confirm amount and sender on screen before accepting.</li>
              </ul>
              <p>
                Export or view sensitive material only from Account settings when you intentionally authenticate — treat secret
                keys like cash.
              </p>
            </section>

            <section id="network" className="docs-section">
              <h2>Network</h2>
              <div className="docs-table-wrap">
                <table className="docs-table">
                  <tbody>
                    <tr>
                      <th>Network</th>
                      <td>Monad Mainnet</td>
                    </tr>
                    <tr>
                      <th>Chain ID</th>
                      <td><span className="docs-code">143</span></td>
                    </tr>
                    <tr>
                      <th>RPC</th>
                      <td><span className="docs-code">https://rpc.monad.xyz</span></td>
                    </tr>
                    <tr>
                      <th>Finality</th>
                      <td>~1 second (typical)</td>
                    </tr>
                    <tr>
                      <th>Explorer</th>
                      <td>
                        <a href="https://monadscan.com" target="_blank" rel="noopener noreferrer">
                          monadscan.com <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="contracts" className="docs-section">
              <h2>On-chain contracts</h2>
              <p>Verified deployments on Monad Mainnet (read-only — no custody):</p>
              <div className="docs-table-wrap">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Contract</th>
                      <th>Role</th>
                      <th>Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>TapPayLedger</td>
                      <td>NFC / native MON rail</td>
                      <td>
                        <a href="https://monadscan.com/address/0x03907aE845E016f5F1605BAE4e6392C3491e03f1" target="_blank" rel="noopener noreferrer">
                          0x0390…e03f1
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td>MultiTokenLedger</td>
                      <td>ERC-20 &amp; cross-border rail</td>
                      <td>
                        <a href="https://monadscan.com/address/0x15319f757FC0e600E681bC0bffD69541916F8860" target="_blank" rel="noopener noreferrer">
                          0x1531…8860
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td>UsernameRegistry</td>
                      <td><span className="docs-code">@username</span> ↔ address</td>
                      <td>
                        <a href="https://monadscan.com/address/0x458DD61Db411ec1feFC069B7B094a983E3a3E265" target="_blank" rel="noopener noreferrer">
                          0x458D…E265
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>Tap any address in the table to open the full contract on Monadscan.</p>
            </section>

            <section id="testing" className="docs-section">
              <h2>Get the app</h2>
              <p>
                TapPay for Android is rolling out through our waitlist. When your invite goes out, you&apos;ll install the
                APK from the official <Link to="/download">Download</Link> page — no developer setup required.
              </p>
              <ul>
                <li>
                  Not on the list yet? <Link to="/waitlist">Join the waitlist</Link> and we&apos;ll email you when
                  installs open.
                </li>
                <li>After installing, turn on <strong>NFC</strong> on both phones and allow TapPay to use it.</li>
                <li>If taps fail, disable battery saver limits for TapPay and keep phones steady, backs together.</li>
                <li>
                  No second phone handy? Use the <Link to="/#demo">NFC simulator</Link> on the home page to see how tap
                  pay feels.
                </li>
              </ul>
            </section>

            <section id="troubleshooting" className="docs-section">
              <h2>Troubleshooting</h2>
              <div className="docs-card">
                <h3 style={{ marginTop: 0 }}>Tap not detected</h3>
                <ul>
                  <li>Confirm both devices are Android with NFC on.</li>
                  <li>Keep phones steady, backs aligned, for 1–2 seconds.</li>
                  <li>Sender must stay on the &quot;Ready to tap&quot; screen until handshake completes.</li>
                </ul>
              </div>
              <div className="docs-card">
                <h3 style={{ marginTop: 0 }}>Username not found</h3>
                <ul>
                  <li>Check spelling; usernames are unique on-chain.</li>
                  <li>Ensure the recipient registered on Monad Mainnet (143).</li>
                </ul>
              </div>
              <div className="docs-card">
                <h3 style={{ marginTop: 0 }}>Transaction failed</h3>
                <ul>
                  <li>Insufficient MON for gas or insufficient token balance.</li>
                  <li>Retry on stable network; view details on Monadscan from the receipt.</li>
                </ul>
              </div>
            </section>

            <section id="community" className="docs-section">
              <h2>Updates &amp; X</h2>
              <p>Product updates, launch timing, and support threads are posted on X. Follow us for APK drops and mainnet news.</p>
              <div className="docs-x-banner">
                <div>
                  <strong>@tapxpay on X</strong>
                  <p>Announcements, demos, and community questions.</p>
                </div>
                <a href="https://x.com/tapxpay" target="_blank" rel="noopener noreferrer">
                  Follow @tapxpay
                  <ArrowUpRight size={16} />
                </a>
              </div>
              <p style={{ marginTop: 20 }}>
                Questions about Monad itself? See{' '}
                <a href="https://docs.monad.xyz" target="_blank" rel="noopener noreferrer">
                  docs.monad.xyz
                </a>
                .
              </p>
            </section>
          </main>
        </div>
      </div>

      <Footer onJoinWaitlist={joinWaitlist} />
    </div>
  );
}
