import React, { useState } from 'react';
import { Smartphone, Radio, AlertTriangle, ShieldCheck, Check, Info, Cpu, Layers } from 'lucide-react';

export const Prerequisites: React.FC = () => {
  const [deviceCheck, setDeviceCheck] = useState({
    os: 'android',
    hasNfc: true,
    twoPhones: true,
  });

  const isReady = deviceCheck.os === 'android' && deviceCheck.hasNfc;

  return (
    <section
      id="prerequisites"
      style={{
        padding: '90px 0',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 60px' }}>
          <div
            className="badge-pill"
            style={{
              marginBottom: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              color: '#f87171',
            }}
          >
            <AlertTriangle size={14} />
            <span>Essential Requirements</span>
          </div>
          <h2
            style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              marginBottom: '16px',
            }}
          >
            What you need to run <span className="gradient-text-purple">TapPay</span>
          </h2>
          <p style={{ color: '#9ea0b2', fontSize: '17px', lineHeight: 1.6 }}>
            TapPay harnesses low-level native Android NFC Host Card Emulation to turn any phone into a smart card reader & payment terminal.
          </p>
        </div>

        {/* 4 Core Requirement Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          {/* Requirement 1: Android Only */}
          <div
            className="glass-panel"
            style={{
              padding: '30px 24px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Smartphone size={24} />
            </div>
            <div
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#22c55e',
                background: 'rgba(34, 197, 94, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                marginBottom: '10px',
              }}
            >
              OS REQUIREMENT
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>Android 10+ (API 34)</h3>
            <p style={{ color: '#9ea0b2', fontSize: '14px', lineHeight: 1.6 }}>
              TapPay is exclusively built for <strong>Android</strong>. Apple iOS restricts Host Card Emulation to Apple Pay, preventing peer-to-peer NFC wallet broadcasts.
            </p>
          </div>

          {/* Requirement 2: NFC Chip */}
          <div
            className="glass-panel"
            style={{
              padding: '30px 24px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(131, 110, 249, 0.15)',
                color: '#ab9ff2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Radio size={24} />
            </div>
            <div
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#ab9ff2',
                background: 'rgba(131, 110, 249, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                marginBottom: '10px',
              }}
            >
              HARDWARE CHIP
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>NFC &amp; HCE Enabled</h3>
            <p style={{ color: '#9ea0b2', fontSize: '14px', lineHeight: 1.6 }}>
              Your device must have a physical <strong>NFC sensor</strong> enabled in system settings to transmit APDU commands between devices on contact.
            </p>
          </div>

          {/* Requirement 3: Two Devices */}
          <div
            className="glass-panel"
            style={{
              padding: '30px 24px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Layers size={24} />
            </div>
            <div
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                marginBottom: '10px',
              }}
            >
              TESTING SETUP
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>Two Physical Phones</h3>
            <p style={{ color: '#9ea0b2', fontSize: '14px', lineHeight: 1.6 }}>
              To test the full <strong>Tap-to-Pay</strong> loop, you need two physical Android devices: one as the sender and one as the receiver. Emulators lack NFC radios.
            </p>
          </div>

          {/* Requirement 4: Monad Testnet */}
          <div
            className="glass-panel"
            style={{
              padding: '30px 24px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Cpu size={24} />
            </div>
            <div
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.12)',
                padding: '3px 8px',
                borderRadius: '6px',
                marginBottom: '10px',
              }}
            >
              NETWORK
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>Monad Testnet (10143)</h3>
            <p style={{ color: '#9ea0b2', fontSize: '14px', lineHeight: 1.6 }}>
              Settles on <strong>Monad Testnet</strong> (Chain ID <code>10143</code>). Claim free testnet MON tokens from the official faucet to try instant 1s settlement.
            </p>
          </div>
        </div>

        {/* Interactive Compatibility Checker Bar */}
        <div
          className="glass-panel"
          style={{
            padding: '24px 32px',
            background: 'linear-gradient(135deg, rgba(23, 24, 38, 0.9) 0%, rgba(18, 19, 27, 0.95) 100%)',
            border: '1px solid rgba(131, 110, 249, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <ShieldCheck size={20} color="#836ef9" />
              <h4 style={{ fontSize: '17px', fontWeight: 700 }}>Quick Device Compatibility Check</h4>
            </div>
            <p style={{ color: '#9ea0b2', fontSize: '14px' }}>
              Do you have an Android device with NFC enabled?
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="radio"
                name="os"
                checked={deviceCheck.os === 'android'}
                onChange={() => setDeviceCheck({ ...deviceCheck, os: 'android' })}
                style={{ accentColor: '#836ef9' }}
              />
              <span>Android (Supported)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="radio"
                name="os"
                checked={deviceCheck.os === 'ios'}
                onChange={() => setDeviceCheck({ ...deviceCheck, os: 'ios' })}
                style={{ accentColor: '#836ef9' }}
              />
              <span>iOS (Unsupported)</span>
            </label>

            <div
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isReady ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isReady ? '#22c55e' : '#f87171',
                border: `1px solid ${isReady ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {isReady ? <Check size={16} /> : <AlertTriangle size={16} />}
              <span>{isReady ? 'Your phone is TapPay Ready!' : 'Device Not Supported (Android Required)'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
