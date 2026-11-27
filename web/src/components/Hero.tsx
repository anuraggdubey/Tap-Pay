import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  Wifi,
  Battery,
  Play,
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

  const activeNavTab: 'home' | 'pay' | 'history' | 'settings' =
    currentStep === 'home'
      ? 'home'
      : currentStep === 'amount' || currentStep === 'nfc_search' || currentStep === 'success'
      ? 'pay'
      : currentStep === 'history' || currentStep === 'tx_detail'
      ? 'history'
      : 'settings';

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
      setTypedAmount('0');
      setTimeout(() => setTypedAmount('1'), 120);
      setTimeout(() => setTypedAmount('12'), 280);
      setTimeout(() => setTypedAmount('12.'), 440);
      setTimeout(() => setTypedAmount('12.5'), 600);
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
      <div className="phantom-container hero-grid">
        <div className="hero-copy">
          <p className="hero-eyebrow">Tap&nbsp;to&nbsp;Pay · Android · Non-custodial</p>

          <h1 className="hero-headline">
            Tap phones.
            <br />
            <em>Move money.</em>
          </h1>

          <p className="hero-description">
            Hold two phones together and the payment settles on-chain in under a second.
            No QR codes. No wallet addresses.
          </p>

          <div className="hero-actions">
            <Link to="/download" className="hero-btn hero-btn--primary">
              <span>Get the app</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/#watch-demo" className="hero-btn hero-btn--ghost">
              <Play size={13} />
              <span>Watch the film</span>
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div
            className="realistic-phone-chassis hero-phone-device"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="realistic-phone-screen tp-mock-root">
              <div className="realistic-phone-camera" />

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

              <div className="sim-screen-container">
                {currentStep === 'home' && (
                  <TapPayMockHome compact username="@anurag" avatarLetter="A" sendActive={simulatedTapActive} />
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
                {currentStep === 'history' && (
                  <TapPayMockHistory compact highlightFirstRow={simulatedTapActive} />
                )}
                {currentStep === 'tx_detail' && <TapPayMockTxDetail compact />}
                {currentStep === 'settings' && <TapPayMockSettings compact />}

                {tapCursorPos.visible && (
                  <div
                    className={`sim-tap-cursor ${simulatedTapActive ? 'tap-clicked' : ''}`}
                    style={{ left: `${tapCursorPos.x}%`, top: `${tapCursorPos.y}%` }}
                  >
                    <div className="cursor-pointer" />
                    <div className="cursor-ripple" />
                  </div>
                )}
              </div>

              <TapPayMockTabBar active={activeNavTab} />
              <div className="sim-home-bar" />
            </div>
          </div>

          <div className="hero-steps" role="tablist" aria-label="App walkthrough">
            {[
              { id: 'home' as FlowStep, label: 'Home' },
              { id: 'amount' as FlowStep, label: 'Tap' },
              { id: 'success' as FlowStep, label: 'Receipt' },
              { id: 'history' as FlowStep, label: 'History' },
              { id: 'settings' as FlowStep, label: 'Profile' },
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
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelectStep(s.id)}
                  className={`hero-step ${isActive ? 'is-active' : ''}`}
                >
                  <span className="hero-step-track">
                    <span className="hero-step-fill" style={{ width: isActive ? `${stepProgress}%` : '0%' }} />
                  </span>
                  <span className="hero-step-label">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 120px 0 72px;
          color: var(--text-dark);
        }
        .hero-grid {
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          align-items: center;
          gap: clamp(32px, 6vw, 96px);
        }
        .hero-eyebrow {
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-dark-subtle);
          margin-bottom: 32px;
        }
        .hero-headline {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: clamp(56px, 8.4vw, 132px);
          line-height: 0.95;
          letter-spacing: -0.04em;
          margin-bottom: 32px;
        }
        .hero-headline em { font-style: italic; color: var(--text-dark-muted); }
        .hero-description {
          font-size: 18px;
          line-height: 1.6;
          color: var(--text-dark-muted);
          max-width: 400px;
          margin-bottom: 40px;
        }
        .hero-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .hero-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 48px;
          padding: 0 22px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .hero-btn--primary { background: var(--text-dark); color: #0A0A0D; }
        .hero-btn--primary:hover { background: #fff; }
        .hero-btn--ghost { color: var(--text-dark-muted); border: 1px solid var(--canvas-line-bright); }
        .hero-btn--ghost:hover { color: var(--text-dark); border-color: var(--text-dark-subtle); }

        .hero-visual { display: flex; flex-direction: column; align-items: center; gap: 28px; }
        .hero-phone-device {
          width: 280px;
          height: 580px;
          border-radius: 44px;
          background: #0E0E12;
          padding: 8px;
          position: relative;
          box-shadow: 0 0 0 1px var(--canvas-line-bright), 0 40px 80px -30px rgba(0, 0, 0, 0.8);
        }
        .realistic-phone-screen {
          width: 100%;
          height: 100%;
          border-radius: 36px;
          overflow: hidden;
          background: #09090D;
          display: flex;
          flex-direction: column;
          position: relative;
        }
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
        .sim-status-chip { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 9999px; font-size: 10px; }
        .sim-chip-dot { width: 5px; height: 5px; border-radius: 50%; background: #10B981; }
        .sim-status-icons { display: flex; align-items: center; gap: 4px; }
        .sim-screen-container { flex: 1; position: relative; overflow: hidden; background: #09090D; }

        .hero-steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; width: 280px; }
        .hero-step { padding: 0; text-align: left; }
        .hero-step-track { display: block; height: 2px; background: var(--canvas-line); overflow: hidden; margin-bottom: 8px; }
        .hero-step-fill { display: block; height: 100%; background: var(--text-dark); }
        .hero-step-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.04em; color: var(--text-dark-subtle); transition: color 0.2s ease; }
        .hero-step.is-active .hero-step-label, .hero-step:hover .hero-step-label { color: var(--text-dark); }

        /* ---- phone screen internals (shared with the mock UI) ---- */
        /* ========================================================= */
        /* ALL PHONE SCREEN STYLES (unchanged)                        */
        /* ========================================================= */

        .sim-home-screen { padding: 14px 14px 8px; color: #FFFFFF; }
        .sim-home-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .sim-balance-sub { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; color: rgba(255, 255, 255, 0.4); }
        .sim-balance-main { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: #FFFFFF; line-height: 1.15; }
        .sim-currency { font-size: 15px; color: #10B981; font-weight: 700; }
        .sim-balance-fiat { font-size: 11px; color: rgba(255, 255, 255, 0.4); }
        .sim-avatar { width: 32px; height: 32px; border-radius: 50%; background: #1E1B4B; color: #818CF8; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; border: 1px solid rgba(255, 255, 255, 0.1); }

        .sim-platinum-card { background: linear-gradient(135deg, #181926 0%, #0F101A 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 12px 14px; position: relative; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); margin-bottom: 12px; }
        .sim-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .sim-card-brand { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; }
        .sim-card-number { font-family: monospace; font-size: 12px; letter-spacing: 0.08em; color: rgba(255, 255, 255, 0.8); margin-bottom: 12px; }
        .sim-card-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
        .sim-card-label { font-size: 8px; color: rgba(255, 255, 255, 0.35); }
        .sim-card-user { font-size: 11px; font-weight: 700; }
        .sim-card-badge { background: rgba(255, 255, 255, 0.08); padding: 2px 7px; border-radius: 5px; font-size: 9px; font-weight: 700; color: rgba(255, 255, 255, 0.6); }

        .sim-quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
        .sim-btn-action { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; transition: transform 0.15s ease, background 0.15s ease; }
        .sim-btn-action.primary { background: #FFFFFF; color: #09090D; }
        .sim-btn-action.primary.is-tapped { transform: scale(0.94); background: #E5E7EB; }
        .sim-btn-action.secondary { background: rgba(255, 255, 255, 0.06); color: #FFFFFF; }

        .sim-direct-row { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 8px 12px; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .sim-at-icon { width: 22px; height: 22px; border-radius: 50%; background: rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
        .sim-direct-title { font-size: 11px; font-weight: 600; }
        .sim-direct-sub { font-size: 9px; color: rgba(255, 255, 255, 0.35); }

        .sim-activity-preview { background: rgba(255, 255, 255, 0.02); border-radius: 10px; padding: 6px 10px; }
        .sim-activity-row { display: flex; align-items: center; gap: 8px; }
        .sim-tx-icon { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
        .sim-tx-icon.in { background: rgba(16, 185, 129, 0.15); color: #10B981; }
        .sim-tx-name { font-size: 11px; font-weight: 600; }
        .sim-tx-time { font-size: 9px; color: rgba(255, 255, 255, 0.35); }
        .sim-tx-amount.in { font-size: 11px; font-weight: 700; color: #10B981; }

        .sim-amount-screen { padding: 14px 14px; color: #FFFFFF; }
        .sim-amount-title { font-size: 13px; font-weight: 700; }
        .sim-badge-active { font-size: 10px; background: rgba(16, 185, 129, 0.15); color: #10B981; padding: 2px 8px; border-radius: 9999px; font-weight: 700; }
        .sim-amount-display-box { background: #14151F; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 14px 12px; text-align: center; margin-bottom: 10px; }
        .sim-amount-caption { font-size: 9px; letter-spacing: 0.08em; color: rgba(255, 255, 255, 0.4); margin-bottom: 4px; }
        .sim-amount-val { font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.1; }
        .sim-amount-unit { font-size: 16px; color: #10B981; }
        .sim-amount-fiat { font-size: 11px; color: rgba(255, 255, 255, 0.4); margin-top: 2px; margin-bottom: 8px; }
        .sim-presets-row { display: flex; justify-content: center; gap: 6px; }
        .sim-preset-pill { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.6); font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 6px; }
        .sim-preset-pill.active { background: #FFFFFF; color: #09090D; }
        .sim-target-hint { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 10px; color: rgba(255, 255, 255, 0.6); margin-bottom: 12px; }
        .sim-mini-keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
        .sim-keypad-key { background: rgba(255, 255, 255, 0.04); border-radius: 10px; padding: 8px 0; text-align: center; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); transition: background 0.15s ease; }
        .sim-keypad-key.key-lit { background: rgba(255, 255, 255, 0.14); color: #FFFFFF; }
        .sim-btn-ready { background: #10B981; color: #FFFFFF; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; border-radius: 12px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: transform 0.15s ease; }
        .sim-btn-ready.is-tapped { transform: scale(0.95); opacity: 0.9; }

        .sim-search-screen { padding: 20px 14px; display: flex; flex-direction: column; align-items: center; text-align: center; color: #FFFFFF; }
        .sim-radar-badge { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: #10B981; margin-bottom: 24px; }
        .sim-radar-stage { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
        .radar-circle { position: absolute; border-radius: 50%; border: 1.5px solid rgba(16, 185, 129, 0.4); animation: radarExpand 2.4s ease-out infinite; }
        .radar-c1 { width: 60px; height: 60px; animation-delay: 0s; }
        .radar-c2 { width: 100px; height: 100px; animation-delay: 0.8s; }
        .radar-c3 { width: 140px; height: 140px; animation-delay: 1.6s; }
        @keyframes radarExpand { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }
        .radar-phone-icon { width: 58px; height: 58px; border-radius: 50%; background: #11121C; border: 2px solid #10B981; display: flex; align-items: center; justify-content: center; z-index: 2; box-shadow: 0 0 25px rgba(16, 185, 129, 0.35); }
        .sim-search-status { margin-bottom: 20px; }
        .sim-status-head { font-size: 15px; font-weight: 700; }
        .sim-status-desc { font-size: 11px; color: rgba(255, 255, 255, 0.45); margin-top: 2px; }
        .sim-detected-card { width: 100%; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 8px 12px; display: flex; align-items: center; gap: 10px; text-align: left; margin-bottom: 14px; }
        .detected-avatar { width: 28px; height: 28px; border-radius: 50%; background: #059669; color: #FFF; font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; }
        .detected-name { font-size: 12px; font-weight: 700; }
        .detected-addr { font-size: 9px; color: rgba(255, 255, 255, 0.4); font-family: monospace; }
        .detected-badge { margin-left: auto; font-size: 9px; font-weight: 800; background: rgba(16, 185, 129, 0.15); color: #10B981; padding: 2px 6px; border-radius: 4px; }
        .sim-handshake-status { display: flex; align-items: center; gap: 8px; font-size: 10px; color: rgba(255, 255, 255, 0.5); }
        .handshake-spinner { width: 10px; height: 10px; border: 2px solid rgba(255, 255, 255, 0.2); border-top-color: #10B981; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .sim-success-screen { padding: 24px 16px; display: flex; flex-direction: column; align-items: center; text-align: center; color: #FFFFFF; }
        .gpay-circle-wrapper { position: relative; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .gpay-ripple-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #10B981; animation: gpayBurst 2s ease-out infinite; }
        .gpay-ripple-ring.ring-a { animation-delay: 0s; }
        .gpay-ripple-ring.ring-b { animation-delay: 0.6s; }
        @keyframes gpayBurst { 0% { transform: scale(0.7); opacity: 0.8; } 100% { transform: scale(1.4); opacity: 0; } }
        .gpay-circle-main { width: 70px; height: 70px; border-radius: 50%; background: #10B981; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(16, 185, 129, 0.5); animation: gpayBounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes gpayBounceIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .gpay-check-icon { animation: checkPop 0.3s ease 0.15s backwards; }
        @keyframes checkPop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .sim-success-amount { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: #FFFFFF; margin-bottom: 2px; }
        .sim-success-title { font-size: 15px; font-weight: 700; color: #10B981; margin-bottom: 2px; }
        .sim-success-recipient { font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 18px; }
        .sim-ledger-box { width: 100%; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 9px 12px; display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .ledger-row { display: flex; justify-content: space-between; font-size: 10px; }
        .ledger-lbl { color: rgba(255, 255, 255, 0.4); }
        .ledger-val { color: rgba(255, 255, 255, 0.8); font-weight: 600; }
        .ledger-val.green { color: #10B981; font-weight: 700; }
        .ledger-val.verified { color: #10B981; }
        .sim-success-footer { font-size: 10px; color: rgba(255, 255, 255, 0.35); }

        .sim-history-screen { padding: 14px 14px; color: #FFFFFF; }
        .sim-history-title { font-size: 14px; font-weight: 700; }
        .sim-filter-pill { font-size: 10px; color: rgba(255, 255, 255, 0.4); }
        .sim-history-filters { display: flex; gap: 6px; margin-bottom: 12px; }
        .filter-chip { font-size: 10px; padding: 3px 10px; border-radius: 9999px; background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.6); font-weight: 600; }
        .filter-chip.active { background: #FFFFFF; color: #09090D; }
        .sim-history-list { display: flex; flex-direction: column; gap: 6px; }
        .history-item-row { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 8px 10px; display: flex; align-items: center; gap: 8px; transition: background 0.15s ease, transform 0.15s ease; }
        .history-item-row.item-tapped { background: rgba(255, 255, 255, 0.12); transform: scale(0.97); }
        .tx-avatar-icon { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
        .tx-avatar-icon.out { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
        .tx-avatar-icon.in { background: rgba(16, 185, 129, 0.15); color: #10B981; }
        .tx-details-col { flex: 1; }
        .tx-person-name { font-size: 11px; font-weight: 600; color: #FFFFFF; }
        .tx-time-stamp { font-size: 9px; color: rgba(255, 255, 255, 0.4); }
        .tx-val-col { font-size: 11px; font-weight: 700; }
        .tx-val-col.out { color: #FFFFFF; }
        .tx-val-col.in { color: #10B981; }

        .sim-detail-screen { padding: 12px 14px; color: #FFFFFF; }
        .sim-detail-header { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, 0.8); margin-bottom: 12px; }
        .detail-amount-card { background: #14151F; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 14px 12px; text-align: center; margin-bottom: 12px; }
        .detail-icon-circle { width: 32px; height: 32px; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
        .detail-icon-circle.out { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
        .detail-amount-text { font-size: 24px; font-weight: 800; color: #FFFFFF; line-height: 1.1; }
        .detail-fiat-text { font-size: 11px; color: rgba(255, 255, 255, 0.4); margin-top: 2px; }
        .detail-status-pill { display: inline-block; margin-top: 8px; background: rgba(16, 185, 129, 0.15); color: #10B981; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; }
        .detail-meta-box { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .detail-meta-row { display: flex; justify-content: space-between; font-size: 10px; }
        .meta-k { color: rgba(255, 255, 255, 0.4); }
        .meta-v { color: rgba(255, 255, 255, 0.8); font-weight: 600; }
        .meta-v.green { color: #10B981; }
        .meta-v.mono { font-family: monospace; }
        .detail-scan-btn { background: rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 9px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; font-weight: 600; color: #10B981; }

        .sim-settings-screen { padding: 14px 14px; color: #FFFFFF; }
        .sim-settings-title { font-size: 14px; font-weight: 700; }
        .settings-profile-card { background: #14151F; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 12px; display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .profile-big-avatar { width: 38px; height: 38px; border-radius: 50%; background: #1E1B4B; color: #818CF8; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; }
        .profile-info-col { flex: 1; }
        .profile-username { font-size: 13px; font-weight: 700; color: #FFFFFF; }
        .profile-wallet-pill { display: inline-flex; align-items: center; gap: 4px; background: rgba(255, 255, 255, 0.06); padding: 2px 6px; border-radius: 4px; font-size: 9px; color: rgba(255, 255, 255, 0.6); margin-top: 2px; font-family: monospace; }
        .settings-section-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; color: rgba(255, 255, 255, 0.4); margin-bottom: 6px; }
        .settings-items-list { display: flex; flex-direction: column; gap: 6px; }
        .settings-row { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 8px 10px; display: flex; align-items: center; gap: 8px; }
        .settings-icon-box { width: 24px; height: 24px; border-radius: 6px; background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center; }
        .settings-row-text { flex: 1; }
        .settings-row-title { font-size: 11px; font-weight: 600; color: #FFFFFF; }
        .settings-row-sub { font-size: 9px; color: rgba(255, 255, 255, 0.4); }
        .settings-check { font-size: 11px; color: #10B981; font-weight: 700; }

        /* Cursor */
        .sim-tap-cursor { position: absolute; width: 22px; height: 22px; pointer-events: none; z-index: 50; transform: translate(-50%, -50%); transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1), top 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .cursor-pointer { width: 14px; height: 14px; border-radius: 50%; background: rgba(255, 255, 255, 0.95); box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); border: 2px solid #000; transition: transform 0.15s ease; }
        .tap-clicked .cursor-pointer { transform: scale(0.7); background: #10B981; }
        .cursor-ripple { position: absolute; inset: -6px; border-radius: 50%; border: 2px solid #10B981; opacity: 0; }
        .tap-clicked .cursor-ripple { animation: cursorClickRipple 0.35s ease-out; }
        @keyframes cursorClickRipple { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }

        /* Bottom Nav */
        .sim-bottom-nav { background: #0D0D14; border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 6px 8px 6px; display: grid; grid-template-columns: repeat(4, 1fr); align-items: center; z-index: 15; }
        .nav-tab-item { display: flex; flex-direction: column; align-items: center; gap: 2px; color: rgba(255, 255, 255, 0.3); font-size: 9px; font-weight: 500; transition: color 0.15s ease; }
        .nav-tab-item.active { color: #FFFFFF; font-weight: 700; }
        .sim-home-bar { width: 85px; height: 4px; background: rgba(255, 255, 255, 0.25); border-radius: 2px; margin: 4px auto 5px; }


        @media (max-width: 860px) {
          .hero-section { padding: 104px 0 56px; min-height: auto; }
          .hero-grid { grid-template-columns: 1fr; gap: 56px; }
          .hero-headline { font-size: clamp(52px, 15vw, 84px); }
          .hero-description { font-size: 16px; }
        }
        @media (max-width: 480px) {
          .hero-actions { flex-direction: column; align-items: stretch; }
          .hero-btn { justify-content: center; }
          .hero-phone-device { width: 252px; height: 524px; }
          .hero-steps { width: 252px; }
        }
      `}</style>
    </section>
  );
};
