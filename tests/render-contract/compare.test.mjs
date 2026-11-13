import assert from 'node:assert/strict';
import test from 'node:test';
import { crc32, deflateSync } from 'node:zlib';
import {
  canonical, compareEdges, comparePixels, decodePng, encodePng, orderedFrames,
  shuffledFrames, stateHash, verifyCompletion, verifyContent,
} from './compare.mjs';

function image(width, height, pixel = [40, 80, 120, 255]) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) rgba.set(pixel, p * 4);
  return { width, height, rgba };
}

test('canonical state hashes sort keys recursively but retain array/layer order', () => {
  assert.equal(stateHash({ z: [{ b: 2, a: 1 }], a: 0 }), stateHash({ a: 0, z: [{ a: 1, b: 2 }] }));
  assert.notEqual(stateHash({ layers: ['a', 'b'] }), stateHash({ layers: ['b', 'a'] }));
  assert.deepEqual(canonical({ z: null, a: [2, 1] }), { a: [2, 1], z: null });
});

test('PNG round trip retains RGB and alpha and detects truncated/corrupt evidence', () => {
  const original = image(3, 2, [17, 100, 240, 91]);
  original.rgba[8] = 255; original.rgba[15] = 0;
  const png = encodePng(original);
  assert.deepEqual(decodePng(png), original);
  assert.throws(() => decodePng(png.subarray(0, png.length - 5)), /Truncated|Incomplete/);
  const damaged = Buffer.from(png); damaged[42] ^= 1;
  assert.throws(() => decodePng(damaged), /CRC/);
});

function pngChunk(name, bytes) {
  const data = Buffer.concat([Buffer.from(name), bytes]);
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4);
  size.writeUInt32BE(bytes.length); checksum.writeUInt32BE(crc32(data));
  return Buffer.concat([size, data, checksum]);
}

test('PNG decoder reconstructs all five row filters in RGB and RGBA screenshots', () => {
  for (const channels of [3, 4]) {
    const width = 7, height = 5, stride = width * channels;
    const samples = Buffer.from(Array.from({ length: stride * height }, (_, i) => (i * 73 + 29) % 256));
    const rows = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
      rows[y * (stride + 1)] = y;
      for (let x = 0; x < stride; x++) {
        const left = x >= channels ? samples[y * stride + x - channels] : 0;
        const above = y ? samples[(y - 1) * stride + x] : 0;
        const corner = y && x >= channels ? samples[(y - 1) * stride + x - channels] : 0;
        const prediction = left + above - corner;
        const distances = [left, above, corner].map(value => Math.abs(prediction - value));
        const nearest = [left, above, corner][distances.indexOf(Math.min(...distances))];
        const filtered = [0, left, above, Math.floor((left + above) / 2), nearest][y];
        rows[y * (stride + 1) + x + 1] = (samples[y * stride + x] - filtered + 256) % 256;
      }
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = channels === 3 ? 2 : 6;
    const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), pngChunk('IHDR', header),
      pngChunk('tEXt', Buffer.from('ignored metadata')), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', Buffer.alloc(0))]);
    const decoded = decodePng(png);
    for (let p = 0; p < width * height; p++) {
      assert.deepEqual([...decoded.rgba.subarray(p * 4, p * 4 + 3)], [...samples.subarray(p * channels, p * channels + 3)]);
      assert.equal(decoded.rgba[p * 4 + 3], channels === 3 ? 255 : samples[p * channels + 3]);
    }
  }
});

test('PNG metadata differences do not affect repeat decoded pixels', () => {
  const a = encodePng(image(3, 2));
  const b = Buffer.concat([a.subarray(0, 33), pngChunk('tEXt', Buffer.from('different metadata')), a.subarray(33)]);
  assert.equal(a.equals(b), false);
  assert.equal(decodePng(a).rgba.equals(decodePng(b).rgba), true);
  const unsupported = Buffer.concat([a.subarray(0, 33), pngChunk('tRNS', Buffer.alloc(6)), a.subarray(33)]);
  assert.throws(() => decodePng(unsupported), /transparency keys/);
});

test('cross-host tolerance includes 8 per channel and exactly 99.5% matching pixels', () => {
  const a = image(20, 10), b = image(20, 10);
  b.rgba[0] += 9;
  b.rgba[4] += 8;
  const accepted = comparePixels(a, b);
  assert.equal(accepted.changedPixels, 2); assert.equal(accepted.outsideTolerance, 1);
  assert.equal(accepted.passed, true);
  b.rgba[8] += 9;
  assert.equal(comparePixels(a, b).passed, false);
});

test('repeat evidence distinguishes any decoded change even inside cross-host tolerance', () => {
  const a = image(10, 10), b = image(10, 10);
  b.rgba[0]++;
  assert.equal(comparePixels(a, b).passed, true);
  assert.equal(comparePixels(a, b).changedPixels, 1);
  assert.equal(a.rgba.equals(b.rgba), false);
  b.rgba[0]--; b.rgba[3]--;
  assert.equal(comparePixels(a, b).changedPixels, 1, 'Alpha changes count');
  assert.throws(() => comparePixels(a, image(9, 10)), /widths/);
});

function rectangle(x) {
  const result = image(24, 24, [0, 0, 0, 0]);
  for (let y = 7; y < 17; y++) for (let dx = 0; dx < 7; dx++) result.rgba.set([20, 80, 40, 255], (y * 24 + x + dx) * 4);
  return result;
}

test('authored edges accept one-pixel displacement and reject two or missing content symmetrically', () => {
  assert.equal(compareEdges(rectangle(7), rectangle(7)).passed, true);
  assert.equal(compareEdges(rectangle(7), rectangle(8)).passed, true);
  assert.equal(compareEdges(rectangle(7), rectangle(9)).passed, false);
  const empty = image(24, 24, [0, 0, 0, 0]);
  assert.equal(compareEdges(rectangle(7), empty).passed, false);
  assert.equal(compareEdges(empty, rectangle(7)).passed, false);
});

test('a missing small label cannot be hidden by the aggregate pixel score', () => {
  const a = image(100, 100, [0, 0, 0, 0]), b = image(100, 100, [0, 0, 0, 0]);
  for (let x = 10; x < 20; x++) a.rgba.set([0, 0, 0, 255], (10 * 100 + x) * 4);
  assert.equal(comparePixels(a, b).passed, true);
  assert.equal(compareEdges(a, b).passed, false);
});

test('edge tolerance does not widen a one-pixel radius to a diagonal square', () => {
  const a = image(24, 24, [0, 0, 0, 0]), b = image(24, 24, [0, 0, 0, 0]);
  a.rgba.set([0, 0, 0, 255], (10 * 24 + 10) * 4);
  b.rgba.set([0, 0, 0, 255], (11 * 24 + 11) * 4);
  assert.equal(compareEdges(a, b).passed, false);
});

const state = { viewport: { width: 100, height: 100 }, layers: [{ id: 'first', visible: true }, { id: 'second', visible: true }],
  annotations: [{ id: 'label', text: 'Visible label', opacity: 1, leaderLine: { offset: [5, 5] } }],
  outsideDimming: { featureRevisionId: 'polygon' } };
const content = { canvas: [100, 100], mapPainted: true, layers: ['first', 'second'],
  annotations: [{ id: 'label', text: 'Visible label', opacity: 1, lines: 2, bounds: { x: 10, y: 10, width: 30, height: 10 } }],
  dim: 'polygon', dimFirst: true, fontsReady: true };

test('content expectations reject missing layers, labels, wrong order, clipping, and blank maps', () => {
  verifyContent(content, state);
  for (const changes of [{ layers: ['second', 'first'] }, { layers: ['first'] }, { annotations: [] },
    { dim: null }, { dimFirst: false }, { fontsReady: false }, { mapPainted: false }, { canvas: [25, 25] }]) {
    assert.throws(() => verifyContent({ ...content, ...changes }, state));
  }
  const clipped = structuredClone(content); clipped.annotations[0].bounds.x = 90;
  assert.throws(() => verifyContent(clipped, state), /Clipped/);
});

test('Gate B cannot pass on parity alone or on a partial format/video check', () => {
  const complete = { parity: 'passed', readiness: 'passed', videoGate: 'passed', variants: ['portrait', 'landscape'], formatsCompleted: 2 };
  verifyCompletion(complete);
  for (const changes of [{ parity: 'not run' }, { readiness: 'failed' }, { videoGate: 'not run' },
    { formatsCompleted: 1 }, { variants: ['portrait'] }]) assert.throws(() => verifyCompletion({ ...complete, ...changes }));
});

test('seek plan includes boundaries, repeated frames, and the required shuffle', () => {
  assert.deepEqual(shuffledFrames.slice(0, 5), [299, 0, 149, 1, 299]);
  for (const boundary of [30, 60, 150, 180, 240, 255, 270]) {
    assert.ok(orderedFrames.includes(boundary - 1));
    assert.ok(orderedFrames.includes(boundary));
    assert.ok(orderedFrames.includes(boundary + 1));
  }
  assert.deepEqual([...orderedFrames].sort((a, b) => a - b), orderedFrames);
});
