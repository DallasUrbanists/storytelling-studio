import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

export const tolerances = Object.freeze({ channel: 8, matchingPixels: 0.995, edgePixels: 1 });
export const orderedFrames = Object.freeze([
  0, 1, 29, 30, 31, 45, 59, 60, 61, 149, 150, 151, 179, 180, 181,
  239, 240, 241, 254, 255, 256, 269, 270, 271, 298, 299,
]);
export const shuffledFrames = Object.freeze([299, 0, 149, 1, 299, 149, 0, 149]);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, child]) => [key, canonical(child)]));
  }
  return value;
}

export const stateHash = state => sha256(JSON.stringify(canonical(state)));

const signature = Buffer.from('89504e470d0a1a0a', 'hex');
function chunk(type, bytes) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(bytes.length + 12);
  result.writeUInt32BE(bytes.length);
  name.copy(result, 4);
  bytes.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, bytes])), result.length - 4);
  return result;
}

/** Write RGBA diagnostic pixels without metadata or a third-party image dependency. */
export function encodePng({ width, height, rgba }) {
  assert.equal(rgba.length, width * height * 4);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    Buffer.from(rgba.subarray(y * width * 4, (y + 1) * width * 4))
      .copy(rows, y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decode Chromium's non-interlaced 8-bit RGB/RGBA PNGs; fail on other profiles. */
export function decodePng(png) {
  assert.deepEqual(png.subarray(0, 8), signature, 'Not a PNG');
  let width, height, channels, ended = false;
  const compressed = [];
  for (let offset = 8; offset < png.length;) {
    assert.ok(offset + 12 <= png.length, 'Truncated PNG chunk');
    const size = png.readUInt32BE(offset), end = offset + size + 12;
    assert.ok(end <= png.length, 'Truncated PNG data');
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, end - 4);
    assert.equal(crc32(png.subarray(offset + 4, end - 4)), png.readUInt32BE(end - 4), 'PNG CRC mismatch');
    if (type === 'IHDR') {
      assert.equal(offset, 8); assert.equal(size, 13);
      width = data.readUInt32BE(); height = data.readUInt32BE(4);
      assert.ok(width > 0 && height > 0 && width * height <= 1920 * 1920, 'Unexpected image dimensions');
      assert.equal(data[8], 8, 'Expected 8-bit PNG');
      assert.ok([2, 6].includes(data[9]), 'Expected RGB or RGBA PNG');
      assert.deepEqual([...data.subarray(10)], [0, 0, 0], 'Unsupported PNG encoding');
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') compressed.push(data);
    else if (type === 'IEND') { ended = true; break; }
    else {
      assert.notEqual(type, 'tRNS', 'PNG transparency keys are unsupported; require RGBA');
      assert.ok(type[0] === type[0].toLowerCase(), `Unknown critical PNG chunk ${type}`);
    }
    offset = end;
  }
  assert.ok(width && channels && ended && compressed.length, 'Incomplete PNG');
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(compressed), { maxOutputLength: height * (stride + 1) });
  assert.equal(raw.length, height * (stride + 1));
  const decoded = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    assert.ok(filter <= 4, 'Unknown PNG row filter');
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? decoded[y * stride + x - channels] : 0;
      const b = y ? decoded[(y - 1) * stride + x] : 0;
      const c = y && x >= channels ? decoded[(y - 1) * stride + x - channels] : 0;
      const prediction = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
      decoded[y * stride + x] = (raw[y * (stride + 1) + x + 1] + prediction) & 255;
    }
  }
  const rgba = Buffer.alloc(width * height * 4, 255);
  for (let p = 0; p < width * height; p++) decoded.copy(rgba, p * 4, p * channels, p * channels + channels);
  return { width, height, rgba };
}

function sameSize(a, b) {
  assert.equal(a.width, b.width, 'Image widths differ');
  assert.equal(a.height, b.height, 'Image heights differ');
  assert.equal(a.rgba.length, a.width * a.height * 4);
  assert.equal(b.rgba.length, a.rgba.length);
}

/** Compare decoded pixels, including alpha; compressed file bytes are not the criterion. */
export function comparePixels(a, b) {
  sameSize(a, b);
  const diff = Buffer.alloc(a.rgba.length), total = a.width * a.height;
  let outsideTolerance = 0, changedPixels = 0, maxChannelDifference = 0;
  for (let p = 0; p < total; p++) {
    let maximum = 0;
    for (let c = 0; c < 4; c++) maximum = Math.max(maximum, Math.abs(a.rgba[p * 4 + c] - b.rgba[p * 4 + c]));
    if (maximum) changedPixels++;
    if (maximum > tolerances.channel) outsideTolerance++;
    maxChannelDifference = Math.max(maxChannelDifference, maximum);
    diff[p * 4] = maximum; diff[p * 4 + 3] = 255;
  }
  return { changedPixels, outsideTolerance, maxChannelDifference,
    matchingFraction: 1 - outsideTolerance / total,
    passed: outsideTolerance / total <= 1 - tolerances.matchingPixels + Number.EPSILON,
    diff: { width: a.width, height: a.height, rgba: diff } };
}

function edges(image) {
  const { width, height, rgba } = image;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x;
    for (const q of [x + 1 < width ? p + 1 : p, y + 1 < height ? p + width : p]) {
      if ([0, 1, 2, 3].some(c => Math.abs(rgba[p * 4 + c] - rgba[q * 4 + c]) > tolerances.channel)) {
        mask[p] = mask[q] = 1;
      }
    }
  }
  return mask;
}

/** Symmetric edge distance on isolated authored overlays, in output pixels. */
export function compareEdges(a, b) {
  sameSize(a, b);
  if (a.rgba.equals(b.rgba)) return { exact: true, passed: true };
  const left = edges(a), right = edges(b);
  const unmatched = (source, target) => {
    let count = 0, total = 0;
    for (let p = 0; p < source.length; p++) {
      if (!source[p]) continue;
      total++;
      const x = p % a.width, y = Math.floor(p / a.width);
      let found = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx * dx + dy * dy <= tolerances.edgePixels ** 2
            && x + dx >= 0 && x + dx < a.width && y + dy >= 0 && y + dy < a.height
            && target[(y + dy) * a.width + x + dx]) found = true;
      }
      if (!found) count++;
    }
    return { total, unmatched: count };
  };
  const forward = unmatched(left, right), reverse = unmatched(right, left);
  return { forward, reverse, passed: forward.unmatched === 0 && reverse.unmatched === 0 };
}

/** Check independent content expectations so two identically broken hosts cannot pass. */
export function verifyContent(snapshot, state) {
  assert.deepEqual(snapshot.layers, state.layers.filter(layer => layer.visible).map(layer => layer.id), 'Missing or reordered layer');
  assert.deepEqual(snapshot.annotations.map(a => [a.id, a.text, a.opacity, a.lines]),
    state.annotations.filter(a => a.opacity > 0).map(a => [a.id, a.text, a.opacity, a.leaderLine ? 2 : 0]), 'Missing label or leader');
  assert.equal(snapshot.dim, state.outsideDimming?.featureRevisionId ?? null, 'Missing dim');
  assert.ok(snapshot.dimFirst && snapshot.fontsReady, 'Mask order or font readiness failed');
  assert.deepEqual(snapshot.canvas, [state.viewport.width, state.viewport.height]);
  assert.ok(snapshot.mapPainted, 'Blank or unpainted basemap');
  for (const annotation of snapshot.annotations) {
    const { x, y, width, height } = annotation.bounds;
    // The shared label uses a four-pixel casing, extending two pixels past its text box.
    assert.ok(x >= 2 && y >= 2 && x + width + 2 <= state.viewport.width && y + height + 2 <= state.viewport.height,
      `Clipped required text: ${annotation.id}`);
  }
}

/** An incomplete collection must never report a passed gate. */
export function verifyCompletion(receipt) {
  assert.equal(receipt.parity, 'passed');
  assert.equal(receipt.readiness, 'passed');
  assert.equal(receipt.videoGate, 'passed');
  assert.deepEqual(receipt.variants, ['portrait', 'landscape']);
  assert.equal(receipt.formatsCompleted, 2);
}

