const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(width, height, isMaskable = false) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with 1 byte filter (0) per row
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = (Math.min(width, height) / 2) * (isMaskable ? 0.72 : 0.88);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Distance from center
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Deep Marsil Blue (#1e3a8a to #2563eb)
      const grad = y / height;
      let r = Math.round(30 + grad * 7); // ~37
      let g = Math.round(58 + grad * 41); // ~99
      let b = Math.round(138 + grad * 97); // ~235
      let a = 255;

      // Rounded container or full background
      if (!isMaskable) {
        // App icon rounded rectangle background
        const cornerR = width * 0.22;
        const qx = Math.max(Math.abs(dx) - (cx - cornerR), 0);
        const qy = Math.max(Math.abs(dy) - (cy - cornerR), 0);
        const cornerDist = Math.sqrt(qx * qx + qy * qy);
        if (cornerDist > cornerR) {
          a = 0; // transparent outside rounded squircle
        }
      }

      if (a > 0) {
        // Draw warehouse / stock box icon in white / light cyan
        // Inner logo box:
        const boxSize = radius * 0.75;
        const inBoxX = Math.abs(dx) <= boxSize;
        const inBoxY = dy >= -boxSize * 0.7 && dy <= boxSize * 0.85;

        // Top chevron/roof or box lid
        const roofDy = dy - (-boxSize * 0.4);
        const isRoof = Math.abs(roofDy - (Math.abs(dx) * 0.35)) < (width * 0.045) && Math.abs(dx) <= boxSize * 0.95;

        // Center cube / 'M' shape
        const isMLeft = Math.abs(dx - (-boxSize * 0.55)) < (width * 0.04) && (dy >= -boxSize * 0.2 && dy <= boxSize * 0.65);
        const isMRight = Math.abs(dx - (boxSize * 0.55)) < (width * 0.04) && (dy >= -boxSize * 0.2 && dy <= boxSize * 0.65);
        const isMCenterL = Math.abs((dy - boxSize * 0.2) - (dx * 0.8)) < (width * 0.035) && dx >= -boxSize * 0.55 && dx <= 0;
        const isMCenterR = Math.abs((dy - boxSize * 0.2) - (-dx * 0.8)) < (width * 0.035) && dx >= 0 && dx <= boxSize * 0.55;

        // Base box outline
        const isBaseLine = Math.abs(dy - (boxSize * 0.65)) < (width * 0.035) && Math.abs(dx) <= boxSize * 0.6;

        if (isRoof || isMLeft || isMRight || isMCenterL || isMCenterR || isBaseLine) {
          // Crisp bright white logo (#ffffff)
          r = 255;
          g = 255;
          b = 255;
        } else if (dist < radius * 0.95 && !isMaskable) {
          // Subtle inner glow
          const glow = Math.max(0, 1 - dist / radius);
          r = Math.min(255, Math.round(r + glow * 25));
          g = Math.min(255, Math.round(g + glow * 35));
          b = Math.min(255, Math.round(b + glow * 20));
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
console.log('Generating 192x192 icon...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));

console.log('Generating 512x512 icon...');
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));

console.log('Generating 512x512 maskable icon...');
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));

console.log('Generating Apple Touch Icon 180x180...');
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));

// Generate SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="marsilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#marsilGrad)"/>
  <g filter="url(#shadow)">
    <!-- Roof / Box lid -->
    <path d="M120 180 L256 120 L392 180 L256 240 Z" fill="#ffffff" fill-opacity="0.95"/>
    <path d="M120 180 L256 240 L256 360 L120 300 Z" fill="#e0e7ff"/>
    <path d="M392 180 L256 240 L256 360 L392 300 Z" fill="#cbd5e1"/>
    <!-- M Emblem on front -->
    <path d="M165 240 L195 240 L220 280 L245 240 L275 240 L275 320 L250 320 L250 270 L230 305 L210 305 L190 270 L190 320 L165 320 Z" fill="#1e3a8a"/>
  </g>
  <text x="256" y="440" font-family="Inter, system-ui, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">MARSIL</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(48, 48, false));

console.log('All icons generated successfully in /public!');
