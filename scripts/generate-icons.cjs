/* Gera ícones PNG da Gestor J2 sem dependências externas.
   Encoder PNG puro (RGBA) + rasterização do raio (Zap) com anti-aliasing 3x3.
   Rode com: node scripts/generate-icons.cjs [pasta-publica] */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Polígono do raio (Zap do lucide), em coordenadas 0..24
const BOLT = [[13, 2], [4, 13.5], [11, 13.5], [10, 22], [20, 9.5], [13, 9.5]];
const BX0 = 4, BY0 = 2, BW = 16, BH = 20;

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function makeIcon(size, { bg, bolt }) {
  const rgba = Buffer.alloc(size * size * 4);
  const scale = (size * 0.52) / BH;
  const offX = size / 2 - (BW * scale) / 2;
  const offY = size / 2 - (BH * scale) / 2;
  const poly = BOLT.map(([px, py]) => [offX + (px - BX0) * scale, offY + (py - BY0) * scale]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // anti-aliasing 3x3
      let cover = 0;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          if (pointInPoly(x + (sx + 0.5) / 3, y + (sy + 0.5) / 3, poly)) cover++;
        }
      }
      const f = cover / 9;
      const i = (y * size + x) * 4;
      if (bg) {
        // bolt branco sobre fundo colorido
        rgba[i] = Math.round(bg[0] * (1 - f) + bolt[0] * f);
        rgba[i + 1] = Math.round(bg[1] * (1 - f) + bolt[1] * f);
        rgba[i + 2] = Math.round(bg[2] * (1 - f) + bolt[2] * f);
        rgba[i + 3] = 255;
      } else {
        // badge: raio branco sobre transparente (Android tinge de qualquer cor)
        rgba[i] = bolt[0];
        rgba[i + 1] = bolt[1];
        rgba[i + 2] = bolt[2];
        rgba[i + 3] = Math.round(255 * f);
      }
    }
  }
  return encodePNG(size, rgba);
}

const defaultPublic = fs.existsSync(path.join(__dirname, '..', 'frontend-vue'))
  ? path.join(__dirname, '..', 'frontend-vue', 'public')
  : path.join(__dirname, '..', 'public');
const PUBLIC = process.argv[2] ? path.resolve(process.argv[2]) : defaultPublic;
fs.mkdirSync(PUBLIC, { recursive: true });
const PURPLE = [124, 58, 237]; // #7c3aed
const WHITE = [255, 255, 255];

const outputs = [
  ['icon-192.png', makeIcon(192, { bg: PURPLE, bolt: WHITE })],
  ['icon-512.png', makeIcon(512, { bg: PURPLE, bolt: WHITE })],
  ['icon-maskable-512.png', makeIcon(512, { bg: PURPLE, bolt: WHITE })],
  ['badge-96.png', makeIcon(96, { bg: null, bolt: WHITE })],
  ['apple-touch-icon.png', makeIcon(180, { bg: PURPLE, bolt: WHITE })],
];

for (const [name, buf] of outputs) {
  fs.writeFileSync(path.join(PUBLIC, name), buf);
  console.log(`✓ ${name} (${buf.length} bytes)`);
}
console.log(`Ícones gerados em ${PUBLIC}`);
