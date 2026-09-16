const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const rowSize = width * 4;
  const scanlines = Buffer.alloc(height * (1 + rowSize));

  for (let y = 0; y < height; y++) {
    const scanOffset = y * (1 + rowSize);
    scanlines[scanOffset] = 0; // filter None
    rgbaBuffer.copy(scanlines, scanOffset + 1, y * rowSize, (y + 1) * rowSize);
  }

  const idatData = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Distance from point (px, py) to line segment (ax, ay)-(bx, by)
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Distance from point to quadratic bezier
function distToBezier(px, py, p0x, p0y, p1x, p1y, p2x, p2y) {
  let minD = 1e9;
  const steps = 24;
  let prevX = p0x;
  let prevY = p0y;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const invT = 1 - t;
    const curX = invT * invT * p0x + 2 * invT * t * p1x + t * t * p2x;
    const curY = invT * invT * p0y + 2 * invT * t * p1y + t * t * p2y;
    const d = distToSegment(px, py, prevX, prevY, curX, curY);
    if (d < minD) minD = d;
    prevX = curX;
    prevY = curY;
  }
  return minD;
}

// Render icon
function renderTapPayIcon(size, isRound = false) {
  const buf = Buffer.alloc(size * size * 4);
  const center = size / 2;

  // Squircle or Circle mask parameters
  const cornerRadius = size * 0.22; // For squircle
  const circleRadius = (size / 2) - 1;

  // Geometry scaled to size (padding ~18%)
  const pad = size * 0.18;
  const innerSize = size - 2 * pad;
  const s = innerSize;

  // In local coords [0..s]
  const topX = pad + s * 0.34;
  const topY = pad + s * 0.26;
  const topR = s * 0.18;

  const botX = pad + s * 0.66;
  const botY = pad + s * 0.74;
  const botR = s * 0.18;

  // Satellite node
  const satX = pad + s * 0.77;
  const satY = pad + s * 0.31;
  const satR = s * 0.125;

  // Bezier bridge connecting top to bot with organic curve
  const bridgeCtrlX = pad + s * 0.60;
  const bridgeCtrlY = pad + s * 0.40;
  const bridgeHalfWidth = s * 0.085;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Check clipping boundary
      let inBounds = false;
      let borderAA = 1.0;

      if (isRound) {
        const dFromCenter = Math.hypot(x + 0.5 - center, y + 0.5 - center);
        if (dFromCenter <= circleRadius - 0.5) {
          inBounds = true;
          borderAA = 1.0;
        } else if (dFromCenter < circleRadius + 0.5) {
          inBounds = true;
          borderAA = Math.max(0, Math.min(1, circleRadius + 0.5 - dFromCenter));
        }
      } else {
        // Squircle / rounded rect
        const dx = Math.max(0, Math.abs(x + 0.5 - center) - (center - cornerRadius));
        const dy = Math.max(0, Math.abs(y + 0.5 - center) - (center - cornerRadius));
        const dCorner = Math.hypot(dx, dy);
        if (dCorner <= cornerRadius - 0.5) {
          inBounds = true;
          borderAA = 1.0;
        } else if (dCorner < cornerRadius + 0.5) {
          inBounds = true;
          borderAA = Math.max(0, Math.min(1, cornerRadius + 0.5 - dCorner));
        }
      }

      if (!inBounds || borderAA <= 0) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Base background color: Deep Obsidian (#0A0A0E)
      let r = 10;
      let g = 10;
      let b = 14;
      let a = Math.round(borderAA * 255);

      // Add subtle rim lighting / glass edge
      const px = x + 0.5;
      const py = y + 0.5;

      // Distance to top circle
      const dTop = Math.hypot(px - topX, py - topY) - topR;
      // Distance to bottom circle
      const dBot = Math.hypot(px - botX, py - botY) - botR;
      // Distance to curved bridge
      const dBridge = distToBezier(px, py, topX, topY, bridgeCtrlX, bridgeCtrlY, botX, botY) - bridgeHalfWidth;
      // Distance to satellite circle
      const dSat = Math.hypot(px - satX, py - satY) - satR;

      // Combined main glyph distance
      const dMainGlyph = Math.min(dTop, dBot, dBridge);

      // Anti-aliased blend of main glyph (white #FFFFFF)
      if (dMainGlyph <= 0.5) {
        const factor = dMainGlyph <= -0.5 ? 1.0 : (0.5 - dMainGlyph);
        r = Math.round(r * (1 - factor) + 255 * factor);
        g = Math.round(g * (1 - factor) + 255 * factor);
        b = Math.round(b * (1 - factor) + 255 * factor);
      }

      // Anti-aliased blend of satellite node (slightly glowing white #FFFFFF, 90% opacity)
      if (dSat <= 0.5) {
        const factor = (dSat <= -0.5 ? 1.0 : (0.5 - dSat)) * 0.92;
        r = Math.round(r * (1 - factor) + 255 * factor);
        g = Math.round(g * (1 - factor) + 255 * factor);
        b = Math.round(b * (1 - factor) + 255 * factor);
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  return encodePNG(size, size, buf);
}

// File targets
const targets = [
  { path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png', size: 48, round: false },
  { path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png', size: 48, round: true },
  { path: 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png', size: 72, round: false },
  { path: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png', size: 72, round: true },
  { path: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png', size: 96, round: false },
  { path: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png', size: 96, round: true },
  { path: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png', size: 144, round: false },
  { path: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png', size: 144, round: true },
  { path: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', size: 192, round: false },
  { path: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png', size: 192, round: true },
  { path: 'src/assets/tappay_logo.png', size: 512, round: false },
];

console.log('Generating TapPay launcher icons...');
targets.forEach(t => {
  const fullPath = path.resolve(t.path);
  const png = renderTapPayIcon(t.size, t.round);
  fs.writeFileSync(fullPath, png);
  console.log(`✓ Wrote ${t.size}x${t.size} (${t.round ? 'round' : 'squircle'}) to ${t.path} (${png.length} bytes)`);
});
console.log('All icons generated successfully!');
