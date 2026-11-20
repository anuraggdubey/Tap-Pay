import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { HeroMeshCanvas } from './effects/HeroMeshCanvas';
import {
  Smartphone,
  ArrowUpRight,
  Wifi,
  Battery,
  Play,
  Pause,
} from 'lucide-react';
import {
  TapPayMockHome,
  TapPayMockPay,
  TapPayMockNfcSession,
  TapPayMockSuccess,
  TapPayMockTabBar,
  TapPayMockHistory,
  TapPayMockSettings,
  TapPayMockTxDetail,
} from './tappay-mock/TapPayMockScreens';


type FlowStep = 'home' | 'amount' | 'nfc_search' | 'success' | 'history' | 'tx_detail' | 'settings';

const STEP_DURATIONS: Record<FlowStep, number> = {
  home: 1400,
  amount: 1400,
  nfc_search: 1200,
  success: 1300,
  history: 1300,
  tx_detail: 1400,
  settings: 1300,
};

const STEPS_ORDER: FlowStep[] = [
  'home',
  'amount',
  'nfc_search',
  'success',
  'history',
  'tx_detail',
  'settings',
];

export const Hero: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('home');
  const [isPaused, setIsPaused] = useState(false);
  const [typedAmount, setTypedAmount] = useState('0.0');
  const [simulatedTapActive, setSimulatedTapActive] = useState(false);
  const [tapCursorPos, setTapCursorPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 50, y: 50, visible: false });
  const [balance, setBalance] = useState(76.412);
  const [stepProgress, setStepProgress] = useState(0);

  // Determine active bottom nav tab based on current step
  const activeNavTab: 'home' | 'pay' | 'history' | 'settings' =
    currentStep === 'home'
      ? 'home'
      : currentStep === 'amount' || currentStep === 'nfc_search' || currentStep === 'success'
      ? 'pay'
      : currentStep === 'history' || currentStep === 'tx_detail'
      ? 'history'
      : 'settings';

  // Main automated video playback loop
  useEffect(() => {
    if (isPaused) return;

    const duration = STEP_DURATIONS[currentStep];
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setStepProgress(pct);
    }, 25);

    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    if (currentStep === 'home') {
      setTypedAmount('0.0');
      // Fast cursor moves to "Send Tap (NFC)" button and taps it
      t1 = setTimeout(() => {
        setTapCursorPos({ x: 28, y: 50, visible: true });
      }, 350);

      t2 = setTimeout(() => {
        setSimulatedTapActive(true);
      }, 750);

      t3 = setTimeout(() => {
        setSimulatedTapActive(false);
        setTapCursorPos({ x: 32, y: 54, visible: false });
      }, 1050);
    } else if (currentStep === 'amount') {
      // Snappy typing amount 12.5 MON
      setTypedAmount('0');
      setTimeout(() => setTypedAmount('1'), 120);
      setTimeout(() => setTypedAmount('12'), 280);
      setTimeout(() => setTypedAmount('12.'), 440);
      setTimeout(() => setTypedAmount('12.5'), 600);

      // Fast cursor moves to "Ready to Tap with NFC" button
      t1 = setTimeout(() => {
        setTapCursorPos({ x: 50, y: 88, visible: true });
      }, 750);

      t2 = setTimeout(() => {
        setSimulatedTapActive(true);
      }, 1050);

      t3 = setTimeout(() => {
        setSimulatedTapActive(false);
        setTapCursorPos({ x: 50, y: 88, visible: false });
      }, 1250);
    } else if (currentStep === 'nfc_search') {
      setTapCursorPos({ x: 50, y: 50, visible: false });
    } else if (currentStep === 'success') {
      setBalance(63.912);
      // Fast cursor targets bottom nav "History" icon
      t1 = setTimeout(() => {
        setTapCursorPos({ x: 62, y: 95, visible: true });
      }, 550);

      t2 = setTimeout(() => {
        setSimulatedTapActive(true);
      }, 900);

      t3 = setTimeout(() => {
        setSimulatedTapActive(false);
        setTapCursorPos({ x: 62, y: 95, visible: false });
      }, 1150);
    } else if (currentStep === 'history') {
      // Fast cursor targets the first transaction row "@misbah"
      t1 = setTimeout(() => {
        setTapCursorPos({ x: 50, y: 32, visible: true });
      }, 450);

      t2 = setTimeout(() => {
        setSimulatedTapActive(true);
      }, 850);

      t3 = setTimeout(() => {
        setSimulatedTapActive(false);
        setTapCursorPos({ x: 50, y: 32, visible: false });
      }, 1150);
    } else if (currentStep === 'tx_detail') {
      // Fast cursor targets bottom nav "Settings" icon
      t1 = setTimeout(() => {
        setTapCursorPos({ x: 88, y: 95, visible: true });
      }, 600);

      t2 = setTimeout(() => {
        setSimulatedTapActive(true);
      }, 950);

      t3 = setTimeout(() => {
        setSimulatedTapActive(false);
        setTapCursorPos({ x: 88, y: 95, visible: false });
      }, 1200);
    } else if (currentStep === 'settings') {
      // Fast cursor targets bottom nav "Home" icon
      t1 = setTimeout(() => {
        setTapCursorPos({ x: 12, y: 95, visible: true });
      }, 550);

      t2 = setTimeout(() => {
        setSimulatedTapActive(true);
      }, 900);

      t3 = setTimeout(() => {
        setSimulatedTapActive(false);
        setTapCursorPos({ x: 12, y: 95, visible: false });
      }, 1150);
    }

    // Advance to next step
    const timer = setTimeout(() => {
      const nextIndex = (STEPS_ORDER.indexOf(currentStep) + 1) % STEPS_ORDER.length;
      setCurrentStep(STEPS_ORDER[nextIndex]);
      setStepProgress(0);
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [currentStep, isPaused]);

  const handleSelectStep = (step: FlowStep) => {
    setCurrentStep(step);
    setStepProgress(0);
  };

  return (
    <section id="hero" className="hero-section">
      <HeroMeshCanvas />

      <div className="phantom-container hero-content-wrap">
        {/* Centered editorial header */}
        <div className="hero-header-block">
          <div className="field-kicker hero-kicker">Android · NFC · Non-custodial</div>
          <h1 className="hero-headline">
            <span className="hero-headline-line1">Tap phones.</span>
            <span className="hero-headline-line2">Move money.</span>
          </h1>
          <p className="hero-description">
            Self-custodial payments over a physical NFC tap — no QR codes, no wallet addresses,
            no seed-phrase theatre. Two Android phones within <strong>4&nbsp;cm</strong>, settled
            on-chain in under a second.
          </p>
          <div className="hero-action-buttons">
            <Link to="/download" className="hero-btn-primary" style={{ textDecoration: 'none' }}>
              <Smartphone size={18} />
              <span>Multi-Chain APK — Coming Soon</span>
              <span className="btn-version-badge">Android</span>
            </Link>
            <a
              href="https://x.com/tapxpay"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-btn-secondary"
            >
              <span>Follow @tapxpay</span>
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>

        {/* Phone as the centrepiece visual */}
        <div className="hero-phone-stage">
          <div className="hero-phone-glow" />
          <div className="hero-phone-column">

            {/* Realistic Phone Chassis */}
            <div
              className="realistic-phone-chassis hero-phone-device"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Phone Volume & Power Buttons */}
              <div className="realistic-phone-btn-vol" />
              <div className="realistic-phone-btn-pwr" />

              {/* Realistic Phone Screen */}
              <div className="realistic-phone-screen tp-mock-root">
                {/* Camera Hole Punch */}
                <div className="realistic-phone-camera" />

                {/* Status Bar */}
                <div className="sim-status-bar">
                  <span className="sim-status-time">9:41</span>
                  <div className="sim-status-chip">
                    <span className="sim-chip-dot" />
                    <span>Multi-Chain</span>
                  </div>
                  <div className="sim-status-icons">
                    <Wifi size={12} />
                    <Battery size={12} />
                  </div>
                </div>

                {/* ====================================================== */}
                {/* FULL FLOW SCREENS (Home -> Amount -> NFC -> GPay       */}
                {/* -> History -> Tx Detail -> Settings -> Home)           */}
                {/* ====================================================== */}
                <div className="sim-screen-container">
                  {/* SCREEN 1: HOME DASHBOARD */}
                  {currentStep === 'home' && (
                    <TapPayMockHome
                      compact
                      username="@anurag"
                      avatarLetter="A"
                      sendActive={simulatedTapActive}
                    />
                  )}

                  {currentStep === 'amount' && (
                    <TapPayMockPay
                      compact
                      typedAmount={typedAmount}
                      activeKey={null}
                      availableBalance={balance.toFixed(4)}
                      addressShort="0x1a70…1A4E"
                      primaryLabel="Ready to Tap"
                      primaryTapped={simulatedTapActive}
                    />
                  )}

                  {currentStep === 'nfc_search' && (
                    <TapPayMockNfcSession
                      title="Hold phones together"
                      subtitle="Sending 12.5 MON"
                      peerName="@misbah (Receiver)"
                      peerAddr="0x8F21…4E29"
                      peerLetter="M"
                      statusLine="NFC session active…"
                    />
                  )}

                  {currentStep === 'success' && (
                    <TapPayMockSuccess
                      amount="12.5"
                      signed="-"
                      headline="Payment confirmed"
                      subline="Sent to @misbah"
                      rows={[
                        { label: 'Balance', value: `${balance.toFixed(3)} MON` },
                        { label: 'Finality', value: '~0.8s' },
                        { label: 'Chain', value: '143 ✓' },
                      ]}
                    />
                  )}

                  {/* SCREEN 5: ACTIVITY & HISTORY LIST */}
                  {currentStep === 'history' && (
                    <TapPayMockHistory compact highlightFirstRow={simulatedTapActive} />
                  )}

                  {currentStep === 'tx_detail' && <TapPayMockTxDetail compact />}

                  {currentStep === 'settings' && <TapPayMockSettings compact />}

                  {/* Simulated Tap Cursor Indicator */}
                  {tapCursorPos.visible && (
                    <div
                      className={`sim-tap-cursor ${simulatedTapActive ? 'tap-clicked' : ''}`}
                      style={{
                        left: `${tapCursorPos.x}%`,
                        top: `${tapCursorPos.y}%`,
                      }}
                    >
                      <div className="cursor-pointer" />
                      <div className="cursor-ripple" />
                    </div>
                  )}
                </div>

                <TapPayMockTabBar active={activeNavTab} />

                {/* Bottom Home Indicator */}
                <div className="sim-home-bar" />
              </div>
            </div>

            {/* ============================================================ */}
            {/* VIDEO TIMELINE SCRUBBER / FLOW STEP INDICATORS                */}
            {/* ============================================================ */}
            <div className="hero-flow-controller">
              <div className="flow-controller-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="flow-live-dot" />
                  <span className="flow-title">Interactive Walkthrough</span>
                </div>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="flow-pause-btn"
                  title={isPaused ? 'Resume walkthrough' : 'Pause walkthrough'}
                >
                  {isPaused ? <Play size={12} /> : <Pause size={12} />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
              </div>

              {/* 5 Segment Flow Chapters */}
              <div className="flow-steps-grid">
                {[
                  { id: 'home' as FlowStep, label: '1. Home' },
                  { id: 'amount' as FlowStep, label: '2. Send NFC' },
                  { id: 'success' as FlowStep, label: '3. GPay Receipt' },
                  { id: 'history' as FlowStep, label: '4. History & Tx' },
                  { id: 'settings' as FlowStep, label: '5. Profile' },
                ].map((s) => {
                  const isActive =
                    s.id === 'amount'
                      ? currentStep === 'amount' || currentStep === 'nfc_search'
                      : s.id === 'history'
                      ? currentStep === 'history' || currentStep === 'tx_detail'
                      : currentStep === s.id;

                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectStep(s.id)}
                      className={`flow-step-tab ${isActive ? 'is-active' : ''}`}
                    >
                      <div className="step-bar-track">
                        <div
                          className="step-bar-fill"
                          style={{
                            width: isActive ? `${stepProgress}%` : '0%',
                          }}
                        />
                      </div>
                      <span className="step-label">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Metrics strip below phone */}
          <div className="hero-metrics-bar">
            <div className="metric-item">
              <div className="metric-value">~0.8s</div>
              <div className="metric-label">Fast Finality</div>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <div className="metric-value">4cm</div>
              <div className="metric-label">NFC Range</div>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <div className="metric-value">100%</div>
              <div className="metric-label">Non-Custodial</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ========================================================= */
        /* HERO — CENTRED EDITORIAL LAYOUT                           */
        /* ========================================================= */
        .hero-section {
          position: relative;
          overflow: hidden;
          padding: 130px 0 56px;
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          background: transparent;
          color: var(--text-dark);
        }

        .hero-content-wrap {
          position: relative;
          z-index: 2;
          width: 100%;
        }

        .hero-header-block {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 48px;
        }

        .hero-kicker { margin-bottom: 20px; }

        .hero-headline {
          font-family: var(--font-serif);
          font-size: clamp(56px, 9vw, 120px);
          font-weight: 400;
          letter-spacing: -0.025em;
          line-height: 0.95;
          margin-bottom: 24px;
        }
        .hero-headline-line1 {
          display: block;
          color: var(--text-dark);
        }
        .hero-headline-line2 {
          display: block;
          font-style: italic;
        }

        .hero-description {
          font-family: var(--font-sans);
          font-size: 17px;
          line-height: 1.65;
          color: var(--text-dark-muted);
          max-width: 520px;
          margin-bottom: 32px;
          font-weight: 400;
        }
        .hero-description strong {
          color: var(--text-dark);
          font-weight: 600;
        }

        .hero-action-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .hero-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--accent);
          color: var(--text-on-accent);
          padding: 15px 26px;
          border-radius: var(--radius-card-sm);
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.01em;
          border: 1px solid var(--accent);
          transition: transform 0.18s var(--ease-tap), background 0.18s ease;
          cursor: pointer;
        }
        .hero-btn-primary:hover {
          background: var(--accent-bright);
          border-color: var(--accent-bright);
        }
        .hero-btn-primary:active { transform: scale(0.96); }
        .btn-version-badge {
          background: rgba(6, 6, 8, 0.22);
          padding: 2px 8px;
          border-radius: 2px;
          font-size: 11px;
          font-weight: 600;
        }

        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          color: var(--text-dark);
          padding: 15px 22px;
          border-radius: var(--radius-card-sm);
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
          border: 1px solid var(--canvas-line-bright);
          transition: all 0.18s ease;
          text-decoration: none;
        }
        .hero-btn-secondary:hover {
          border-color: var(--accent);
          color: var(--accent-bright);
        }

        /* Phone centrepiece */
        .hero-phone-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          margin-bottom: 40px;
        }

        .hero-phone-glow {
          position: absolute;
          width: 420px;
          height: 420px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(10, 132, 255, 0.10) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }

        .hero-phone-column {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Metrics Bar */
        .hero-metrics-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          padding-top: 28px;
          border-top: 1px solid var(--canvas-line);
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
        }
        .metric-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .metric-value {
          font-family: var(--font-serif);
          font-size: 30px;
          font-weight: 400;
          letter-spacing: -0.01em;
          color: var(--text-dark);
        }
        .metric-label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-dark-subtle);
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .metric-divider {
          width: 1px;
          height: 32px;
          background: var(--canvas-line);
        }

        /* ========================================================= */
        /* PHONE DEVICE & AUTOMATED FLOW SIMULATOR                   */
        /* ========================================================= */

        .hero-phone-device {
          width: 300px;
          height: 615px;
          border-radius: 46px;
          background: #111218;
          padding: 8px;
          position: relative;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.12),
            0 0 0 4px #22232E,
            0 30px 80px -15px rgba(0, 0, 0, 0.35);
        }

        .realistic-phone-screen {
          width: 100%;
          height: 100%;
          border-radius: 38px;
          overflow: hidden;
          background: #09090D;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* Status bar */
        .sim-status-bar {
          height: 38px;
          padding: 10px 18px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          color: #FFF;
          background: #09090D;
          z-index: 10;
        }
        .sim-status-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 10px;
        }
        .sim-chip-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10B981;
        }
        .sim-status-icons {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sim-screen-container {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #09090D;
        }

        .screen-fade-in {
          animation: screenFade 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        @keyframes screenFade {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        .sim-screen-title-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        /* SCREEN 1: HOME */
        .sim-home-screen {
          padding: 14px 14px 8px;
          color: #FFFFFF;
        }
        .sim-home-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .sim-balance-sub {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: rgba(255, 255, 255, 0.4);
        }
        .sim-balance-main {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #FFFFFF;
          line-height: 1.15;
        }
        .sim-currency {
          font-size: 15px;
          color: #10B981;
          font-weight: 700;
        }
        .sim-balance-fiat {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }
        .sim-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1E1B4B;
          color: #818CF8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Platinum Virtual Card */
        .sim-platinum-card {
          background: linear-gradient(135deg, #181926 0%, #0F101A 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 12px 14px;
          position: relative;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          margin-bottom: 12px;
        }
        .sim-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .sim-card-brand {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
        }
        .sim-card-number {
          font-family: monospace;
          font-size: 12px;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 12px;
        }
        .sim-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .sim-card-label {
          font-size: 8px;
          color: rgba(255, 255, 255, 0.35);
        }
        .sim-card-user {
          font-size: 11px;
          font-weight: 700;
        }
        .sim-card-badge {
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 7px;
          border-radius: 5px;
          font-size: 9px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
        }

        /* Quick Actions */
        .sim-quick-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }
        .sim-btn-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .sim-btn-action.primary {
          background: #FFFFFF;
          color: #09090D;
        }
        .sim-btn-action.primary.is-tapped {
          transform: scale(0.94);
          background: #E5E7EB;
        }
        .sim-btn-action.secondary {
          background: rgba(255, 255, 255, 0.06);
          color: #FFFFFF;
        }

        .sim-direct-row {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .sim-at-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }
        .sim-direct-title {
          font-size: 11px;
          font-weight: 600;
        }
        .sim-direct-sub {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.35);
        }

        .sim-activity-preview {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
          padding: 6px 10px;
        }
        .sim-activity-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sim-tx-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }
        .sim-tx-icon.in {
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
        }
        .sim-tx-name {
          font-size: 11px;
          font-weight: 600;
        }
        .sim-tx-time {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.35);
        }
        .sim-tx-amount.in {
          font-size: 11px;
          font-weight: 700;
          color: #10B981;
        }

        /* SCREEN 2: AMOUNT */
        .sim-amount-screen {
          padding: 14px 14px;
          color: #FFFFFF;
        }
        .sim-amount-title {
          font-size: 13px;
          font-weight: 700;
        }
        .sim-badge-active {
          font-size: 10px;
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
          padding: 2px 8px;
          border-radius: 9999px;
          font-weight: 700;
        }
        .sim-amount-display-box {
          background: #14151F;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 14px 12px;
          text-align: center;
          margin-bottom: 10px;
        }
        .sim-amount-caption {
          font-size: 9px;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 4px;
        }
        .sim-amount-val {
          font-size: 32px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
        }
        .sim-amount-unit {
          font-size: 16px;
          color: #10B981;
        }
        .sim-amount-fiat {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 2px;
          margin-bottom: 8px;
        }
        .sim-presets-row {
          display: flex;
          justify-content: center;
          gap: 6px;
        }
        .sim-preset-pill {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.6);
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .sim-preset-pill.active {
          background: #FFFFFF;
          color: #09090D;
        }
        .sim-target-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 12px;
        }
        .sim-mini-keypad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-bottom: 12px;
        }
        .sim-keypad-key {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 10px;
          padding: 8px 0;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          transition: background 0.15s ease;
        }
        .sim-keypad-key.key-lit {
          background: rgba(255, 255, 255, 0.14);
          color: #FFFFFF;
        }
        .sim-btn-ready {
          background: #10B981;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
          transition: transform 0.15s ease;
        }
        .sim-btn-ready.is-tapped {
          transform: scale(0.95);
          opacity: 0.9;
        }

        /* SCREEN 3: SEARCHING & RADAR */
        .sim-search-screen {
          padding: 20px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: #FFFFFF;
        }
        .sim-radar-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #10B981;
          margin-bottom: 24px;
        }
        .sim-radar-stage {
          position: relative;
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }
        .radar-circle {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid rgba(16, 185, 129, 0.4);
          animation: radarExpand 2.4s ease-out infinite;
        }
        .radar-c1 { width: 60px; height: 60px; animation-delay: 0s; }
        .radar-c2 { width: 100px; height: 100px; animation-delay: 0.8s; }
        .radar-c3 { width: 140px; height: 140px; animation-delay: 1.6s; }
        @keyframes radarExpand {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        .radar-phone-icon {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #11121C;
          border: 2px solid #10B981;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          box-shadow: 0 0 25px rgba(16, 185, 129, 0.35);
        }
        .sim-search-status {
          margin-bottom: 20px;
        }
        .sim-status-head {
          font-size: 15px;
          font-weight: 700;
        }
        .sim-status-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          margin-top: 2px;
        }
        .sim-detected-card {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          margin-bottom: 14px;
        }
        .detected-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #059669;
          color: #FFF;
          font-weight: 700;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .detected-name {
          font-size: 12px;
          font-weight: 700;
        }
        .detected-addr {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.4);
          font-family: monospace;
        }
        .detected-badge {
          margin-left: auto;
          font-size: 9px;
          font-weight: 800;
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .sim-handshake-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
        }
        .handshake-spinner {
          width: 10px;
          height: 10px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: #10B981;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* SCREEN 4: GPAY-STYLE PAYMENT SUCCESS */
        .sim-success-screen {
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: #FFFFFF;
        }
        .gpay-circle-wrapper {
          position: relative;
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .gpay-ripple-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid #10B981;
          animation: gpayBurst 2s ease-out infinite;
        }
        .gpay-ripple-ring.ring-a { animation-delay: 0s; }
        .gpay-ripple-ring.ring-b { animation-delay: 0.6s; }
        @keyframes gpayBurst {
          0% { transform: scale(0.7); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .gpay-circle-main {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: #10B981;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
          animation: gpayBounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes gpayBounceIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .gpay-check-icon {
          animation: checkPop 0.3s ease 0.15s backwards;
        }
        @keyframes checkPop {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .sim-success-amount {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #FFFFFF;
          margin-bottom: 2px;
        }
        .sim-success-title {
          font-size: 15px;
          font-weight: 700;
          color: #10B981;
          margin-bottom: 2px;
        }
        .sim-success-recipient {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 18px;
        }
        .sim-ledger-box {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-bottom: 14px;
        }
        .ledger-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }
        .ledger-lbl {
          color: rgba(255, 255, 255, 0.4);
        }
        .ledger-val {
          color: rgba(255, 255, 255, 0.8);
          font-weight: 600;
        }
        .ledger-val.green {
          color: #10B981;
          font-weight: 700;
        }
        .ledger-val.verified {
          color: #10B981;
        }
        .sim-success-footer {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
        }

        /* SCREEN 5: ACTIVITY & HISTORY */
        .sim-history-screen {
          padding: 14px 14px;
          color: #FFFFFF;
        }
        .sim-history-title {
          font-size: 14px;
          font-weight: 700;
        }
        .sim-filter-pill {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
        }
        .sim-history-filters {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
        }
        .filter-chip {
          font-size: 10px;
          padding: 3px 10px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
        }
        .filter-chip.active {
          background: #FFFFFF;
          color: #09090D;
        }
        .sim-history-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .history-item-row {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .history-item-row.item-tapped {
          background: rgba(255, 255, 255, 0.12);
          transform: scale(0.97);
        }
        .tx-avatar-icon {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }
        .tx-avatar-icon.out { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
        .tx-avatar-icon.in { background: rgba(16, 185, 129, 0.15); color: #10B981; }
        .tx-details-col { flex: 1; }
        .tx-person-name { font-size: 11px; font-weight: 600; color: #FFFFFF; }
        .tx-time-stamp { font-size: 9px; color: rgba(255, 255, 255, 0.4); }
        .tx-val-col { font-size: 11px; font-weight: 700; }
        .tx-val-col.out { color: #FFFFFF; }
        .tx-val-col.in { color: #10B981; }

        /* SCREEN 6: PARTICULAR TRANSACTION DETAIL */
        .sim-detail-screen {
          padding: 12px 14px;
          color: #FFFFFF;
        }
        .sim-detail-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 12px;
        }
        .detail-amount-card {
          background: #14151F;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 14px 12px;
          text-align: center;
          margin-bottom: 12px;
        }
        .detail-icon-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          margin: 0 auto 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
        }
        .detail-icon-circle.out { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
        .detail-amount-text { font-size: 24px; font-weight: 800; color: #FFFFFF; line-height: 1.1; }
        .detail-fiat-text { font-size: 11px; color: rgba(255, 255, 255, 0.4); margin-top: 2px; }
        .detail-status-pill {
          display: inline-block;
          margin-top: 8px;
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
        }
        .detail-meta-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        .detail-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }
        .meta-k { color: rgba(255, 255, 255, 0.4); }
        .meta-v { color: rgba(255, 255, 255, 0.8); font-weight: 600; }
        .meta-v.green { color: #10B981; }
        .meta-v.mono { font-family: monospace; }
        .detail-scan-btn {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #10B981;
        }

        /* SCREEN 7: SETTINGS & PROFILE */
        .sim-settings-screen {
          padding: 14px 14px;
          color: #FFFFFF;
        }
        .sim-settings-title { font-size: 14px; font-weight: 700; }
        .settings-profile-card {
          background: #14151F;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .profile-big-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #1E1B4B;
          color: #818CF8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
        }
        .profile-info-col { flex: 1; }
        .profile-username { font-size: 13px; font-weight: 700; color: #FFFFFF; }
        .profile-wallet-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.06);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 2px;
          font-family: monospace;
        }
        .settings-section-lbl {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 6px;
        }
        .settings-items-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .settings-row {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .settings-icon-box {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .settings-row-text { flex: 1; }
        .settings-row-title { font-size: 11px; font-weight: 600; color: #FFFFFF; }
        .settings-row-sub { font-size: 9px; color: rgba(255, 255, 255, 0.4); }
        .settings-check { font-size: 11px; color: #10B981; font-weight: 700; }

        /* Simulated Cursor Pointer */
        .sim-tap-cursor {
          position: absolute;
          width: 22px;
          height: 22px;
          pointer-events: none;
          z-index: 50;
          transform: translate(-50%, -50%);
          transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1), top 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cursor-pointer {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          border: 2px solid #000;
          transition: transform 0.15s ease;
        }
        .tap-clicked .cursor-pointer {
          transform: scale(0.7);
          background: #10B981;
        }
        .cursor-ripple {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid #10B981;
          opacity: 0;
        }
        .tap-clicked .cursor-ripple {
          animation: cursorClickRipple 0.35s ease-out;
        }
        @keyframes cursorClickRipple {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }

        /* Bottom App Navigation Bar */
        .sim-bottom-nav {
          background: #0D0D14;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding: 6px 8px 6px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          align-items: center;
          z-index: 15;
        }
        .nav-tab-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          color: rgba(255, 255, 255, 0.3);
          font-size: 9px;
          font-weight: 500;
          transition: color 0.15s ease;
        }
        .nav-tab-item.active {
          color: #FFFFFF;
          font-weight: 700;
        }

        .sim-home-bar {
          width: 85px;
          height: 4px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 2px;
          margin: 4px auto 5px;
        }

        /* Flow Controller below phone */
        .hero-flow-controller {
          width: 100%;
          max-width: 320px;
          background: var(--canvas-bg-raised);
          border: 1px solid var(--canvas-line-bright);
          border-radius: 18px;
          padding: 10px 12px;
          margin-top: 16px;
        }
        .flow-controller-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .flow-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          animation: livePing 1.8s infinite;
        }
        .flow-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-dark);
        }
        .flow-pause-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.06);
          border: none;
          border-radius: 9999px;
          padding: 2px 7px;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-dark-muted);
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .flow-pause-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .flow-steps-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
        }
        .flow-step-tab {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          text-align: left;
        }
        .step-bar-track {
          height: 3px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .step-bar-fill {
          height: 100%;
          background: #10B981;
          border-radius: 2px;
          transition: width 0.08s linear;
        }
        .step-label {
          display: block;
          font-size: 8.5px;
          font-weight: 500;
          color: var(--text-dark-subtle);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .flow-step-tab.is-active .step-label {
          color: var(--text-dark);
          font-weight: 700;
        }

        /* Responsive Layout */
        @media (max-width: 640px) {
          .hero-section {
            padding: 100px 0 36px;
          }
          .hero-headline {
            font-size: clamp(40px, 12vw, 56px) !important;
          }
          .hero-header-block {
            margin-bottom: 32px;
          }
          .hero-action-buttons {
            width: 100%;
            flex-direction: column;
          }
          .hero-btn-primary, .hero-btn-secondary {
            width: 100%;
            justify-content: center;
          }
          .hero-metrics-bar {
            gap: 20px;
          }
          .metric-value {
            font-size: 24px;
          }
          .hero-phone-device {
            width: 270px !important;
            height: 555px !important;
          }
          .hero-phone-glow {
            width: 300px;
            height: 300px;
          }
        }
      `}</style>
    </section>
  );
};
