import React, { useState, useEffect } from 'react';
import {
  Radio,
  Check,
  RotateCcw,
  Zap,
  ExternalLink,
  Wifi,
  Battery,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  Play,
  Pause,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

type DemoPhase = 'home' | 'setup' | 'approaching' | 'broadcasting' | 'settled';

const PHASE_DURATIONS: Record<DemoPhase, number> = {
  home: 2100,
  setup: 2600,
  approaching: 2000,
  broadcasting: 1000,
  settled: 3800,
};

const PHASES_ORDER: DemoPhase[] = ['home', 'setup', 'approaching', 'broadcasting', 'settled'];

export const NfcSimulator: React.FC = () => {
  const [phase, setPhase] = useState<DemoPhase>('home');
  const [isPaused, setIsPaused] = useState(false);
  const [amount, setAmount] = useState('2.5');
  const [typedAmount, setTypedAmount] = useState('0');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [senderBal, setSenderBal] = useState(142.5);
  const [receiverBal, setReceiverBal] = useState(8.0);
  const [txHash, setTxHash] = useState('0x5b17...6838');

  // Simulated tap cursor indicators on each phone
  const [senderCursor, setSenderCursor] = useState<{ x: number; y: number; visible: boolean; tapped: boolean }>({
    x: 50,
    y: 50,
    visible: false,
    tapped: false,
  });
  const [receiverCursor, setReceiverCursor] = useState<{ x: number; y: number; visible: boolean; tapped: boolean }>({
    x: 50,
    y: 50,
    visible: false,
    tapped: false,
  });

  // Automated or interactive playback timeline
  useEffect(() => {
    if (isPaused) return;

    const duration = PHASE_DURATIONS[phase];
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (phase === 'home') {
      setSenderBal(142.5);
      setReceiverBal(8.0);
      setTypedAmount('0');
      setActiveKey(null);

      // 1. Sender cursor targets "Send Tap (NFC)" button and Receiver cursor targets "Receive Tap"
      timers.push(
        setTimeout(() => {
          setSenderCursor({ x: 30, y: 55, visible: true, tapped: false });
          setReceiverCursor({ x: 70, y: 55, visible: true, tapped: false });
        }, 400)
      );

      timers.push(
        setTimeout(() => {
          setSenderCursor((prev) => ({ ...prev, tapped: true }));
          setReceiverCursor((prev) => ({ ...prev, tapped: true }));
        }, 1100)
      );

      timers.push(
        setTimeout(() => {
          setSenderCursor({ x: 30, y: 55, visible: false, tapped: false });
          setReceiverCursor({ x: 70, y: 55, visible: false, tapped: false });
        }, 1600)
      );
    } else if (phase === 'setup') {
      setTypedAmount('0');
      setActiveKey(null);

      // Dynamic sequential keypad typing on sender phone
      const targetStr = amount || '2.5';
      const chars = targetStr.split('');
      chars.forEach((char, idx) => {
        const delay = 250 + idx * 300;
        timers.push(
          setTimeout(() => {
            setActiveKey(char);
            setTypedAmount(chars.slice(0, idx + 1).join(''));
          }, delay)
        );
      });

      // Release key highlight
      const keyEndDelay = 250 + chars.length * 300 + 100;
      timers.push(
        setTimeout(() => {
          setActiveKey(null);
        }, keyEndDelay)
      );

      // Sender cursor taps "Ready to Tap (NFC)" button
      const readyDelay = keyEndDelay + 200;
      timers.push(
        setTimeout(() => {
          setSenderCursor({ x: 50, y: 88, visible: true, tapped: false });
        }, readyDelay)
      );

      timers.push(
        setTimeout(() => {
          setSenderCursor((prev) => ({ ...prev, tapped: true }));
        }, readyDelay + 400)
      );

      timers.push(
        setTimeout(() => {
          setSenderCursor({ x: 50, y: 88, visible: false, tapped: false });
        }, readyDelay + 750)
      );
    } else if (phase === 'approaching') {
      setSenderCursor({ x: 50, y: 50, visible: false, tapped: false });
      setReceiverCursor({ x: 50, y: 50, visible: false, tapped: false });
      setActiveKey(null);
    } else if (phase === 'broadcasting') {
      setSenderCursor({ x: 50, y: 50, visible: false, tapped: false });
      setReceiverCursor({ x: 50, y: 50, visible: false, tapped: false });
    } else if (phase === 'settled') {
      const num = parseFloat(amount) || 2.5;
      setSenderBal(+(142.5 - num).toFixed(2));
      setReceiverBal(+(8.0 + num).toFixed(2));
      setTxHash('0x' + Math.random().toString(16).slice(2, 10) + '...6838');
    }

    // Step progression timer
    timers.push(
      setTimeout(() => {
        const nextIndex = (PHASES_ORDER.indexOf(phase) + 1) % PHASES_ORDER.length;
        setPhase(PHASES_ORDER[nextIndex]);
      }, duration)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [phase, isPaused, amount]);

  const handleStartManualDemo = () => {
    setPhase('home');
    setIsPaused(false);
  };

  const handleSelectPhase = (p: DemoPhase) => {
    setPhase(p);
  };

  return (
    <section
      id="demo"
      style={{
        padding: '100px 0 80px',
        position: 'relative',
      }}
    >
      <div className="phantom-container">
        {/* Section Title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }} className="scroll-reveal">
          <h2 className="phantom-section-title">
            Interactive phone-to-phone
            <br />
            tap simulation
          </h2>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'var(--pill-bg)',
              color: 'var(--text-dark)',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <Radio size={14} color="#10B981" />
            <span>Dual-Device Realtime NFC Proximity</span>
          </div>
        </div>

        {/* Large Stage Card */}
        <div
          className="scroll-reveal-scale sim-stage-card"
          style={{
            background: '#FFFFFF',
            borderRadius: '32px',
            padding: '36px 32px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.05)',
            maxWidth: '1120px',
            margin: '0 auto',
            border: '1px solid rgba(26, 26, 26, 0.08)',
          }}
        >
          {/* Top Control Bar */}
          <div
            className="sim-action-row"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              paddingBottom: '22px',
              borderBottom: '1px solid rgba(26, 26, 26, 0.07)',
              marginBottom: '28px',
            }}
          >
            {/* Amount Configuration */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)' }}>
                Transfer Amount:
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--pill-bg)',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(26, 26, 26, 0.08)',
                }}
              >
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={phase !== 'home'}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    width: '55px',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>MON</span>
              </div>

              {/* Quick Presets */}
              <div className="sim-presets-group" style={{ display: 'flex', gap: '6px' }}>
                {['1.0', '2.5', '5.0', '10.0'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setAmount(preset);
                      setPhase('home');
                    }}
                    style={{
                      background: amount === preset ? '#18181B' : 'transparent',
                      color: amount === preset ? '#FFFFFF' : '#71717A',
                      border: '1px solid rgba(26, 26, 26, 0.08)',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Playback & Reset Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleStartManualDemo}
                className="phantom-btn-pill"
                style={{
                  background: '#18181B',
                  color: '#FFFFFF',
                  padding: '11px 22px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '9999px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                }}
              >
                <RotateCcw size={14} />
                <span>Replay Flow From Start</span>
              </button>

              <button
                onClick={() => setIsPaused(!isPaused)}
                className="phantom-btn-pill"
                style={{
                  background: 'var(--pill-bg)',
                  color: 'var(--text-dark)',
                  padding: '11px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(26, 26, 26, 0.08)',
                }}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            </div>
          </div>

          {/* Flow Phase Progress Tracker */}
          <div className="sim-flow-steps-tracker">
            {[
              { id: 'home' as DemoPhase, num: '1', title: '1. Home (Send & Receive NFC)' },
              { id: 'setup' as DemoPhase, num: '2', title: `2. Sender Enters ${amount} MON` },
              { id: 'approaching' as DemoPhase, num: '3', title: '3. Tap Phones: Bring Close (<4cm)' },
              { id: 'broadcasting' as DemoPhase, num: '4', title: '4. Transmitting & Monad Consensus' },
              { id: 'settled' as DemoPhase, num: '5', title: '5. Payment Successful (Dual GPay)' },
            ].map((stepItem) => {
              const isCurrent = phase === stepItem.id;
              const isDone = PHASES_ORDER.indexOf(phase) > PHASES_ORDER.indexOf(stepItem.id);

              return (
                <button
                  key={stepItem.id}
                  onClick={() => handleSelectPhase(stepItem.id)}
                  className={`tracker-pill ${isCurrent ? 'active' : isDone ? 'done' : ''}`}
                >
                  <span className="step-num">{isDone ? '✓' : stepItem.num}</span>
                  <span className="step-text">{stepItem.title}</span>
                </button>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* TWO REALISTIC SMARTPHONE SCREENS SIDE-BY-SIDE                */}
          {/* ============================================================ */}
          <div className="sim-dual-phone-arena">
            {/* 1. SENDER PHONE (@anurag) */}
            <div
              className={`sim-phone-wrapper sender-wrapper ${
                phase === 'approaching' || phase === 'broadcasting'
                  ? 'is-touching-glide-right'
                  : phase === 'settled'
                  ? 'is-touching-glide-right-settled'
                  : ''
              }`}
            >
              <div className="phone-device-tag sender">
                <span className="device-tag-dot" />
                <span>SENDER PHONE · @anurag</span>
              </div>

              <div className="realistic-phone-chassis nfc-simulator-chassis">
                <div className="realistic-phone-btn-vol" />
                <div className="realistic-phone-btn-pwr" />

                <div className="realistic-phone-screen">
                  <div className="glass-sheen-sweep" />
                  <div className="realistic-phone-camera" />

                  {/* Status Bar */}
                  <div className="phone-status-bar">
                    <span>9:41</span>
                    <div className="status-chip">
                      <span className="chip-dot" />
                      <span>Monad Testnet</span>
                    </div>
                    <div className="status-icons">
                      <Wifi size={12} />
                      <Battery size={12} />
                    </div>
                  </div>

                  {/* Screen Body */}
                  <div className="phone-screen-body">
                    {/* STAGE 1: HOME SCREEN ON SENDER */}
                    {phase === 'home' && (
                      <div className="screen-content-view">
                        <div className="sim-phone-top-bar">
                          <div className="sim-user-chip">
                            <div className="sim-user-avatar sender">A</div>
                            <div>
                              <div className="sim-user-handle">@anurag</div>
                              <div className="sim-user-role">Sender Wallet</div>
                            </div>
                          </div>
                        </div>

                        {/* Virtual Card */}
                        <div className="sim-mini-virtual-card">
                          <div className="card-row-top">
                            <span className="card-brand">TapPay</span>
                            <Radio size={14} color="#FFF" />
                          </div>
                          <div className="card-balance-lbl">CARD BALANCE</div>
                          <div className="card-balance-val">
                            {senderBal.toFixed(2)} <span className="card-currency">MON</span>
                          </div>
                          <div className="card-address-mono">0x1406 •••• Fa002</div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="sim-quick-actions">
                          <div className={`sim-btn-action primary ${senderCursor.tapped ? 'is-tapped' : ''}`}>
                            <Radio size={14} />
                            <span>Send Tap (NFC)</span>
                          </div>
                          <div className="sim-btn-action secondary">
                            <span>Receive Tap</span>
                          </div>
                        </div>

                        <div className="sim-direct-row">
                          <div className="sim-at-icon">@</div>
                          <div>
                            <div className="sim-direct-title">Direct Transfer</div>
                            <div className="sim-direct-sub">Pay via @username or address</div>
                          </div>
                          <ChevronRight size={13} opacity={0.4} style={{ marginLeft: 'auto' }} />
                        </div>

                        <div className="sim-card-footer-tip">
                          <span>Tap "Send Tap" to begin NFC transfer</span>
                        </div>
                      </div>
                    )}

                    {/* STAGE 2: ENTER AMOUNT SCREEN ON SENDER */}
                    {phase === 'setup' && (
                      <div className="screen-content-view">
                        <div className="sim-screen-title-bar">
                          <div className="sim-amount-title">Send via NFC Touch</div>
                          <div className="sim-badge-active">NFC Ready</div>
                        </div>

                        <div className="sim-amount-display-box">
                          <div className="sim-amount-caption">TRANSFER AMOUNT</div>
                          <div className="sim-amount-val">
                            {typedAmount} <span className="sim-amount-unit">MON</span>
                          </div>
                          <div className="sim-amount-fiat">
                            ≈ ${(parseFloat(typedAmount || '0') * 2.86).toFixed(2)} USD
                          </div>
                        </div>

                        <div className="sim-target-hint">
                          <Radio size={13} color="#10B981" />
                          <span>Hold phones within 4cm to transmit</span>
                        </div>

                        <div className="sim-mini-keypad">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
                            <div
                              key={key}
                              className={`sim-keypad-key ${
                                activeKey === key
                                  ? 'key-active-press'
                                  : typedAmount.includes(key) && key !== '0'
                                  ? 'key-lit'
                                  : ''
                              }`}
                            >
                              {key}
                            </div>
                          ))}
                        </div>

                        <div className={`sim-btn-ready ${senderCursor.tapped ? 'is-tapped' : ''}`}>
                          <Radio size={15} />
                          <span>Ready to Tap (NFC)</span>
                        </div>
                      </div>
                    )}

                    {/* STAGE 3 & 4: APPROACHING & BROADCASTING ON SENDER */}
                    {(phase === 'approaching' || phase === 'broadcasting') && (
                      <div className="screen-content-view">
                        <div className="sim-radar-badge">NFC BEAM ACTIVE</div>

                        <div className="sim-radar-stage">
                          <div className="radar-circle radar-c1" />
                          <div className="radar-circle radar-c2" />
                          <div className="radar-phone-icon">
                            <Radio size={30} color="#FFFFFF" className="pulse-icon" />
                          </div>
                        </div>

                        <div className="sim-search-status">
                          <div className="sim-status-head">Phones In 4cm Range!</div>
                          <div className="sim-status-desc">Transmitting {amount} MON APDU Payload</div>
                        </div>

                        <div className="sim-detected-card">
                          <div className="detected-avatar">M</div>
                          <div>
                            <div className="detected-name">@misbah (Receiver)</div>
                            <div className="detected-addr">0xEebB...1aDD</div>
                          </div>
                          <div className="detected-badge">PAIRED</div>
                        </div>

                        <div className="sim-handshake-status">
                          <span className="handshake-spinner" />
                          <span>
                            {phase === 'broadcasting'
                              ? 'Broadcasting atomic tx to Monad...'
                              : 'Exchanging cryptographic keypair...'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* STAGE 5: GPAY SUCCESS SCREEN ON SENDER */}
                    {phase === 'settled' && (
                      <div className="screen-content-view success-view">
                        <div className="gpay-circle-wrapper">
                          <div className="gpay-ripple-ring ring-1" />
                          <div className="gpay-ripple-ring ring-2" />
                          <div className="gpay-circle-main">
                            <Check size={38} color="#FFFFFF" strokeWidth={3} className="gpay-check-icon" />
                          </div>
                        </div>

                        <div className="gpay-amount-text">-{amount} MON</div>
                        <div className="gpay-status-headline">Payment Successful!</div>
                        <div className="gpay-recipient-sub">Paid to @misbah via NFC</div>

                        <div className="gpay-receipt-card">
                          <div className="receipt-row">
                            <span className="rk">New Balance</span>
                            <span className="rv">{senderBal.toFixed(2)} MON</span>
                          </div>
                          <div className="receipt-row">
                            <span className="rk">Settlement Speed</span>
                            <span className="rv green">0.82s (Monad)</span>
                          </div>
                          <div className="receipt-row">
                            <span className="rk">Tx Status</span>
                            <span className="rv green">✓ Confirmed 10143</span>
                          </div>
                          <div className="receipt-row">
                            <span className="rk">TxHash</span>
                            <span className="rv mono">{txHash}</span>
                          </div>
                        </div>

                        <div className="gpay-footer-note">
                          <span>Atomic peer-to-peer delivery</span>
                        </div>
                      </div>
                    )}

                    {/* Sender Tap Cursor Indicator */}
                    {senderCursor.visible && (
                      <div
                        className={`sim-tap-cursor ${senderCursor.tapped ? 'tap-clicked' : ''}`}
                        style={{
                          left: `${senderCursor.x}%`,
                          top: `${senderCursor.y}%`,
                        }}
                      >
                        <div className="cursor-pointer" />
                        <div className="cursor-ripple" />
                      </div>
                    )}
                  </div>

                  <div className="phone-home-indicator" />
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* MIDDLE ACTIVE NFC FIELD BRIDGE                               */}
            {/* ============================================================ */}
            <div className="sim-center-nfc-field">
              <div
                className={`nfc-wave-emitter ${
                  phase === 'approaching' || phase === 'broadcasting' ? 'is-beaming' : ''
                }`}
              >
                <div className="wave-ring w1" />
                <div className="wave-ring w2" />
                <div className="wave-ring w3" />
                <div className="center-antenna-badge">
                  <Radio
                    size={28}
                    color={phase === 'settled' ? '#10B981' : phase === 'approaching' || phase === 'broadcasting' ? '#10B981' : '#71717A'}
                    className={phase === 'approaching' || phase === 'broadcasting' ? 'pulse-antenna' : ''}
                  />
                  <span className="antenna-range-lbl">
                    {phase === 'settled'
                      ? '✓ SETTLED'
                      : phase === 'approaching' || phase === 'broadcasting'
                      ? '⚡ 4CM TOUCH'
                      : '2–4CM NFC'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. RECEIVER PHONE (@misbah) */}
            <div
              className={`sim-phone-wrapper receiver-wrapper ${
                phase === 'approaching' || phase === 'broadcasting'
                  ? 'is-touching-glide-left'
                  : phase === 'settled'
                  ? 'is-touching-glide-left-settled'
                  : ''
              }`}
            >
              <div className="phone-device-tag receiver">
                <span className="device-tag-dot green" />
                <span>RECEIVER PHONE · @misbah</span>
              </div>

              <div className="realistic-phone-chassis nfc-simulator-chassis">
                <div className="realistic-phone-btn-vol" />
                <div className="realistic-phone-btn-pwr" />

                <div className="realistic-phone-screen">
                  <div className="glass-sheen-sweep" />
                  <div className="realistic-phone-camera" />

                  {/* Status Bar */}
                  <div className="phone-status-bar">
                    <span>9:41</span>
                    <div className="status-chip">
                      <span className="chip-dot" />
                      <span>Monad Testnet</span>
                    </div>
                    <div className="status-icons">
                      <Wifi size={12} />
                      <Battery size={12} />
                    </div>
                  </div>

                  {/* Screen Body */}
                  <div className="phone-screen-body">
                    {/* STAGE 1: HOME SCREEN ON RECEIVER */}
                    {phase === 'home' && (
                      <div className="screen-content-view">
                        <div className="sim-phone-top-bar">
                          <div className="sim-user-chip">
                            <div className="sim-user-avatar receiver">M</div>
                            <div>
                              <div className="sim-user-handle">@misbah</div>
                              <div className="sim-user-role">Receiver Wallet</div>
                            </div>
                          </div>
                        </div>

                        {/* Receiver Card */}
                        <div className="sim-mini-virtual-card receiver-card">
                          <div className="card-row-top">
                            <span className="card-brand">TapPay</span>
                            <Radio size={14} color="#10B981" />
                          </div>
                          <div className="card-balance-lbl">CARD BALANCE</div>
                          <div className="card-balance-val">
                            {receiverBal.toFixed(2)} <span className="card-currency green">MON</span>
                          </div>
                          <div className="card-address-mono">0xEebB •••• 1aDD</div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="sim-quick-actions">
                          <div className="sim-btn-action secondary">
                            <span>Send Tap (NFC)</span>
                          </div>
                          <div className={`sim-btn-action primary receiver-btn ${receiverCursor.tapped ? 'is-tapped' : ''}`}>
                            <Radio size={14} color="#10B981" />
                            <span>Receive Tap</span>
                          </div>
                        </div>

                        <div className="sim-direct-row">
                          <div className="sim-at-icon">@</div>
                          <div>
                            <div className="sim-direct-title">Direct Transfer</div>
                            <div className="sim-direct-sub">Pay via @username or address</div>
                          </div>
                          <ChevronRight size={13} opacity={0.4} style={{ marginLeft: 'auto' }} />
                        </div>

                        <div className="sim-card-footer-tip">
                          <span>Tap "Receive Tap" to start HCE listener</span>
                        </div>
                      </div>
                    )}

                    {/* STAGE 2: RECEIVER LISTENING SCREEN */}
                    {phase === 'setup' && (
                      <div className="screen-content-view">
                        <div className="sim-screen-title-bar">
                          <div className="sim-amount-title">Receive via Contactless</div>
                          <div className="sim-badge-active green">HCE Active</div>
                        </div>

                        <div className="sim-transfer-card receiver-mode">
                          <div className="transfer-header-row">
                            <span className="transfer-label">HCE TERMINAL LISTENING</span>
                            <span className="transfer-method-badge green">ISO-DEP</span>
                          </div>
                          <div className="rx-idle-state-box">
                            <div className="rx-hint-pulse">Waiting for Sender Phone...</div>
                            <div className="rx-hint-sub">Listening on AID F00102030405</div>
                          </div>
                        </div>

                        <div className="sim-phone-radar-zone">
                          <div className="radar-idle-hint">
                            <div className="radar-phone-symbol receiver-symbol">
                              <Radio size={26} color="#059669" />
                            </div>
                            <div className="radar-hint-text">Ready to Receive</div>
                            <div className="radar-hint-sub">Bring sender phone close</div>
                          </div>
                        </div>

                        <div className="sim-card-footer-tip">
                          <span>StrongBox Keystore Emulation Active</span>
                        </div>
                      </div>
                    )}

                    {/* STAGE 3 & 4: APPROACHING & BROADCASTING ON RECEIVER */}
                    {(phase === 'approaching' || phase === 'broadcasting') && (
                      <div className="screen-content-view">
                        <div className="sim-radar-badge green">NFC TOUCH DETECTED</div>

                        <div className="sim-radar-stage">
                          <div className="radar-circle radar-c1 green" />
                          <div className="radar-circle radar-c2 green" />
                          <div className="radar-phone-icon receiver-icon">
                            <Radio size={30} color="#FFFFFF" className="pulse-icon" />
                          </div>
                        </div>

                        <div className="sim-search-status">
                          <div className="sim-status-head">Receiving from @anurag</div>
                          <div className="sim-status-desc">Incoming Payment: +{amount} MON</div>
                        </div>

                        <div className="sim-detected-card">
                          <div className="detected-avatar sender-bg">A</div>
                          <div>
                            <div className="detected-name">@anurag (Sender)</div>
                            <div className="detected-addr">0x1406...Fa002</div>
                          </div>
                          <div className="detected-badge green">VERIFIED</div>
                        </div>

                        <div className="sim-handshake-status">
                          <span className="handshake-spinner" />
                          <span>
                            {phase === 'broadcasting'
                              ? 'Signing atomic settlement on Monad...'
                              : 'Decrypting APDU payment token...'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* STAGE 5: GPAY SUCCESS SCREEN ON RECEIVER */}
                    {phase === 'settled' && (
                      <div className="screen-content-view success-view">
                        <div className="gpay-circle-wrapper">
                          <div className="gpay-ripple-ring ring-1" />
                          <div className="gpay-ripple-ring ring-2" />
                          <div className="gpay-circle-main receiver-green">
                            <Check size={38} color="#FFFFFF" strokeWidth={3} className="gpay-check-icon" />
                          </div>
                        </div>

                        <div className="gpay-amount-text green">+{amount} MON</div>
                        <div className="gpay-status-headline">Payment Received!</div>
                        <div className="gpay-recipient-sub">Received from @anurag via NFC</div>

                        <div className="gpay-receipt-card">
                          <div className="receipt-row">
                            <span className="rk">New Balance</span>
                            <span className="rv">{receiverBal.toFixed(2)} MON</span>
                          </div>
                          <div className="receipt-row">
                            <span className="rk">Terminal Protocol</span>
                            <span className="rv green">Android HCE Verified</span>
                          </div>
                          <div className="receipt-row">
                            <span className="rk">Settlement Speed</span>
                            <span className="rv green">0.82s (Monad)</span>
                          </div>
                          <div className="receipt-row">
                            <span className="rk">TxHash</span>
                            <span className="rv mono">{txHash}</span>
                          </div>
                        </div>

                        <div className="gpay-footer-note">
                          <span>Deposited to non-custodial keystore</span>
                        </div>
                      </div>
                    )}

                    {/* Receiver Tap Cursor Indicator */}
                    {receiverCursor.visible && (
                      <div
                        className={`sim-tap-cursor ${receiverCursor.tapped ? 'tap-clicked' : ''}`}
                        style={{
                          left: `${receiverCursor.x}%`,
                          top: `${receiverCursor.y}%`,
                        }}
                      >
                        <div className="cursor-pointer" />
                        <div className="cursor-ripple" />
                      </div>
                    )}
                  </div>

                  <div className="phone-home-indicator" />
                </div>
              </div>
            </div>
          </div>

          {/* Settled Transaction Banner */}
          {phase === 'settled' && (
            <div
              style={{
                marginTop: '28px',
                padding: '16px 22px',
                borderRadius: '16px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                animation: 'screenFade 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#10B981',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                    Atomic Settlement Confirmed on Monad (~0.82s)
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803D', fontFamily: 'monospace' }}>
                    TxHash: {txHash} · Gas: ~0.0004 MON · Chain ID: 10143
                  </div>
                </div>
              </div>

              <a
                href="https://testnet.monadscan.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                  background: '#DCFCE7',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                }}
              >
                <span>MonadScan</span>
                <ExternalLink size={13} />
              </a>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* ========================================================= */
        /* FLOW TRACKER PILLS                                        */
        /* ========================================================= */

        .sim-flow-steps-tracker {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .tracker-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(26, 26, 26, 0.04);
          border: 1px solid rgba(26, 26, 26, 0.06);
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          color: #71717A;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tracker-pill.active {
          background: #18181B;
          color: #FFFFFF;
          border-color: #18181B;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .tracker-pill.done {
          background: #ECFDF5;
          color: #065F46;
          border-color: #A7F3D0;
        }
        .step-num {
          font-weight: 700;
        }

        /* ========================================================= */
        /* TWO REALISTIC SMARTPHONES & PHYSICAL TOUCH PROXIMITY      */
        /* ========================================================= */

        .sim-dual-phone-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
          position: relative;
          padding: 10px 0;
        }

        .sim-phone-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Physical Touch Motion: Phones slide together into 4cm field! */
        .is-touching-glide-right {
          transform: translateX(54px) rotate(2.5deg);
        }
        .is-touching-glide-left {
          transform: translateX(-54px) rotate(-2.5deg);
        }
        .is-touching-glide-right-settled {
          transform: translateX(18px) rotate(0.8deg);
        }
        .is-touching-glide-left-settled {
          transform: translateX(-18px) rotate(-0.8deg);
        }

        .phone-device-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          background: #F4F4F5;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #18181B;
          margin-bottom: 12px;
        }
        .device-tag-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3B82F6;
        }
        .device-tag-dot.green {
          background: #10B981;
        }

        .nfc-simulator-chassis {
          width: 285px;
          height: 560px;
          border-radius: 44px;
          background: #111218;
          padding: 7px;
          position: relative;
          box-shadow: 
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 0 0 4px #22232E,
            0 25px 60px -15px rgba(0, 0, 0, 0.35);
        }

        .phone-status-bar {
          height: 36px;
          padding: 8px 16px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          color: #FFF;
          background: #09090D;
          z-index: 10;
        }
        .status-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 7px;
          border-radius: 9999px;
          font-size: 9.5px;
        }
        .chip-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10B981;
        }
        .status-icons {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .phone-screen-body {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #09090D;
        }

        .screen-content-view {
          height: 100%;
          padding: 12px 14px;
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          animation: screenFade 0.25s ease;
        }
        @keyframes screenFade {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        .sim-phone-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .sim-user-chip {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sim-user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
        }
        .sim-user-avatar.sender { background: #1E1B4B; color: #818CF8; }
        .sim-user-avatar.receiver { background: #064E3B; color: #34D399; }
        .sim-user-handle { font-size: 12px; font-weight: 700; color: #FFFFFF; line-height: 1.1; }
        .sim-user-role { font-size: 9px; color: rgba(255, 255, 255, 0.45); }

        /* Mini Virtual Card */
        .sim-mini-virtual-card {
          background: linear-gradient(135deg, #181926 0%, #0F101A 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 10px 12px;
          margin-bottom: 10px;
        }
        .sim-mini-virtual-card.receiver-card {
          background: linear-gradient(135deg, #09261D 0%, #061A13 100%);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .card-row-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .card-brand { font-size: 10px; font-weight: 800; letter-spacing: 0.04em; color: rgba(255, 255, 255, 0.8); }
        .card-balance-lbl { font-size: 8px; color: rgba(255, 255, 255, 0.35); }
        .card-balance-val { font-size: 20px; font-weight: 800; color: #FFFFFF; line-height: 1.15; }
        .card-currency { font-size: 12px; color: #3B82F6; }
        .card-currency.green { color: #10B981; }
        .card-address-mono { font-family: monospace; font-size: 9px; color: rgba(255, 255, 255, 0.4); margin-top: 4px; }

        /* Quick Action Buttons on Home */
        .sim-quick-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-bottom: 10px;
        }
        .sim-btn-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 9px 6px;
          border-radius: 10px;
          font-size: 10.5px;
          font-weight: 700;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .sim-btn-action.primary {
          background: #FFFFFF;
          color: #09090D;
        }
        .sim-btn-action.primary.receiver-btn {
          background: #10B981;
          color: #FFFFFF;
        }
        .sim-btn-action.primary.is-tapped {
          transform: scale(0.93);
          background: #E5E7EB;
        }
        .sim-btn-action.secondary {
          background: rgba(255, 255, 255, 0.06);
          color: #FFFFFF;
        }

        .sim-direct-row {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 7px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .sim-at-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
        }
        .sim-direct-title { font-size: 10.5px; font-weight: 600; }
        .sim-direct-sub { font-size: 8.5px; color: rgba(255, 255, 255, 0.35); }

        /* Setup / Keypad Screens */
        .sim-screen-title-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .sim-amount-title { font-size: 12px; font-weight: 700; }
        .sim-badge-active {
          font-size: 9px;
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
          padding: 2px 7px;
          border-radius: 9999px;
          font-weight: 700;
        }
        .sim-amount-display-box {
          background: #14151F;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px 10px;
          text-align: center;
          margin-bottom: 8px;
        }
        .sim-amount-caption { font-size: 8.5px; letter-spacing: 0.06em; color: rgba(255, 255, 255, 0.4); margin-bottom: 2px; }
        .sim-amount-val { font-size: 28px; font-weight: 800; color: #FFFFFF; line-height: 1.1; }
        .sim-amount-unit { font-size: 15px; color: #10B981; }
        .sim-amount-fiat { font-size: 10px; color: rgba(255, 255, 255, 0.4); margin-top: 2px; }
        .sim-target-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
        }
        .sim-mini-keypad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5px;
          margin-bottom: 10px;
        }
        .sim-keypad-key {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          padding: 6px 0;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
        }
        .sim-keypad-key.key-lit {
          background: rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
        }
        .sim-keypad-key.key-active-press {
          background: #10B981 !important;
          color: #FFFFFF !important;
          transform: scale(0.92);
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.7);
        }
        .sim-btn-ready {
          background: #10B981;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
          transition: transform 0.15s ease;
        }
        .sim-btn-ready.is-tapped {
          transform: scale(0.95);
          opacity: 0.9;
        }

        /* Receiver Setup / Listening */
        .rx-idle-state-box {
          background: rgba(16, 185, 129, 0.06);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          margin-top: 6px;
        }
        .rx-hint-pulse {
          font-size: 12px;
          font-weight: 700;
          color: #10B981;
        }
        .rx-hint-sub {
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.45);
          margin-top: 3px;
        }

        /* Radar & Proximity States */
        .sim-radar-badge {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #10B981;
          text-align: center;
          margin-bottom: 16px;
        }
        .sim-radar-badge.green { color: #10B981; }
        .sim-radar-stage {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .radar-circle {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid rgba(16, 185, 129, 0.4);
          animation: radarExpand 2.2s ease-out infinite;
        }
        .radar-c1 { width: 50px; height: 50px; animation-delay: 0s; }
        .radar-c2 { width: 90px; height: 90px; animation-delay: 0.7s; }
        .radar-circle.green { border-color: rgba(16, 185, 129, 0.4); }
        @keyframes radarExpand {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .radar-phone-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #11121C;
          border: 2px solid #10B981;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }
        .radar-phone-icon.receiver-icon {
          border-color: #059669;
        }
        .sim-search-status {
          text-align: center;
          margin-bottom: 14px;
        }
        .sim-status-head { font-size: 14px; font-weight: 700; color: #FFFFFF; }
        .sim-status-desc { font-size: 10px; color: rgba(255, 255, 255, 0.5); margin-top: 2px; }
        .sim-detected-card {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .detected-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #059669;
          color: #FFF;
          font-weight: 700;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .detected-avatar.sender-bg { background: #1E1B4B; color: #818CF8; }
        .detected-name { font-size: 11px; font-weight: 700; }
        .detected-addr { font-size: 8.5px; color: rgba(255, 255, 255, 0.4); font-family: monospace; }
        .detected-badge {
          margin-left: auto;
          font-size: 8.5px;
          font-weight: 800;
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .sim-handshake-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 9.5px;
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
        @keyframes spin { to { transform: rotate(360deg); } }

        /* GPAY SUCCESS SCREEN */
        .success-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-top: 24px;
        }
        .gpay-circle-wrapper {
          position: relative;
          width: 82px;
          height: 82px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        .gpay-ripple-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid #10B981;
          animation: gpayBurst 2s ease-out infinite;
        }
        .gpay-ripple-ring.ring-1 { animation-delay: 0s; }
        .gpay-ripple-ring.ring-2 { animation-delay: 0.6s; }
        @keyframes gpayBurst {
          0% { transform: scale(0.7); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .gpay-circle-main {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #10B981;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
          animation: gpayBounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .gpay-circle-main.receiver-green {
          background: #059669;
          box-shadow: 0 0 30px rgba(5, 150, 105, 0.5);
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
        .gpay-amount-text {
          font-size: 24px;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 2px;
        }
        .gpay-amount-text.green { color: #10B981; }
        .gpay-status-headline { font-size: 15px; font-weight: 700; color: #10B981; margin-bottom: 2px; }
        .gpay-recipient-sub { font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 14px; }
        .gpay-receipt-card {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }
        .receipt-row {
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
        }
        .rk { color: rgba(255, 255, 255, 0.4); }
        .rv { color: rgba(255, 255, 255, 0.85); font-weight: 600; }
        .rv.green { color: #10B981; font-weight: 700; }
        .rv.mono { font-family: monospace; font-size: 8.5px; }
        .gpay-footer-note { font-size: 9px; color: rgba(255, 255, 255, 0.35); }

        /* Simulated Cursor Pointer */
        .sim-tap-cursor {
          position: absolute;
          width: 20px;
          height: 20px;
          pointer-events: none;
          z-index: 50;
          transform: translate(-50%, -50%);
          transition: left 0.35s cubic-bezier(0.16, 1, 0.3, 1), top 0.35s cubic-bezier(0.16, 1, 0.3, 1);
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

        .phone-home-indicator {
          width: 80px;
          height: 3.5px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 2px;
          margin: 4px auto 4px;
        }

        /* ========================================================= */
        /* MIDDLE ACTIVE NFC FIELD BRIDGE                            */
        /* ========================================================= */

        .sim-center-nfc-field {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100px;
          z-index: 10;
        }
        .nfc-wave-emitter {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .center-antenna-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: #FFFFFF;
          border: 1px solid rgba(26, 26, 26, 0.08);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 10px 8px;
          z-index: 5;
        }
        .antenna-range-lbl {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #18181B;
          white-space: nowrap;
        }
        .wave-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(16, 185, 129, 0.2);
          pointer-events: none;
        }
        .wave-ring.w1 { width: 100px; height: 100px; }
        .wave-ring.w2 { width: 140px; height: 140px; }
        .wave-ring.w3 { width: 180px; height: 180px; }

        .is-beaming .wave-ring {
          border-color: #10B981;
          animation: waveBeamPing 1.4s ease-out infinite;
        }
        .is-beaming .wave-ring.w1 { animation-delay: 0s; }
        .is-beaming .wave-ring.w2 { animation-delay: 0.4s; }
        .is-beaming .wave-ring.w3 { animation-delay: 0.8s; }

        @keyframes waveBeamPing {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .pulse-antenna {
          animation: pulseAntenna 1s infinite alternate;
        }
        @keyframes pulseAntenna {
          from { transform: scale(1); filter: drop-shadow(0 0 2px #10B981); }
          to { transform: scale(1.2); filter: drop-shadow(0 0 12px #10B981); }
        }

        /* Responsive Layout */
        @media (max-width: 900px) {
          .sim-dual-phone-arena {
            flex-direction: column;
            gap: 20px;
          }
          .sim-center-nfc-field {
            width: 100%;
            height: 60px;
          }
          .is-touching-glide-right, .is-touching-glide-left,
          .is-touching-glide-right-settled, .is-touching-glide-left-settled {
            transform: none !important;
          }
        }
        @media (max-width: 640px) {
          .sim-stage-card {
            padding: 20px 14px !important;
            border-radius: 24px !important;
          }
          .nfc-simulator-chassis {
            width: 270px !important;
            height: 520px !important;
          }
        }
      `}</style>
    </section>
  );
};
