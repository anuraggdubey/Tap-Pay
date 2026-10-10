import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Home,
  Clock,
  Settings,
  Wallet,
  Radio,
  Check,
  X,
  Search,
  RotateCcw,
  User,
  CreditCard,
  Key,
  Globe,
  Info,
  Copy,
  ArrowLeft,
} from 'lucide-react';
import '../../styles/tappay-mock-ui.css';

function TapPayMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8" cy="6" r="3" fill="currentColor" />
      <circle cx="16" cy="11" r="2" fill="currentColor" opacity="0.65" />
      <circle cx="8" cy="18" r="3.5" fill="currentColor" />
      <path d="M8 9 C8 11, 11 11, 16 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export type TapPayMockHomeProps = {
  username: string;
  avatarLetter: string;
  cardNumber?: string;
  sendActive?: boolean;
  receiveActive?: boolean;
  compact?: boolean;
  footerTip?: string;
  showTransactions?: boolean;
};

export function TapPayMockHome({
  username,
  avatarLetter,
  cardNumber = '0X1A •••• •••• 1A4E',
  sendActive,
  receiveActive,
  compact,
  footerTip,
  showTransactions = true,
}: TapPayMockHomeProps) {
  return (
    <div className={`tp-mock-screen ${compact ? 'tp-mock-compact' : ''}`}>
      <div className="tp-mock-header">
        <span className="tp-mock-brand">TapPay</span>
        <div className="tp-mock-avatar">{avatarLetter}</div>
      </div>

      <div className="tp-mock-card">
        <div className="tp-mock-card-top">
          <div className="tp-mock-card-brand">
            <TapPayMark />
            <span>TapPay</span>
          </div>
          <span className="tp-mock-card-balance-pill">Tap to see balance ›</span>
        </div>
        <div className="tp-mock-card-mid">
          <div className="tp-mock-chip-icon" />
          <div className="tp-mock-card-number">{cardNumber}</div>
        </div>
        <div className="tp-mock-card-bottom">
          <div>
            <div className="tp-mock-card-label">CARDHOLDER</div>
            <div className="tp-mock-card-user">{username}</div>
          </div>
          <div className="tp-mock-card-actions">
            <span>MONAD</span>
            <span>Copy</span>
            <span>NFC PAY</span>
          </div>
        </div>
      </div>

      <div className="tp-mock-nfc-bar">
        <div className="tp-mock-nfc-bar-left">
          <span className="tp-mock-nfc-dot" />
          <div>
            <div className="tp-mock-nfc-title">NFC Ready</div>
            <div className="tp-mock-nfc-sub">Tap to pay in stores</div>
          </div>
        </div>
        <Radio size={16} color="#22c55e" />
      </div>

      <div className="tp-mock-actions-row">
        <div className={`tp-mock-action tp-mock-action--send ${sendActive ? 'is-tapped' : ''}`}>
          <div className="tp-mock-action-icon">
            <ArrowUpRight size={16} />
          </div>
          <span className="tp-mock-action-title">Send Tap</span>
          <span className="tp-mock-action-sub">NFC pay</span>
        </div>
        <div className={`tp-mock-action tp-mock-action--receive ${receiveActive ? 'is-tapped' : ''}`}>
          <div className="tp-mock-action-icon">
            <ArrowDownLeft size={16} />
          </div>
          <span className="tp-mock-action-title">Receive Tap</span>
          <span className="tp-mock-action-sub">Get paid</span>
        </div>
      </div>

      <div className="tp-mock-direct">
        <div className="tp-mock-at">@</div>
        <div style={{ flex: 1 }}>
          <div className="tp-mock-direct-title">Direct Transfer</div>
          <div className="tp-mock-direct-sub">Pay @username or address</div>
        </div>
        <ChevronRight size={14} color="#a1a1aa" />
      </div>

      {showTransactions && (
        <div className="tp-mock-tx-section">
          <div className="tp-mock-tx-head">
            <span>Latest Transactions</span>
            <a href="#0">See All ›</a>
          </div>
          <div className="tp-mock-tx-item">
            <div className="tp-mock-tx-avatar">8</div>
            <div className="tp-mock-tx-meta">
              <div className="tp-mock-tx-line1">Sent to 0x804b2B…d474</div>
              <div className="tp-mock-tx-line2">Today at 10:26 pm</div>
              <span className="tp-mock-tx-badge">Paid with Tap</span>
            </div>
            <div className="tp-mock-tx-amt">- 3 MON</div>
          </div>
        </div>
      )}

      {footerTip && <p className="tp-mock-tip">{footerTip}</p>}
    </div>
  );
}

export type TapPayMockPayProps = {
  typedAmount: string;
  activeKey: string | null;
  availableBalance: string;
  addressShort: string;
  primaryLabel?: string;
  primaryTapped?: boolean;
  showClose?: boolean;
  compact?: boolean;
};

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export function TapPayMockPay({
  typedAmount,
  activeKey,
  availableBalance,
  addressShort,
  primaryLabel = 'Pay',
  primaryTapped,
  showClose = true,
  compact,
}: TapPayMockPayProps) {
  const display = typedAmount || '0';
  const gas = (parseFloat(display) || 0) * 0.000004 + 0.01;

  return (
    <div className={`tp-mock-pay ${compact ? 'tp-mock-compact' : ''}`}>
      <div className="tp-mock-pay-top">
        {showClose && (
          <div className="tp-mock-pay-close" aria-hidden>
            <X size={14} />
          </div>
        )}
        <div className="tp-mock-pay-account">
          <div className="tp-mock-pay-addr">{addressShort}</div>
          <div className="tp-mock-pay-bal">{availableBalance} MON available</div>
        </div>
      </div>

      <div className="tp-mock-pay-amount">
        <div className="tp-mock-pay-amount-val">{display}</div>
        <div className="tp-mock-pay-amount-meta">
          <span className="tp-mock-pay-mon">MON</span>
          <span className="tp-mock-pay-gas">Gas ~{gas.toFixed(4)}</span>
        </div>
      </div>

      <div className="tp-mock-keypad">
        {KEYPAD.map((key) => (
          <div
            key={key}
            className={`tp-mock-key ${activeKey === key ? 'is-active' : ''}`}
          >
            {key}
          </div>
        ))}
      </div>

      <div
        className={`tp-mock-pay-btn ${primaryLabel !== 'Pay' ? 'tp-mock-pay-btn--ready' : ''} ${
          primaryTapped ? 'is-tapped' : ''
        }`}
      >
        {primaryLabel}
      </div>
    </div>
  );
}

export type TapPayMockNfcSessionProps = {
  title: string;
  subtitle: string;
  peerName: string;
  peerAddr: string;
  peerLetter: string;
  statusLine: string;
  badge?: string;
};

export function TapPayMockNfcSession({
  title,
  subtitle,
  peerName,
  peerAddr,
  peerLetter,
  statusLine,
  badge = 'NFC BEAM ACTIVE',
}: TapPayMockNfcSessionProps) {
  return (
    <div className="tp-mock-nfc-session">
      <div className="tp-mock-nfc-badge">{badge}</div>
      <div className="tp-mock-radar">
        <div className="tp-mock-radar-ring" />
        <div className="tp-mock-radar-ring" />
        <div className="tp-mock-radar-ring" />
        <div className="tp-mock-radar-core">
          <Radio size={22} />
        </div>
      </div>
      <div className="tp-mock-nfc-title">{title}</div>
      <div className="tp-mock-nfc-sub">{subtitle}</div>
      <div className="tp-mock-peer-card">
        <div className="tp-mock-tx-avatar">{peerLetter}</div>
        <div className="tp-mock-tx-meta">
          <div className="tp-mock-tx-line1">{peerName}</div>
          <div className="tp-mock-tx-line2">{peerAddr}</div>
        </div>
      </div>
      <p className="tp-mock-tip" style={{ marginTop: 10 }}>{statusLine}</p>
    </div>
  );
}

export type TapPayMockSuccessProps = {
  amount: string;
  signed: '+' | '-';
  headline: string;
  subline: string;
  rows: { label: string; value: string }[];
};

export function TapPayMockSuccess({ amount, signed, headline, subline, rows }: TapPayMockSuccessProps) {
  return (
    <div className="tp-mock-success">
      <div className="tp-mock-success-check">
        <Check size={28} strokeWidth={3} />
      </div>
      <div className="tp-mock-pay-amount-val" style={{ fontSize: 28 }}>
        {signed}{amount} MON
      </div>
      <div className="tp-mock-nfc-title" style={{ marginTop: 8 }}>{headline}</div>
      <div className="tp-mock-nfc-sub">{subline}</div>
      <div className="tp-mock-peer-card" style={{ marginTop: 14, flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 10 }}>
            <span style={{ color: '#71717a' }}>{r.label}</span>
            <span style={{ fontWeight: 600 }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TapPayMockReceiveListen({ compact }: { compact?: boolean }) {
  return (
    <div className={`tp-mock-receive-wait ${compact ? 'tp-mock-compact' : ''}`}>
      <div className="tp-mock-header">
        <span className="tp-mock-brand">Receive Tap</span>
        <div className="tp-mock-nfc-dot" />
      </div>
      <div className="tp-mock-receive-box">
        <Radio size={28} color="#007aff" style={{ marginBottom: 8 }} />
        <div className="tp-mock-nfc-title">HCE listening</div>
        <div className="tp-mock-nfc-sub">Waiting for sender phone…</div>
        <div className="tp-mock-tip" style={{ marginTop: 10 }}>ISO-DEP · Android NFC reader</div>
      </div>
    </div>
  );
}

export function TapPayMockHistory({
  highlightFirstRow,
  compact,
}: {
  highlightFirstRow?: boolean;
  compact?: boolean;
}) {
  const rows = [
    { to: '0x804b2B…d474', time: 'Today at 10:26 pm', amt: '-3 MON' },
    { to: '0x9a2c1F…a891', time: 'Today at 9:14 pm', amt: '-0.5 MON' },
  ];

  return (
    <div className={`tp-mock-history ${compact ? 'tp-mock-compact' : ''}`}>
      <div className="tp-mock-history-top">
        <div className="tp-mock-history-user">
          <div className="tp-mock-avatar">A</div>
          <div>
            <div className="tp-mock-history-handle">@anurag</div>
            <div className="tp-mock-history-addr">0x1a70…1A4E</div>
          </div>
        </div>
        <div className="tp-mock-history-monad">
          <span className="tp-mock-nfc-dot" />
          Monad
        </div>
      </div>

      <div className="tp-mock-history-title-row">
        <h3>Transactions <span className="tp-mock-count">2</span></h3>
        <p>Your recent activity</p>
      </div>

      <div className="tp-mock-search">
        <Search size={14} />
        <span>Search transactions</span>
      </div>

      <div className="tp-mock-segments">
        <span className="is-active">All <em>2</em></span>
        <span>Sent <em>2</em></span>
        <span>Received <em>0</em></span>
      </div>

      <div className="tp-mock-history-section-head">
        <span>Latest activity</span>
        <button type="button" className="tp-mock-refresh">
          <RotateCcw size={12} />
          Refresh
        </button>
      </div>

      <div className="tp-mock-history-list">
        {rows.map((row, i) => (
          <div
            key={row.to}
            className={`tp-mock-history-row ${highlightFirstRow && i === 0 ? 'is-tapped' : ''}`}
          >
            <div className="tp-mock-history-row-icon">
              <ArrowUpRight size={14} />
            </div>
            <div className="tp-mock-history-row-body">
              <div className="tp-mock-history-row-title">Sent to {row.to}</div>
              <div className="tp-mock-history-row-meta">
                {row.time} · <span className="tp-mock-confirmed">Confirmed</span>
              </div>
            </div>
            <div className="tp-mock-history-row-amt">{row.amt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TapPayMockSettings({ compact }: { compact?: boolean }) {
  return (
    <div className={`tp-mock-settings ${compact ? 'tp-mock-compact' : ''}`}>
      <div className="tp-mock-settings-kicker">TAPPAY</div>
      <h3 className="tp-mock-settings-title">Settings</h3>

      <div className="tp-mock-settings-profile">
        <div className="tp-mock-settings-profile-top">
          <div className="tp-mock-settings-profile-avatar">A</div>
          <div>
            <div className="tp-mock-settings-profile-name">@anurag</div>
            <div className="tp-mock-settings-profile-sub">Your wallet and identity</div>
          </div>
        </div>
        <div className="tp-mock-settings-wallet-row">
          <div>
            <div className="tp-mock-card-label">Wallet address</div>
            <div className="tp-mock-settings-wallet-addr">0x1a70dd…6d1A4E</div>
          </div>
          <span className="tp-mock-copy-pill">Copy</span>
        </div>
      </div>

      <div className="tp-mock-network-card">
        <span className="tp-mock-nfc-dot" />
        <div style={{ flex: 1 }}>
          <div className="tp-mock-network-name">Monad Mainnet</div>
          <div className="tp-mock-network-sub">Chain ID 143 · ~1s Finality</div>
        </div>
        <span className="tp-mock-active-pill">Active</span>
      </div>

      <div className="tp-mock-settings-group-label">Account</div>
      <div className="tp-mock-settings-list">
        <div className="tp-mock-settings-row">
          <User size={15} color="#007aff" />
          <span>Profile &amp; Identity</span>
          <em>@anurag</em>
          <ChevronRight size={14} />
        </div>
        <div className="tp-mock-settings-row">
          <CreditCard size={15} color="#007aff" />
          <span>Wallet Address</span>
          <em>0x1a70…1A4E</em>
          <ChevronRight size={14} />
        </div>
        <div className="tp-mock-settings-row">
          <Key size={15} color="#007aff" />
          <span>Secret Key</span>
          <em>Encrypted</em>
          <ChevronRight size={14} />
        </div>
      </div>

      <div className="tp-mock-settings-group-label">Network &amp; System</div>
      <div className="tp-mock-settings-list">
        <div className="tp-mock-settings-row">
          <Globe size={15} color="#007aff" />
          <span>Network Details</span>
          <em>RPC Live</em>
          <ChevronRight size={14} />
        </div>
        <div className="tp-mock-settings-row">
          <Info size={15} color="#007aff" />
          <span>About TapPay</span>
          <em>v0.0.1</em>
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
}

export function TapPayMockTxDetail({ compact }: { compact?: boolean }) {
  return (
    <div className={`tp-mock-tx-detail ${compact ? 'tp-mock-compact' : ''}`}>
      <div className="tp-mock-tx-detail-head">
        <ArrowLeft size={16} />
        <span>Transaction</span>
      </div>
      <div className="tp-mock-tx-detail-hero">
        <div className="tp-mock-history-row-icon">
          <ArrowUpRight size={16} />
        </div>
        <div className="tp-mock-tx-detail-amt">-12.5 MON</div>
        <div className="tp-mock-tx-detail-sub">Paid @misbah · NFC Tap</div>
        <span className="tp-mock-confirmed-pill">Confirmed on Monad</span>
      </div>
      <div className="tp-mock-tx-detail-meta">
        <div><span>To</span><strong>@misbah</strong></div>
        <div><span>Type</span><strong>NFC Tap-to-Pay</strong></div>
        <div><span>Finality</span><strong>~0.8s</strong></div>
        <div><span>Tx</span><strong>0x5B17…6838</strong></div>
      </div>
    </div>
  );
}

export function TapPayMockTabBar({ active = 'home' }: { active?: 'home' | 'pay' | 'history' | 'settings' }) {
  const items = [
    { id: 'home' as const, label: 'Home', icon: <Home size={16} /> },
    { id: 'pay' as const, label: 'Pay', icon: <Wallet size={16} /> },
    { id: 'history' as const, label: 'History', icon: <Clock size={16} /> },
    { id: 'settings' as const, label: 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="tp-mock-bottom-nav">
      {items.map((item) => (
        <div
          key={item.id}
          className={`tp-mock-nav-item ${active === item.id ? 'is-active' : ''}`}
        >
          <div className="tp-mock-nav-icon">{item.icon}</div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
