import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Radio,
  ArrowUpRight,
  Wifi,
  Battery,
  Check,
  Zap,
  ShieldCheck,
  Play,
  Pause,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Copy,
  Lock,
  Home as HomeIcon,
  Clock,
  Sliders,
  Share2,
} from 'lucide-react';

interface HeroProps {
  onOpenDownload: () => void;
}

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

export const Hero: React.FC<HeroProps> = ({ onOpenDownload }) => {
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
        setTapCursorPos({ x: 32, y: 54, visible: true });
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
    <section
      id="hero"
      style={{
        background: 'var(--canvas-bg)',
        color: 'var(--text-dark)',
        paddingTop: '135px',
        paddingBottom: '85px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Refined Ambient Lighting */}
      <div className="hero-ambient-sheen" />

      {/* Decorative Contactless Waves Behind Phone */}
      <div className="hero-nfc-waves-bg">
        <div className="nfc-pulse-ring ring-1" />
        <div className="nfc-pulse-ring ring-2" />
        <div className="nfc-pulse-ring ring-3" />
      </div>

      <div className="phantom-container" style={{ width: '100%', position: 'relative', zIndex: 2 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: '50px',
            alignItems: 'center',
          }}
          className="hero-split-grid"
        >
          {/* ============================================================ */}
          {/* LEFT SIDE: CLEAN, EDITORIAL, NON-SLOP TYPOGRAPHY            */}
          {/* ============================================================ */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }} className="hero-text-container">
            {/* Clean, Refined Headline — No bulbous letters, no fake gradient masks */}
            <h1 className="hero-headline">
              <span className="hero-headline-line1">Tap to Pay.</span>
              <span className="hero-headline-line2">Crypto, Simplified.</span>
            </h1>

            {/* Description */}
            <p className="hero-description">
              The first non-custodial Android wallet for instant phone-to-phone contactless NFC tap payments.
              Hold devices within <strong>4cm</strong> and execute an atomic Monad transfer.
              No QR codes. No seed phrase stress.
            </p>

            {/* Action Buttons */}
            <div className="hero-action-buttons">
              <button
                onClick={onOpenDownload}
                className="hero-btn-primary"
              >
                <Smartphone size={18} />
                <span>Download Android APK</span>
                <span className="btn-version-badge">v1.0 · Monad</span>
              </button>

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

            {/* Quick Metrics Bar */}
            <div className="hero-metrics-bar">
              <div className="metric-item">
                <div className="metric-value">~0.8s</div>
                <div className="metric-label">Monad Finality</div>
              </div>

              <div className="metric-divider" />

              <div className="metric-item">
                <div className="metric-value">4cm</div>
                <div className="metric-label">NFC Induction Range</div>
              </div>

              <div className="metric-divider" />

              <div className="metric-item">
                <div className="metric-value">100%</div>
                <div className="metric-label">Hardware Keystore</div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT SIDE: CONTINUOUS FULL-JOURNEY PHONE SIMULATOR          */}
          {/* ============================================================ */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
            className="hero-phone-column"
          >
            {/* Floating Live Badge 1 (Top Left) */}
            <div className="hero-floating-card card-float-1">
              <div className="float-card-icon green">
                <Zap size={14} />
              </div>
              <div>
                <div className="float-card-title">Atomic NFC Beam</div>
                <div className="float-card-sub">0.82s sub-second ledger</div>
              </div>
            </div>

            {/* Floating Live Badge 2 (Bottom Right) */}
            <div className="hero-floating-card card-float-2">
              <div className="float-card-icon blue">
                <ShieldCheck size={14} />
              </div>
              <div>
                <div className="float-card-title">Hardware Keystore</div>
                <div className="float-card-sub">StrongBox Enclave</div>
              </div>
            </div>

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
              <div className="realistic-phone-screen">
                {/* Ambient Glass Sheen Reflection */}
                <div className="glass-sheen-sweep" />

                {/* Camera Hole Punch */}
                <div className="realistic-phone-camera" />

                {/* Status Bar */}
                <div className="sim-status-bar">
                  <span className="sim-status-time">9:41</span>
                  <div className="sim-status-chip">
                    <span className="sim-chip-dot" />
                    <span>Monad 10143</span>
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
                    <div className="screen-fade-in sim-home-screen">
                      <div className="sim-home-header">
                        <div>
                          <div className="sim-balance-sub">TOTAL BALANCE</div>
                          <div className="sim-balance-main">
                            {balance.toFixed(3)} <span className="sim-currency">MON</span>
                          </div>
                          <div className="sim-balance-fiat">≈ ${(balance * 2.86).toFixed(2)} USD</div>
                        </div>
                        <div className="sim-avatar">A</div>
                      </div>

                      {/* Monad Platinum Virtual Card */}
                      <div className="sim-platinum-card">
                        <div className="sim-card-top">
                          <div className="sim-card-brand">
                            <Radio size={14} color="#FFF" />
                            <span>TapPay</span>
                          </div>
                          <div className="sim-nfc-symbol">
                            <Radio size={16} color="#FFF" />
                          </div>
                        </div>
                        <div className="sim-card-number">0X1A •••• •••• 1A4E</div>
                        <div className="sim-card-bottom">
                          <div>
                            <div className="sim-card-label">CARDHOLDER</div>
                            <div className="sim-card-user">@anurag</div>
                          </div>
                          <div className="sim-card-badge">MONAD · NFC</div>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="sim-quick-actions">
                        <div className={`sim-btn-action primary ${simulatedTapActive ? 'is-tapped' : ''}`}>
                          <Radio size={15} />
                          <span>Send Tap (NFC)</span>
                        </div>
                        <div className="sim-btn-action secondary">
                          <span>Receive Tap</span>
                        </div>
                      </div>

                      {/* Direct Transfer Bar */}
                      <div className="sim-direct-row">
                        <div className="sim-at-icon">@</div>
                        <div>
                          <div className="sim-direct-title">Direct Transfer</div>
                          <div className="sim-direct-sub">Pay via @username or address</div>
                        </div>
                        <ChevronRight size={14} opacity={0.4} style={{ marginLeft: 'auto' }} />
                      </div>

                      {/* Recent Mini Activity */}
                      <div className="sim-activity-preview">
                        <div className="sim-activity-row">
                          <div className="sim-tx-icon in">↘</div>
                          <div style={{ flex: 1 }}>
                            <div className="sim-tx-name">From @aditya</div>
                            <div className="sim-tx-time">NFC Tap · 1h ago</div>
                          </div>
                          <div className="sim-tx-amount in">+25.0 MON</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 2: ENTER AMOUNT */}
                  {currentStep === 'amount' && (
                    <div className="screen-fade-in sim-amount-screen">
                      <div className="sim-screen-title-bar">
                        <div className="sim-amount-title">Send via NFC Touch</div>
                        <div className="sim-badge-active">NFC Ready</div>
                      </div>

                      {/* Amount Display */}
                      <div className="sim-amount-display-box">
                        <div className="sim-amount-caption">AMOUNT TO SEND</div>
                        <div className="sim-amount-val">
                          {typedAmount} <span className="sim-amount-unit">MON</span>
                        </div>
                        <div className="sim-amount-fiat">
                          ≈ ${(parseFloat(typedAmount || '0') * 2.86).toFixed(2)} USD
                        </div>

                        {/* Quick Presets */}
                        <div className="sim-presets-row">
                          {['1.0', '5.0', '12.5', '25.0'].map((val) => (
                            <span
                              key={val}
                              className={`sim-preset-pill ${typedAmount === val ? 'active' : ''}`}
                            >
                              {val}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Target Info */}
                      <div className="sim-target-hint">
                        <Radio size={13} color="#10B981" />
                        <span>Hold phones within 4cm to transmit</span>
                      </div>

                      {/* Mini Keypad */}
                      <div className="sim-mini-keypad">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
                          <div
                            key={key}
                            className={`sim-keypad-key ${(['1', '2', '5', '.'].includes(key) && currentStep === 'amount') ? 'key-lit' : ''}`}
                          >
                            {key}
                          </div>
                        ))}
                      </div>

                      {/* Ready to Tap Button */}
                      <div className={`sim-btn-ready ${simulatedTapActive ? 'is-tapped' : ''}`}>
                        <Radio size={16} />
                        <span>Tap to Pay with NFC</span>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 3: SEARCHING & RADAR */}
                  {currentStep === 'nfc_search' && (
                    <div className="screen-fade-in sim-search-screen">
                      <div className="sim-radar-badge">CONTACTLESS BEAM</div>

                      {/* Concentric Radar Ripples */}
                      <div className="sim-radar-stage">
                        <div className="radar-circle radar-c1" />
                        <div className="radar-circle radar-c2" />
                        <div className="radar-circle radar-c3" />
                        <div className="radar-phone-icon">
                          <Radio size={34} color="#FFFFFF" className="pulse-icon" />
                        </div>
                      </div>

                      <div className="sim-search-status">
                        <div className="sim-status-head">Hold Phones Together</div>
                        <div className="sim-status-desc">Proximity distance: &lt; 4cm</div>
                      </div>

                      {/* Detected Device Card */}
                      <div className="sim-detected-card">
                        <div className="detected-avatar">M</div>
                        <div>
                          <div className="detected-name">@misbah (Receiver)</div>
                          <div className="detected-addr">0x8F21...4E29</div>
                        </div>
                        <div className="detected-badge">LINKED</div>
                      </div>

                      <div className="sim-handshake-status">
                        <span className="handshake-spinner" />
                        <span>Executing atomic APDU on Monad...</span>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 4: GPAY-STYLE PAYMENT SUCCESS */}
                  {currentStep === 'success' && (
                    <div className="screen-fade-in sim-success-screen">
                      {/* Expanding Emerald Circle Checkmark */}
                      <div className="gpay-circle-wrapper">
                        <div className="gpay-ripple-ring ring-a" />
                        <div className="gpay-ripple-ring ring-b" />
                        <div className="gpay-circle-main">
                          <Check size={40} color="#FFFFFF" strokeWidth={3} className="gpay-check-icon" />
                        </div>
                      </div>

                      <div className="sim-success-amount">12.5 MON</div>
                      <div className="sim-success-title">Payment Confirmed!</div>
                      <div className="sim-success-recipient">Sent to @misbah</div>

                      {/* Ledger Verification Pill */}
                      <div className="sim-ledger-box">
                        <div className="ledger-row">
                          <span className="ledger-lbl">Monad Finality</span>
                          <span className="ledger-val green">0.82s Atomic</span>
                        </div>
                        <div className="ledger-row">
                          <span className="ledger-lbl">Gas Fee</span>
                          <span className="ledger-val">~0.0004 MON</span>
                        </div>
                        <div className="ledger-row">
                          <span className="ledger-lbl">Tx Status</span>
                          <span className="ledger-val verified">✓ Confirmed 10143</span>
                        </div>
                      </div>

                      <div className="sim-success-footer">
                        <span>TapPay Monad Instant Ledger</span>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 5: ACTIVITY & HISTORY LIST */}
                  {currentStep === 'history' && (
                    <div className="screen-fade-in sim-history-screen">
                      <div className="sim-screen-title-bar">
                        <div className="sim-history-title">Activity</div>
                        <div className="sim-filter-pill">Monad Testnet</div>
                      </div>

                      {/* Filter Chips */}
                      <div className="sim-history-filters">
                        <span className="filter-chip active">All</span>
                        <span className="filter-chip">Sent</span>
                        <span className="filter-chip">Received</span>
                      </div>

                      {/* Transactions List */}
                      <div className="sim-history-list">
                        <div className={`history-item-row ${simulatedTapActive ? 'item-tapped' : ''}`}>
                          <div className="tx-avatar-icon out">↗</div>
                          <div className="tx-details-col">
                            <div className="tx-person-name">Paid @misbah</div>
                            <div className="tx-time-stamp">NFC Tap · Just now</div>
                          </div>
                          <div className="tx-val-col out">-12.5 MON</div>
                        </div>

                        <div className="history-item-row">
                          <div className="tx-avatar-icon in">↘</div>
                          <div className="tx-details-col">
                            <div className="tx-person-name">From @aditya</div>
                            <div className="tx-time-stamp">Direct Send · 1h ago</div>
                          </div>
                          <div className="tx-val-col in">+25.0 MON</div>
                        </div>

                        <div className="history-item-row">
                          <div className="tx-avatar-icon out">↗</div>
                          <div className="tx-details-col">
                            <div className="tx-person-name">NFC Coffee Bar</div>
                            <div className="tx-time-stamp">POS Terminal · 4h ago</div>
                          </div>
                          <div className="tx-val-col out">-1.2 MON</div>
                        </div>

                        <div className="history-item-row">
                          <div className="tx-avatar-icon in">↘</div>
                          <div className="tx-details-col">
                            <div className="tx-person-name">Faucet Drop</div>
                            <div className="tx-time-stamp">Devnet Faucet · 1d ago</div>
                          </div>
                          <div className="tx-val-col in">+10.0 MON</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SCREEN 6: PARTICULAR TRANSACTION DETAIL PAGE */}
                  {currentStep === 'tx_detail' && (
                    <div className="screen-fade-in sim-detail-screen">
                      <div className="sim-detail-header">
                        <ArrowLeft size={16} />
                        <span>Transaction Details</span>
                        <Share2 size={15} style={{ marginLeft: 'auto' }} />
                      </div>

                      {/* Main Amount Callout */}
                      <div className="detail-amount-card">
                        <div className="detail-icon-circle out">↗</div>
                        <div className="detail-amount-text">-12.5 MON</div>
                        <div className="detail-fiat-text">≈ $35.75 USD</div>
                        <div className="detail-status-pill">✓ Completed on Monad</div>
                      </div>

                      {/* Metadata Table */}
                      <div className="detail-meta-box">
                        <div className="detail-meta-row">
                          <span className="meta-k">To</span>
                          <span className="meta-v">@misbah (0x8F21...4E29)</span>
                        </div>
                        <div className="detail-meta-row">
                          <span className="meta-k">Payment Type</span>
                          <span className="meta-v">NFC Tap-to-Pay</span>
                        </div>
                        <div className="detail-meta-row">
                          <span className="meta-k">Settlement Speed</span>
                          <span className="meta-v green">0.82 seconds</span>
                        </div>
                        <div className="detail-meta-row">
                          <span className="meta-k">Network Fee</span>
                          <span className="meta-v">0.000412 MON</span>
                        </div>
                        <div className="detail-meta-row">
                          <span className="meta-k">TxHash</span>
                          <span className="meta-v mono">0x5B17...6838</span>
                        </div>
                      </div>

                      {/* MonadScan Button */}
                      <div className="detail-scan-btn">
                        <span>View on MonadScan</span>
                        <ExternalLink size={12} />
                      </div>
                    </div>
                  )}

                  {/* SCREEN 7: SETTINGS & PROFILE PAGE */}
                  {currentStep === 'settings' && (
                    <div className="screen-fade-in sim-settings-screen">
                      <div className="sim-screen-title-bar">
                        <div className="sim-settings-title">Profile &amp; Settings</div>
                        <div className="sim-badge-active">Online</div>
                      </div>

                      {/* Profile Card */}
                      <div className="settings-profile-card">
                        <div className="profile-big-avatar">A</div>
                        <div className="profile-info-col">
                          <div className="profile-username">@anurag</div>
                          <div className="profile-wallet-pill">
                            <span>0x1A4E •••• 1A4E</span>
                            <Copy size={11} />
                          </div>
                        </div>
                      </div>

                      {/* Security Status Box */}
                      <div className="settings-section-lbl">HARDWARE SECURITY</div>
                      <div className="settings-items-list">
                        <div className="settings-row">
                          <div className="settings-icon-box"><Lock size={13} color="#10B981" /></div>
                          <div className="settings-row-text">
                            <div className="settings-row-title">Android Keystore</div>
                            <div className="settings-row-sub">StrongBox Enclave Active</div>
                          </div>
                          <span className="settings-check">✓</span>
                        </div>

                        <div className="settings-row">
                          <div className="settings-icon-box"><Radio size={13} color="#10B981" /></div>
                          <div className="settings-row-text">
                            <div className="settings-row-title">NFC Emulation (HCE)</div>
                            <div className="settings-row-sub">ISO-DEP Protocol Ready</div>
                          </div>
                          <span className="settings-check">✓</span>
                        </div>

                        <div className="settings-row">
                          <div className="settings-icon-box"><ShieldCheck size={13} color="#10B981" /></div>
                          <div className="settings-row-text">
                            <div className="settings-row-title">Non-Custodial Keys</div>
                            <div className="settings-row-sub">Local Device Encryption</div>
                          </div>
                          <span className="settings-check">✓</span>
                        </div>
                      </div>
                    </div>
                  )}

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

                {/* Bottom App Navigation Bar */}
                <div className="sim-bottom-nav">
                  <div className={`nav-tab-item ${activeNavTab === 'home' ? 'active' : ''}`}>
                    <HomeIcon size={17} />
                    <span>Home</span>
                  </div>
                  <div className={`nav-tab-item ${activeNavTab === 'pay' ? 'active' : ''}`}>
                    <Radio size={17} />
                    <span>Pay</span>
                  </div>
                  <div className={`nav-tab-item ${activeNavTab === 'history' ? 'active' : ''}`}>
                    <Clock size={17} />
                    <span>History</span>
                  </div>
                  <div className={`nav-tab-item ${activeNavTab === 'settings' ? 'active' : ''}`}>
                    <Sliders size={17} />
                    <span>Settings</span>
                  </div>
                </div>

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
        </div>
      </div>

      <style>{`
        /* ========================================================= */
        /* HERO ADVANCED STYLING & HIGH-FASHION TYPOGRAPHY           */
        /* ========================================================= */

        .hero-ambient-sheen {
          position: absolute;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          width: 1200px;
          height: 500px;
          background: radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, 0.75) 0%, rgba(246, 244, 240, 0) 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Decorative NFC waves radiating behind phone */
        .hero-nfc-waves-bg {
          position: absolute;
          right: 12%;
          top: 50%;
          transform: translateY(-50%);
          width: 500px;
          height: 500px;
          pointer-events: none;
          z-index: 1;
        }
        .nfc-pulse-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(26, 26, 26, 0.04);
          animation: nfcPulseWave 8s linear infinite;
        }
        .nfc-pulse-ring.ring-1 { animation-delay: 0s; }
        .nfc-pulse-ring.ring-2 { animation-delay: 2.6s; }
        .nfc-pulse-ring.ring-3 { animation-delay: 5.2s; }

        @keyframes nfcPulseWave {
          0% { transform: scale(0.6); opacity: 0; }
          40% { opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        /* Live Ping Dot */
        .live-ping-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 8px;
          height: 8px;
        }
        .live-ping-bubble {
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #10B981;
          opacity: 0.4;
          animation: livePing 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .live-ping-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
        }
        @keyframes livePing {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        /* Clean, Crisp Neo-Grotesque Headline (No AI-slop bulbous curves) */
        .hero-headline {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: clamp(42px, 5.2vw, 68px);
          font-weight: 600;
          letter-spacing: -0.035em;
          line-height: 1.08;
          margin-bottom: 22px;
        }
        .hero-headline-line1 {
          display: block;
          color: #18181B;
        }
        .hero-headline-line2 {
          display: block;
          color: #52525B;
          font-weight: 500;
        }

        /* Description */
        .hero-description {
          font-family: 'Inter', sans-serif;
          font-size: 17px;
          line-height: 1.65;
          color: #4A4A52;
          max-width: 490px;
          margin-bottom: 36px;
          font-weight: 400;
        }
        .hero-description strong {
          color: #18181B;
          font-weight: 600;
        }

        /* Action Buttons */
        .hero-action-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 42px;
        }
        .hero-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #18181B;
          color: #FFFFFF;
          padding: 15px 26px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          transition: transform 0.15s ease, background 0.15s ease;
          cursor: pointer;
        }
        .hero-btn-primary:hover {
          transform: translateY(-1px);
          background: #27272A;
        }
        .btn-version-badge {
          background: rgba(255, 255, 255, 0.16);
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
        }

        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #FFFFFF;
          color: #18181B;
          padding: 15px 22px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid rgba(26, 26, 26, 0.1);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          transition: all 0.15s ease;
          text-decoration: none;
        }
        .hero-btn-secondary:hover {
          background: #FAFAFA;
          border-color: rgba(26, 26, 26, 0.2);
        }

        /* Metrics Bar */
        .hero-metrics-bar {
          display: flex;
          align-items: center;
          gap: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(26, 26, 26, 0.08);
          width: 100%;
          max-width: 480px;
        }
        .metric-item {
          display: flex;
          flex-direction: column;
        }
        .metric-value {
          font-family: 'Inter', sans-serif;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #18181B;
        }
        .metric-label {
          font-size: 12px;
          color: #71717A;
          font-weight: 500;
          margin-top: 2px;
        }
        .metric-divider {
          width: 1px;
          height: 32px;
          background: rgba(26, 26, 26, 0.08);
        }

        /* Floating Chips around phone */
        .hero-floating-card {
          position: absolute;
          z-index: 30;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(16px);
          padding: 8px 14px;
          border-radius: 14px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(26, 26, 26, 0.06);
          animation: floatLevitate 5s ease-in-out infinite;
          pointer-events: none;
        }
        .card-float-1 {
          top: 80px;
          left: -35px;
          animation-delay: 0s;
        }
        .card-float-2 {
          bottom: 110px;
          right: -35px;
          animation-delay: 2.5s;
        }
        @keyframes floatLevitate {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .float-card-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .float-card-icon.green { background: #E8F8F0; color: #10B981; }
        .float-card-icon.blue { background: #EFF6FF; color: #3B82F6; }
        .float-card-title {
          font-size: 12px;
          font-weight: 700;
          color: #18181B;
        }
        .float-card-sub {
          font-size: 10px;
          color: #71717A;
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
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(26, 26, 26, 0.08);
          border-radius: 18px;
          padding: 10px 12px;
          margin-top: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
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
          color: #18181B;
        }
        .flow-pause-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(26, 26, 26, 0.05);
          border: none;
          border-radius: 9999px;
          padding: 2px 7px;
          font-size: 10px;
          font-weight: 600;
          color: #18181B;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .flow-pause-btn:hover {
          background: rgba(26, 26, 26, 0.1);
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
          background: rgba(26, 26, 26, 0.08);
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
          color: #71717A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .flow-step-tab.is-active .step-label {
          color: #18181B;
          font-weight: 700;
        }

        /* Responsive Layout */
        @media (max-width: 960px) {
          .hero-split-grid {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
            text-align: center;
          }
          .hero-text-container {
            align-items: center !important;
          }
          .hero-action-buttons {
            justify-content: center;
          }
          .hero-metrics-bar {
            justify-content: center;
          }
          .hero-floating-card {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          #hero {
            padding-top: 100px !important;
            padding-bottom: 45px !important;
          }
          .hero-headline {
            font-size: 38px !important;
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
            gap: 16px;
          }
          .hero-phone-device {
            width: 280px !important;
            height: 560px !important;
          }
        }
      `}</style>
    </section>
  );
};
