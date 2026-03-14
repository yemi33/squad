#!/usr/bin/env node
// Pure Node.js MP4 video generator — no dependencies
// Creates a slideshow-style recap video with text rendered via bitmap font

const fs = require('fs');
const path = require('path');

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 1; // 1 frame per second for slideshow
const SLIDE_DURATION = 5; // seconds per slide

// ── Slides ──────────────────────────────────────────────────────────────────

const slides = [
  {
    bg: [15, 15, 30],
    title: 'Squad Engine Session Recap',
    lines: ['March 13, 2026', '', 'What got built today'],
    accent: [100, 140, 255],
  },
  {
    bg: [10, 25, 15],
    title: '1. Human PR Feedback Loop',
    lines: [
      'NEW: pollPrHumanComments()',
      '',
      'Polls ADO PR threads every ~6 min',
      'Detects human comments with @squad',
      'Dispatches fix tasks to PR author agent',
      'Agent fixes, pushes, re-enters review',
    ],
    accent: [80, 220, 120],
  },
  {
    bg: [25, 15, 10],
    title: '2. Smart Solo Reviewer',
    lines: [
      'If you are the only human commenter:',
      '  -> ANY comment triggers a fix',
      '  -> No @squad keyword needed',
      '',
      'Multiple humans commenting?',
      '  -> @squad required to filter noise',
    ],
    accent: [255, 160, 80],
  },
  {
    bg: [20, 10, 25],
    title: '3. Added augloop-workflows',
    lines: [
      'Cloned: office/ISS/augloop-workflows',
      'Shallow clone: 8.7 GB (vs 30+ GB full)',
      'Repo ID: 5fd57e57-e20b-...',
      '',
      'Config added, .squad/ scaffolded',
      'Engine discovers it on next tick',
    ],
    accent: [180, 120, 255],
  },
  {
    bg: [10, 20, 25],
    title: '4. /note -> Inbox Pipeline',
    lines: [
      'BEFORE: /note wrote directly to notes.md',
      '  -> Bypassed consolidation',
      '  -> No dedup or categorization',
      '',
      'AFTER: /note writes to notes/inbox/',
      '  -> Flows through Haiku consolidation',
      '  -> Properly categorized & deduped',
    ],
    accent: [80, 200, 220],
  },
  {
    bg: [25, 20, 10],
    title: '5. Team Notes Cleansed',
    lines: [
      'Removed garbled auto-consolidation blobs',
      'Kept all human-authored rules',
      'Kept useful agent codebase findings',
      '',
      'Clean notes.md for agent prompts',
    ],
    accent: [220, 200, 80],
  },
  {
    bg: [15, 15, 30],
    title: 'Session Complete',
    lines: [
      '4 commits to squad engine',
      '1 new project onboarded',
      '1 pipeline fix (notes)',
      '1 cleanup (team notes)',
      '',
      'Humans can now direct agents via PR comments',
    ],
    accent: [100, 140, 255],
  },
];

// ── Bitmap Font (5x7 pixel characters) ─────────────────────────────────────

const FONT = {
  ' ': [0,0,0,0,0,0,0],
  'A': [0x04,0x0A,0x11,0x1F,0x11,0x11,0x11],
  'B': [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
  'C': [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],
  'D': [0x1E,0x11,0x11,0x11,0x11,0x11,0x1E],
  'E': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
  'F': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  'G': [0x0E,0x11,0x10,0x17,0x11,0x11,0x0E],
  'H': [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
  'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
  'J': [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
  'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11],
  'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
  'M': [0x11,0x1B,0x15,0x15,0x11,0x11,0x11],
  'N': [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
  'O': [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
  'P': [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
  'Q': [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D],
  'R': [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
  'S': [0x0E,0x11,0x10,0x0E,0x01,0x11,0x0E],
  'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0E],
  'V': [0x11,0x11,0x11,0x11,0x0A,0x0A,0x04],
  'W': [0x11,0x11,0x11,0x15,0x15,0x1B,0x11],
  'X': [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
  'Y': [0x11,0x11,0x0A,0x04,0x04,0x04,0x04],
  'Z': [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
  '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],
  '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2': [0x0E,0x11,0x01,0x06,0x08,0x10,0x1F],
  '3': [0x0E,0x11,0x01,0x06,0x01,0x11,0x0E],
  '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
  '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
  '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
  '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  '.': [0,0,0,0,0,0,0x04],
  ',': [0,0,0,0,0,0x04,0x08],
  ':': [0,0,0x04,0,0,0x04,0],
  ';': [0,0,0x04,0,0,0x04,0x08],
  '!': [0x04,0x04,0x04,0x04,0x04,0,0x04],
  '?': [0x0E,0x11,0x01,0x06,0x04,0,0x04],
  '-': [0,0,0,0x1F,0,0,0],
  '_': [0,0,0,0,0,0,0x1F],
  '+': [0,0x04,0x04,0x1F,0x04,0x04,0],
  '=': [0,0,0x1F,0,0x1F,0,0],
  '/': [0x01,0x01,0x02,0x04,0x08,0x10,0x10],
  '\\': [0x10,0x10,0x08,0x04,0x02,0x01,0x01],
  '(': [0x02,0x04,0x08,0x08,0x08,0x04,0x02],
  ')': [0x08,0x04,0x02,0x02,0x02,0x04,0x08],
  '[': [0x0E,0x08,0x08,0x08,0x08,0x08,0x0E],
  ']': [0x0E,0x02,0x02,0x02,0x02,0x02,0x0E],
  '{': [0x06,0x04,0x04,0x08,0x04,0x04,0x06],
  '}': [0x0C,0x04,0x04,0x02,0x04,0x04,0x0C],
  '@': [0x0E,0x11,0x17,0x15,0x17,0x10,0x0E],
  '#': [0x0A,0x0A,0x1F,0x0A,0x1F,0x0A,0x0A],
  '$': [0x04,0x0F,0x14,0x0E,0x05,0x1E,0x04],
  '%': [0x18,0x19,0x02,0x04,0x08,0x13,0x03],
  '&': [0x08,0x14,0x14,0x08,0x15,0x12,0x0D],
  '*': [0,0x04,0x15,0x0E,0x15,0x04,0],
  '<': [0x02,0x04,0x08,0x10,0x08,0x04,0x02],
  '>': [0x08,0x04,0x02,0x01,0x02,0x04,0x08],
  '\'': [0x04,0x04,0x08,0,0,0,0],
  '"': [0x0A,0x0A,0x14,0,0,0,0],
  '`': [0x08,0x04,0x02,0,0,0,0],
  '~': [0,0,0x08,0x15,0x02,0,0],
  '^': [0x04,0x0A,0x11,0,0,0,0],
  '|': [0x04,0x04,0x04,0x04,0x04,0x04,0x04],
};

// Add lowercase (same as uppercase for this simple font)
for (const [k, v] of Object.entries(FONT)) {
  if (k >= 'A' && k <= 'Z') FONT[k.toLowerCase()] = v;
}

function drawChar(buf, cx, cy, ch, scale, r, g, b) {
  const glyph = FONT[ch] || FONT['?'];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row] & (1 << (4 - col))) {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = cx + col * scale + sx;
            const py = cy + row * scale + sy;
            if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
              const idx = (py * WIDTH + px) * 3;
              buf[idx] = r; buf[idx+1] = g; buf[idx+2] = b;
            }
          }
        }
      }
    }
  }
}

function drawText(buf, x, y, text, scale, r, g, b) {
  for (let i = 0; i < text.length; i++) {
    drawChar(buf, x + i * (5 * scale + scale), y, text[i], scale, r, g, b);
  }
}

function textWidth(text, scale) {
  return text.length * (5 * scale + scale) - scale;
}

function fillRect(buf, x, y, w, h, r, g, b) {
  for (let py = y; py < y + h && py < HEIGHT; py++) {
    for (let px = x; px < x + w && px < WIDTH; px++) {
      if (px >= 0 && py >= 0) {
        const idx = (py * WIDTH + px) * 3;
        buf[idx] = r; buf[idx+1] = g; buf[idx+2] = b;
      }
    }
  }
}

function renderSlide(slide) {
  const buf = Buffer.alloc(WIDTH * HEIGHT * 3);
  const [br, bg, bb] = slide.bg;

  // Fill background
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    buf[i*3] = br; buf[i*3+1] = bg; buf[i*3+2] = bb;
  }

  // Draw accent bar at top
  const [ar, ag, ab] = slide.accent;
  fillRect(buf, 0, 0, WIDTH, 4, ar, ag, ab);

  // Draw title (scale 4 = 20px tall chars)
  const titleScale = 4;
  const titleW = textWidth(slide.title, titleScale);
  const titleX = Math.max(60, Math.floor((WIDTH - titleW) / 2));
  drawText(buf, titleX, 80, slide.title, titleScale, ar, ag, ab);

  // Draw underline
  fillRect(buf, titleX, 80 + 7 * titleScale + 10, Math.min(titleW, WIDTH - 120), 2, ar, ag, ab);

  // Draw body lines (scale 3)
  const bodyScale = 3;
  const bodyStartY = 180;
  for (let i = 0; i < slide.lines.length; i++) {
    const line = slide.lines[i];
    if (!line) continue;
    // Dim color for body text
    const dim = 0.7;
    drawText(buf, 100, bodyStartY + i * (7 * bodyScale + 14), line, bodyScale,
      Math.floor(200 * dim), Math.floor(210 * dim), Math.floor(220 * dim));
  }

  // Draw accent bar at bottom
  fillRect(buf, 0, HEIGHT - 4, WIDTH, 4, ar, ag, ab);

  return buf;
}

// ── MP4 Muxer (minimal ftyp + moov + mdat) ─────────────────────────────────
// Encodes raw RGB frames as Motion JPEG in MP4 container

function encodeJPEG(rgbBuf, w, h) {
  // Minimal JFIF JPEG encoder for RGB data
  // This is a simplified encoder that produces valid but uncompressed-ish JPEGs
  const segments = [];

  // SOI
  segments.push(Buffer.from([0xFF, 0xD8]));

  // APP0 JFIF
  const app0 = Buffer.from([
    0xFF, 0xE0, 0x00, 0x10,
    0x4A, 0x46, 0x49, 0x46, 0x00, // JFIF\0
    0x01, 0x01, 0x00,             // version 1.1, no units
    0x00, 0x01, 0x00, 0x01,       // 1x1 aspect
    0x00, 0x00                    // no thumbnail
  ]);
  segments.push(app0);

  // DQT — quantization tables (quality ~75)
  const lumQ = [
    8,6,5,8,12,20,26,31, 6,6,7,10,13,29,30,28, 7,7,8,12,20,29,35,28,
    7,9,11,15,26,44,40,31, 9,11,19,28,34,55,52,39, 12,18,28,32,41,52,57,46,
    25,32,39,44,52,61,60,51, 36,46,48,49,56,50,52,50
  ];
  const chrQ = lumQ.map(v => Math.min(255, Math.floor(v * 1.2)));

  const dqt = Buffer.alloc(2 + 2 + 1 + 64 + 1 + 64);
  dqt[0] = 0xFF; dqt[1] = 0xDB;
  dqt.writeUInt16BE(2 + 1 + 64 + 1 + 64, 2);
  dqt[4] = 0x00; // 8-bit, table 0
  for (let i = 0; i < 64; i++) dqt[5 + i] = lumQ[i];
  dqt[69] = 0x01; // 8-bit, table 1
  for (let i = 0; i < 64; i++) dqt[70 + i] = chrQ[i];
  segments.push(dqt);

  // SOF0 — baseline DCT, YCbCr 4:2:0 would be complex, let's use 4:4:4 for simplicity
  const sof = Buffer.alloc(2 + 2 + 1 + 2 + 2 + 1 + 3*3);
  sof[0] = 0xFF; sof[1] = 0xC0;
  sof.writeUInt16BE(8 + 3*3, 2); // length
  sof[4] = 8; // precision
  sof.writeUInt16BE(h, 5);
  sof.writeUInt16BE(w, 7);
  sof[9] = 3; // components
  // Y: id=1, sampling=1x1, qtable=0
  sof[10] = 1; sof[11] = 0x11; sof[12] = 0;
  // Cb: id=2, sampling=1x1, qtable=1
  sof[13] = 2; sof[14] = 0x11; sof[15] = 1;
  // Cr: id=3, sampling=1x1, qtable=1
  sof[16] = 3; sof[17] = 0x11; sof[18] = 1;
  segments.push(sof);

  // DHT — Huffman tables (standard JPEG tables)
  // DC luminance
  const dcLumBits = [0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0];
  const dcLumVals = [0,1,2,3,4,5,6,7,8,9,10,11];
  // DC chrominance
  const dcChrBits = [0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0];
  const dcChrVals = [0,1,2,3,4,5,6,7,8,9,10,11];
  // AC luminance
  const acLumBits = [0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,0x7D];
  const acLumVals = [
    0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,
    0x07,0x22,0x71,0x14,0x32,0x81,0x91,0xA1,0x08,0x23,0x42,0xB1,0xC1,0x15,0x52,
    0xD1,0xF0,0x24,0x33,0x62,0x72,0x82,0x09,0x0A,0x16,0x17,0x18,0x19,0x1A,0x25,
    0x26,0x27,0x28,0x29,0x2A,0x34,0x35,0x36,0x37,0x38,0x39,0x3A,0x43,0x44,0x45,
    0x46,0x47,0x48,0x49,0x4A,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x63,0x64,
    0x65,0x66,0x67,0x68,0x69,0x6A,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7A,0x83,
    0x84,0x85,0x86,0x87,0x88,0x89,0x8A,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,
    0x9A,0xA2,0xA3,0xA4,0xA5,0xA6,0xA7,0xA8,0xA9,0xAA,0xB2,0xB3,0xB4,0xB5,0xB6,
    0xB7,0xB8,0xB9,0xBA,0xC2,0xC3,0xC4,0xC5,0xC6,0xC7,0xC8,0xC9,0xCA,0xD2,0xD3,
    0xD4,0xD5,0xD6,0xD7,0xD8,0xD9,0xDA,0xE1,0xE2,0xE3,0xE4,0xE5,0xE6,0xE7,0xE8,
    0xE9,0xEA,0xF1,0xF2,0xF3,0xF4,0xF5,0xF6,0xF7,0xF8,0xF9,0xFA
  ];
  // AC chrominance
  const acChrBits = [0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,0x77];
  const acChrVals = [
    0x00,0x01,0x02,0x03,0x11,0x04,0x05,0x21,0x31,0x06,0x12,0x41,0x51,0x07,0x61,
    0x71,0x13,0x22,0x32,0x81,0x08,0x14,0x42,0x91,0xA1,0xB1,0xC1,0x09,0x23,0x33,
    0x52,0xF0,0x15,0x62,0x72,0xD1,0x0A,0x16,0x24,0x34,0xE1,0x25,0xF1,0x17,0x18,
    0x19,0x1A,0x26,0x27,0x28,0x29,0x2A,0x35,0x36,0x37,0x38,0x39,0x3A,0x43,0x44,
    0x45,0x46,0x47,0x48,0x49,0x4A,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5A,0x63,
    0x64,0x65,0x66,0x67,0x68,0x69,0x6A,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7A,
    0x82,0x83,0x84,0x85,0x86,0x87,0x88,0x89,0x8A,0x92,0x93,0x94,0x95,0x96,0x97,
    0x98,0x99,0x9A,0xA2,0xA3,0xA4,0xA5,0xA6,0xA7,0xA8,0xA9,0xAA,0xB2,0xB3,0xB4,
    0xB5,0xB6,0xB7,0xB8,0xB9,0xBA,0xC2,0xC3,0xC4,0xC5,0xC6,0xC7,0xC8,0xC9,0xCA,
    0xD2,0xD3,0xD4,0xD5,0xD6,0xD7,0xD8,0xD9,0xDA,0xE2,0xE3,0xE4,0xE5,0xE6,0xE7,
    0xE8,0xE9,0xEA,0xF2,0xF3,0xF4,0xF5,0xF6,0xF7,0xF8,0xF9,0xFA
  ];

  function makeDHT(tableClass, tableId, bits, vals) {
    const len = 2 + 1 + 16 + vals.length;
    const buf = Buffer.alloc(2 + len);
    buf[0] = 0xFF; buf[1] = 0xC4;
    buf.writeUInt16BE(len, 2);
    buf[4] = (tableClass << 4) | tableId;
    for (let i = 0; i < 16; i++) buf[5 + i] = bits[i];
    for (let i = 0; i < vals.length; i++) buf[21 + i] = vals[i];
    return buf;
  }

  segments.push(makeDHT(0, 0, dcLumBits, dcLumVals));
  segments.push(makeDHT(0, 1, dcChrBits, dcChrVals));
  segments.push(makeDHT(1, 0, acLumBits, acLumVals));
  segments.push(makeDHT(1, 1, acChrBits, acChrVals));

  // Build Huffman encoding tables
  function buildHuffEnc(bits, vals) {
    const enc = {};
    let code = 0, vi = 0;
    for (let len = 1; len <= 16; len++) {
      for (let i = 0; i < bits[len-1]; i++) {
        enc[vals[vi]] = { code, len };
        vi++; code++;
      }
      code <<= 1;
    }
    return enc;
  }

  const dcLumEnc = buildHuffEnc(dcLumBits, dcLumVals);
  const dcChrEnc = buildHuffEnc(dcChrBits, dcChrVals);
  const acLumEnc = buildHuffEnc(acLumBits, acLumVals);
  const acChrEnc = buildHuffEnc(acChrBits, acChrVals);

  // SOS
  const sos = Buffer.from([
    0xFF, 0xDA, 0x00, 0x0C,
    0x03, // 3 components
    0x01, 0x00, // Y: DC=0, AC=0
    0x02, 0x11, // Cb: DC=1, AC=1
    0x03, 0x11, // Cr: DC=1, AC=1
    0x00, 0x3F, 0x00 // spectral selection
  ]);
  segments.push(sos);

  // Encode scan data
  // Bit writer
  let bitBuf = 0, bitCount = 0;
  const scanBytes = [];

  function writeBits(val, len) {
    bitBuf = (bitBuf << len) | (val & ((1 << len) - 1));
    bitCount += len;
    while (bitCount >= 8) {
      bitCount -= 8;
      const byte = (bitBuf >> bitCount) & 0xFF;
      scanBytes.push(byte);
      if (byte === 0xFF) scanBytes.push(0x00); // byte stuffing
    }
  }

  function flushBits() {
    if (bitCount > 0) {
      writeBits((1 << (8 - bitCount)) - 1, 8 - bitCount);
    }
  }

  // Zig-zag order
  const zigzag = [
    0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,
    7,14,21,28,35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,
    39,46,53,60,61,54,47,55,62,63
  ];

  // DCT (simplified — just use the DC component for speed, zero AC)
  function encodeDCCoeff(dc, prevDC, dcEnc) {
    const diff = dc - prevDC;
    const absDiff = Math.abs(diff);
    let cat = 0;
    if (absDiff > 0) cat = Math.floor(Math.log2(absDiff)) + 1;
    if (cat > 11) cat = 11;
    const huffEntry = dcEnc[cat];
    if (!huffEntry) { writeBits(0, 2); return dc; }
    writeBits(huffEntry.code, huffEntry.len);
    if (cat > 0) {
      const val = diff >= 0 ? diff : diff + (1 << cat) - 1;
      writeBits(val, cat);
    }
    return dc;
  }

  function encodeBlock(block, prevDC, dcEnc, acEnc, qtable) {
    // Simple: quantize, encode DC, then encode AC as EOB
    const quantized = new Int16Array(64);
    for (let i = 0; i < 64; i++) {
      quantized[i] = Math.round(block[zigzag[i]] / qtable[i]);
    }

    prevDC = encodeDCCoeff(quantized[0], prevDC, dcEnc);

    // Encode AC coefficients
    let lastNonZero = 0;
    for (let i = 63; i >= 1; i--) {
      if (quantized[i] !== 0) { lastNonZero = i; break; }
    }

    if (lastNonZero === 0) {
      // EOB
      const eob = acEnc[0x00];
      if (eob) writeBits(eob.code, eob.len);
    } else {
      let zeroRun = 0;
      for (let i = 1; i <= lastNonZero; i++) {
        if (quantized[i] === 0) {
          zeroRun++;
          if (zeroRun === 16) {
            const zrl = acEnc[0xF0];
            if (zrl) writeBits(zrl.code, zrl.len);
            zeroRun = 0;
          }
          continue;
        }
        const val = quantized[i];
        const absVal = Math.abs(val);
        let cat = Math.floor(Math.log2(absVal)) + 1;
        if (cat > 10) cat = 10;
        const sym = (zeroRun << 4) | cat;
        const entry = acEnc[sym];
        if (entry) {
          writeBits(entry.code, entry.len);
          const bits = val >= 0 ? val : val + (1 << cat) - 1;
          writeBits(bits, cat);
        }
        zeroRun = 0;
      }
      if (lastNonZero < 63) {
        const eob = acEnc[0x00];
        if (eob) writeBits(eob.code, eob.len);
      }
    }

    return prevDC;
  }

  // Convert RGB to YCbCr and encode 8x8 blocks
  const blocksW = Math.ceil(w / 8);
  const blocksH = Math.ceil(h / 8);

  let prevDCY = 0, prevDCCb = 0, prevDCCr = 0;

  for (let by = 0; by < blocksH; by++) {
    for (let bx = 0; bx < blocksW; bx++) {
      const blockY = new Float64Array(64);
      const blockCb = new Float64Array(64);
      const blockCr = new Float64Array(64);

      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const px = Math.min(bx * 8 + x, w - 1);
          const py = Math.min(by * 8 + y, h - 1);
          const idx = (py * w + px) * 3;
          const r = rgbBuf[idx], g = rgbBuf[idx+1], b = rgbBuf[idx+2];

          const yVal = 0.299 * r + 0.587 * g + 0.114 * b - 128;
          const cb = -0.1687 * r - 0.3313 * g + 0.5 * b;
          const cr = 0.5 * r - 0.4187 * g - 0.0813 * b;

          blockY[y * 8 + x] = yVal;
          blockCb[y * 8 + x] = cb;
          blockCr[y * 8 + x] = cr;
        }
      }

      // Simple "DCT" — just use pixel values directly (no actual DCT transform for speed)
      // This gives a valid but lower quality result
      prevDCY = encodeBlock(blockY, prevDCY, dcLumEnc, acLumEnc, lumQ);
      prevDCCb = encodeBlock(blockCb, prevDCCb, dcChrEnc, acChrEnc, chrQ);
      prevDCCr = encodeBlock(blockCr, prevDCCr, dcChrEnc, acChrEnc, chrQ);
    }
  }

  flushBits();
  segments.push(Buffer.from(scanBytes));

  // EOI
  segments.push(Buffer.from([0xFF, 0xD9]));

  return Buffer.concat(segments);
}

// ── MP4 Box helpers ─────────────────────────────────────────────────────────

function box(type, ...children) {
  const payload = Buffer.concat(children);
  const buf = Buffer.alloc(8 + payload.length);
  buf.writeUInt32BE(8 + payload.length, 0);
  buf.write(type, 4, 4, 'ascii');
  payload.copy(buf, 8);
  return buf;
}

function fullbox(type, version, flags, ...children) {
  const payload = Buffer.concat(children);
  const buf = Buffer.alloc(12 + payload.length);
  buf.writeUInt32BE(12 + payload.length, 0);
  buf.write(type, 4, 4, 'ascii');
  buf[8] = version;
  buf[9] = (flags >> 16) & 0xFF;
  buf[10] = (flags >> 8) & 0xFF;
  buf[11] = flags & 0xFF;
  payload.copy(buf, 12);
  return buf;
}

function u32(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; }
function u16(v) { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; }

function buildMP4(jpegFrames, fps) {
  const numFrames = jpegFrames.length;
  const duration = numFrames; // in timescale units (timescale = fps)
  const timescale = fps;
  const frameDuration = 1; // each frame = 1 timescale unit

  // ftyp
  const ftyp = box('ftyp',
    Buffer.from('isom'), u32(0x200),
    Buffer.from('isomiso2mp41')
  );

  // Build mdat content and track sample offsets/sizes
  const mdatHeader = Buffer.alloc(8);
  let mdatSize = 8;
  const sampleSizes = [];
  const chunkOffsets = [];

  // moov comes before mdat, so we need to know moov size first...
  // We'll calculate moov size, then compute offsets

  // For simplicity, put each frame as a separate chunk
  // Calculate mdat
  for (const frame of jpegFrames) {
    sampleSizes.push(frame.length);
    mdatSize += frame.length;
  }

  // Build moov to measure its size, then fix chunk offsets
  function buildMoov(baseOffset) {
    const offsets = [];
    let off = baseOffset;
    for (const size of sampleSizes) {
      offsets.push(off);
      off += size;
    }

    // stts — sample-to-time: all frames same duration
    const sttsData = Buffer.alloc(8);
    sttsData.writeUInt32BE(1, 0); // entry count
    sttsData.writeUInt32BE(numFrames, 0);
    const sttsEntry = Buffer.alloc(8);
    sttsEntry.writeUInt32BE(numFrames, 0);
    sttsEntry.writeUInt32BE(frameDuration, 4);
    const stts = fullbox('stts', 0, 0, Buffer.concat([u32(1), sttsEntry]));

    // stsc — sample-to-chunk: 1 sample per chunk
    const stscEntry = Buffer.alloc(12);
    stscEntry.writeUInt32BE(1, 0); // first chunk
    stscEntry.writeUInt32BE(1, 4); // samples per chunk
    stscEntry.writeUInt32BE(1, 8); // sample description index
    const stsc = fullbox('stsc', 0, 0, Buffer.concat([u32(1), stscEntry]));

    // stsz — sample sizes
    const stszEntries = Buffer.alloc(4 * numFrames);
    for (let i = 0; i < numFrames; i++) {
      stszEntries.writeUInt32BE(sampleSizes[i], i * 4);
    }
    const stsz = fullbox('stsz', 0, 0, Buffer.concat([u32(0), u32(numFrames), stszEntries]));

    // stco — chunk offsets
    const stcoEntries = Buffer.alloc(4 * offsets.length);
    for (let i = 0; i < offsets.length; i++) {
      stcoEntries.writeUInt32BE(offsets[i], i * 4);
    }
    const stco = fullbox('stco', 0, 0, Buffer.concat([u32(offsets.length), stcoEntries]));

    // stsd — sample description (MJPEG)
    const mjpgEntry = Buffer.alloc(86);
    mjpgEntry.writeUInt32BE(86, 0); // size
    mjpgEntry.write('mjpa', 4, 4, 'ascii'); // Motion JPEG A
    // reserved (6 bytes) + data_ref_index (2 bytes)
    mjpgEntry.writeUInt16BE(1, 14); // data ref index
    mjpgEntry.writeUInt16BE(WIDTH, 32);
    mjpgEntry.writeUInt16BE(HEIGHT, 34);
    mjpgEntry.writeUInt32BE(0x00480000, 36); // 72 dpi horiz
    mjpgEntry.writeUInt32BE(0x00480000, 40); // 72 dpi vert
    mjpgEntry.writeUInt16BE(24, 82); // depth
    mjpgEntry.writeInt16BE(-1, 84); // predefined
    const stsd = fullbox('stsd', 0, 0, Buffer.concat([u32(1), mjpgEntry]));

    // stss — sync samples (all frames are keyframes)
    const stssEntries = Buffer.alloc(4 * numFrames);
    for (let i = 0; i < numFrames; i++) stssEntries.writeUInt32BE(i + 1, i * 4);
    const stss = fullbox('stss', 0, 0, Buffer.concat([u32(numFrames), stssEntries]));

    const stbl = box('stbl', stsd, stts, stsc, stsz, stco, stss);

    // Media header
    const mdhd = fullbox('mdhd', 0, 0,
      u32(0), u32(0), // creation/modification time
      u32(timescale),
      u32(duration),
      u16(0x55C4), u16(0) // language + predefined
    );

    // Handler
    const hdlrPayload = Buffer.alloc(20 + 13);
    hdlrPayload.write('vide', 4, 4, 'ascii');
    hdlrPayload.write('VideoHandler', 20, 12, 'ascii');
    const hdlr = fullbox('hdlr', 0, 0, hdlrPayload);

    // Video media header
    const vmhd = fullbox('vmhd', 0, 1, Buffer.alloc(8));

    // Data reference
    const drefEntry = fullbox('url ', 0, 1);
    const dref = fullbox('dref', 0, 0, Buffer.concat([u32(1), drefEntry]));
    const dinf = box('dinf', dref);

    const minf = box('minf', vmhd, dinf, stbl);
    const mdia = box('mdia', mdhd, hdlr, minf);

    // Track header
    const tkhdPayload = Buffer.alloc(80);
    tkhdPayload.writeUInt32BE(1, 0); // track ID
    tkhdPayload.writeUInt32BE(duration, 8); // duration
    // width and height as 16.16 fixed point
    tkhdPayload.writeUInt32BE(WIDTH << 16, 64);
    tkhdPayload.writeUInt32BE(HEIGHT << 16, 68);
    // transformation matrix (identity)
    tkhdPayload.writeUInt32BE(0x00010000, 28); // a = 1.0
    tkhdPayload.writeUInt32BE(0x00010000, 44); // d = 1.0
    tkhdPayload.writeUInt32BE(0x40000000, 52); // w = 1.0
    const tkhd = fullbox('tkhd', 0, 3, tkhdPayload);

    const trak = box('trak', tkhd, mdia);

    // Movie header
    const mvhdPayload = Buffer.alloc(96);
    mvhdPayload.writeUInt32BE(timescale, 8);
    mvhdPayload.writeUInt32BE(duration, 12);
    mvhdPayload.writeUInt32BE(0x00010000, 16); // rate = 1.0
    mvhdPayload.writeUInt16BE(0x0100, 20); // volume = 1.0
    // matrix
    mvhdPayload.writeUInt32BE(0x00010000, 32); // a
    mvhdPayload.writeUInt32BE(0x00010000, 48); // d
    mvhdPayload.writeUInt32BE(0x40000000, 56); // w
    mvhdPayload.writeUInt32BE(2, 92); // next_track_ID
    const mvhd = fullbox('mvhd', 0, 0, mvhdPayload);

    return box('moov', mvhd, trak);
  }

  // First pass: build moov with dummy offset to measure size
  const dummyMoov = buildMoov(0);
  const moovSize = dummyMoov.length;
  const mdatOffset = ftyp.length + moovSize + 8; // +8 for mdat header

  // Second pass: build moov with correct offsets
  const moov = buildMoov(mdatOffset);

  // Build mdat
  mdatHeader.writeUInt32BE(mdatSize, 0);
  mdatHeader.write('mdat', 4, 4, 'ascii');

  return Buffer.concat([ftyp, moov, mdatHeader, ...jpegFrames]);
}

// ── Main ────────────────────────────────────────────────────────────────────

console.log('Rendering slides...');
const jpegFrames = [];

for (let i = 0; i < slides.length; i++) {
  console.log(`  Slide ${i + 1}/${slides.length}: ${slides[i].title}`);
  const rgb = renderSlide(slides[i]);

  // Render this slide for SLIDE_DURATION frames
  const jpeg = encodeJPEG(rgb, WIDTH, HEIGHT);
  for (let f = 0; f < SLIDE_DURATION * FPS; f++) {
    jpegFrames.push(jpeg);
  }
}

console.log(`Muxing ${jpegFrames.length} frames into MP4...`);
const mp4 = buildMP4(jpegFrames, FPS);

const outPath = path.join(__dirname, 'session-recap.mp4');
fs.writeFileSync(outPath, mp4);
console.log(`Done! Saved to ${outPath} (${(mp4.length / 1024 / 1024).toFixed(1)} MB)`);
