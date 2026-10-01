import React from 'react';

const ITEMS = [
  'NFC TAP PAY',
  'MONAD MAINNET',
  'SUB-SECOND FINALITY',
  'NON-CUSTODIAL',
  'ANDROID HCE',
  'PHONE TO PHONE',
  'NO QR CODES',
];

export function BrandMarquee() {
  const track = [...ITEMS, ...ITEMS, ...ITEMS];

  return (
    <div className="brand-marquee-band" aria-hidden>
      <div className="brand-marquee-fade brand-marquee-fade-left" />
      <div className="brand-marquee-fade brand-marquee-fade-right" />
      <div className="brand-marquee-track">
        {track.map((item, i) => (
          <span key={`${item}-${i}`} className="brand-marquee-item">
            {item}
            <span className="brand-marquee-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
