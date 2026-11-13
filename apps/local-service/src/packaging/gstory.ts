import { inflateRawSync } from 'node:zlib';
import { zipSync } from 'fflate';
import { parseProject } from '../../../../packages/project-schema/src/index.ts';
import type { ProjectDocument } from '../../../../packages/project-schema/src/index.ts';
import { canonicalJson } from '../../../../packages/project-schema/src/canonical.ts';
import { hashBytes } from '../db/project-repository.ts';

export const PACKAGE_LIMITS = { compressed: 64 * 1024 * 1024, expanded: 128 * 1024 * 1024, entry: 32 * 1024 * 1024, entries: 2000, ratio: 200 };
const decode = new TextDecoder('utf-8', { fatal: true });
const encode = (value: unknown) => Buffer.from(canonicalJson(value), 'utf8');
const crcTable = Array.from({ length: 256 }, (_, i) => {
  let c = i; for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0;
}

/** Validate archive names before creating any files, including cross-platform collisions. */
export function packagePath(name: string): string {
  if (!name || name.length > 240 || /[\\:\x00-\x1f]/.test(name) || name.startsWith('/') || name !== name.normalize('NFC')) throw new Error('Unsafe archive path.');
  for (const part of name.split('/')) if (!part || part === '.' || part === '..' || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) throw new Error('Unsafe archive path.');
  return name.toLowerCase();
}

/** Inspect central and local ZIP headers, then decompress bounded bytes without extraction. */
export function readZip(input: Uint8Array): Map<string, Buffer> {
  const bytes = Buffer.from(input);
  if (bytes.length > PACKAGE_LIMITS.compressed || bytes.length < 22) throw new Error('Package size limit or invalid ZIP.');
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length) throw new Error('ZIP directory is missing.');
  if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) throw new Error('Multi-disk ZIP is unsupported.');
  const count = bytes.readUInt16LE(end + 10), directorySize = bytes.readUInt32LE(end + 12), start = bytes.readUInt32LE(end + 16);
  if (count !== bytes.readUInt16LE(end + 8) || count > PACKAGE_LIMITS.entries || start + directorySize !== end) throw new Error('Invalid ZIP directory limits.');
  const records: { name: string; offset: number; compressed: number; expanded: number; method: number; crc: number; payload: number }[] = [];
  const names = new Set<string>(); let at = start, total = 0, compressedTotal = 0;
  const ranges: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    if (at + 46 > end || bytes.readUInt32LE(at) !== 0x02014b50) throw new Error('Invalid ZIP entry.');
    const flags = bytes.readUInt16LE(at + 8), method = bytes.readUInt16LE(at + 10), crc = bytes.readUInt32LE(at + 16);
    const compressed = bytes.readUInt32LE(at + 20), expanded = bytes.readUInt32LE(at + 24);
    const nameLength = bytes.readUInt16LE(at + 28), extra = bytes.readUInt16LE(at + 30), comment = bytes.readUInt16LE(at + 32);
    const external = bytes.readUInt32LE(at + 38), offset = bytes.readUInt32LE(at + 42);
    if (flags & ~0x0800 || ![0, 8].includes(method) || extra !== 0 || bytes.readUInt16LE(at + 34) !== 0) throw new Error('Encrypted, streamed, linked, ZIP64 or extended ZIP entries are unsupported.');
    if (![0, 0x8000].includes((external >>> 16) & 0xf000) || (external & 0x10)) throw new Error('Only regular archive files are supported.');
    if (at + 46 + nameLength + extra + comment > end) throw new Error('Truncated ZIP entry.');
    const name = decode.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    const key = packagePath(name); if (names.has(key)) throw new Error('Duplicate archive path.'); names.add(key);
    total += expanded; compressedTotal += compressed;
    if (expanded > PACKAGE_LIMITS.entry || total > PACKAGE_LIMITS.expanded || expanded > Math.max(1, compressed) * PACKAGE_LIMITS.ratio) throw new Error('Package expansion limit exceeded.');
    if (offset + 30 > start || bytes.readUInt32LE(offset) !== 0x04034b50) throw new Error('Missing local ZIP header.');
    if (bytes.readUInt16LE(offset + 6) !== flags || bytes.readUInt16LE(offset + 8) !== method || bytes.readUInt32LE(offset + 14) !== crc || bytes.readUInt32LE(offset + 18) !== compressed || bytes.readUInt32LE(offset + 22) !== expanded || bytes.readUInt16LE(offset + 26) !== nameLength || bytes.readUInt16LE(offset + 28) !== 0) throw new Error('Conflicting ZIP headers.');
    const payload = offset + 30 + nameLength;
    if (payload + compressed > start || decode.decode(bytes.subarray(offset + 30, payload)) !== name) throw new Error('Invalid ZIP data range.');
    ranges.push([offset, payload + compressed]); records.push({ name, offset, compressed, expanded, method, crc, payload });
    at += 46 + nameLength + extra + comment;
  }
  ranges.sort((a, b) => a[0] - b[0]);
  if (at !== end || total > Math.max(1, compressedTotal) * PACKAGE_LIMITS.ratio || ranges.some((range, i) => range[0] !== (i ? ranges[i - 1][1] : 0)) || (ranges.at(-1)?.[1] ?? 0) !== start) throw new Error('Overlapping or undeclared ZIP data.');
  const entries = new Map<string, Buffer>();
  for (const r of records) {
    const compressed = bytes.subarray(r.payload, r.payload + r.compressed);
    const expanded = r.method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: Math.max(1, Math.min(PACKAGE_LIMITS.entry, r.expanded + 1)) });
    if (expanded.length !== r.expanded || crc32(expanded) !== r.crc) throw new Error('ZIP size or checksum mismatch.');
    entries.set(r.name, expanded);
  }
  return entries;
}

type Entry = { path: string; sha256: string; bytes: number; mediaType: string };
type Omission = { assetId: string; reason: string; source: string; guidance: string };
type Manifest = { format: 'gstory'; containerVersion: 1; projectSchemaVersion: 1; projectPath: 'project.json'; sourceProjectId: string; sourceRevisionId: string; producer: string; exportedAt: string; mode: 'portable' | 'references'; entries: Entry[]; contentSha256: string; omittedAssets: Omission[] };

/** Export only explicitly permitted bytes and account for every absent asset. */
export function exportGstory(project: ProjectDocument, revisionId: string, resolveAsset: (sha256: string) => Uint8Array | undefined, mode: 'portable' | 'references' = 'portable'): Uint8Array {
  parseProject(project);
  const files: Record<string, Uint8Array> = { 'project.json': encode(project) };
  const entries: Entry[] = [{ path: 'project.json', sha256: hashBytes(files['project.json']), bytes: files['project.json'].length, mediaType: 'application/json' }];
  const omittedAssets: Omission[] = [];
  for (const asset of project.assets) {
    const bytes = resolveAsset(asset.sha256), permitted = asset.permission?.redistribution === true;
    if (!bytes || !permitted) {
      omittedAssets.push({ assetId: asset.id, reason: !bytes ? 'Original bytes are missing.' : 'Redistribution permission is unresolved or denied.', source: asset.path, guidance: 'Locate the original permitted file or remove the dependent scene.' });
      continue;
    }
    if (hashBytes(bytes) !== asset.sha256) throw new Error('Asset content changed.');
    const name = 'assets/' + asset.sha256;
    if (!files[name]) { files[name] = bytes; entries.push({ path: name, sha256: asset.sha256, bytes: bytes.length, mediaType: asset.mediaType }); }
  }
  if (mode === 'portable' && omittedAssets.length) throw new Error('Portable export requires every asset and redistribution permission. Choose a reference package to preserve the editable project with an omission report.');
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const manifest: Manifest = { format: 'gstory', containerVersion: 1, projectSchemaVersion: 1, projectPath: 'project.json', sourceProjectId: project.id, sourceRevisionId: revisionId,
    producer: 'Storytelling Studio 0.0.0 integrated candidate', exportedAt: new Date().toISOString(), mode, entries, contentSha256: hashBytes(canonicalJson(entries)), omittedAssets };
  files['manifest.json'] = encode(manifest);
  const result = zipSync(files, { level: 0, mtime: new Date('2000-01-01T00:00:00Z') });
  readZip(result); return result;
}

function boundedJson(bytes: Uint8Array): unknown {
  const text = decode.decode(bytes); let depth = 0, quoted = false, escaped = false;
  for (const char of text) {
    if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; }
    else if (char === '"') quoted = true;
    else if (char === '[' || char === '{') { if (++depth > 64) throw new Error('JSON nesting limit exceeded.'); }
    else if (char === ']' || char === '}') depth--;
  }
  return JSON.parse(text);
}

/** Verify the entire package before its caller begins a database import transaction. */
export function importGstory(bytes: Uint8Array): { document: ProjectDocument; assets: { bytes: Uint8Array; mediaType: string }[]; omittedAssets: Omission[] } {
  const files = readZip(bytes);
  if (!files.has('manifest.json') || !files.has('project.json')) throw new Error('Missing project or manifest.');
  const manifest = boundedJson(files.get('manifest.json')!) as Manifest;
  if (!manifest || manifest.format !== 'gstory' || manifest.containerVersion !== 1 || manifest.projectSchemaVersion !== 1 || manifest.projectPath !== 'project.json' || !['portable','references'].includes(manifest.mode)) throw new Error('Unsupported project package version.');
  if (!Array.isArray(manifest.entries) || !Array.isArray(manifest.omittedAssets) || hashBytes(canonicalJson(manifest.entries)) !== manifest.contentSha256) throw new Error('Invalid manifest.');
  const names = new Set<string>();
  for (const entry of manifest.entries) {
    const key = packagePath(entry.path); if (names.has(key) || entry.path === 'manifest.json') throw new Error('Duplicate manifest path.'); names.add(key);
    const content = files.get(entry.path);
    if (!content || content.length !== entry.bytes || hashBytes(content) !== entry.sha256) throw new Error('Manifest content mismatch.');
  }
  if (files.size !== names.size + 1) throw new Error('Undeclared archive file.');
  const document = parseProject(boundedJson(files.get('project.json')!));
  if (manifest.sourceProjectId !== document.id || typeof manifest.sourceRevisionId !== 'string') throw new Error('Source identity mismatch.');
  const assets: { bytes: Uint8Array; mediaType: string }[] = [];
  for (const asset of document.assets) {
    const content = files.get('assets/' + asset.sha256);
    if (!content) {
      if (manifest.mode !== 'references' || !manifest.omittedAssets.some(item => item.assetId === asset.id && typeof item.reason === 'string')) throw new Error('Missing required asset.');
    } else {
      if (!asset.permission?.redistribution || hashBytes(content) !== asset.sha256) throw new Error('Unpermitted or corrupt asset.');
      assets.push({ bytes: content, mediaType: asset.mediaType });
    }
  }
  if (manifest.mode === 'portable' && manifest.omittedAssets.length) throw new Error('A portable package cannot omit assets.');
  document.importedFrom = { projectId: document.id, revisionId: manifest.sourceRevisionId, packageSha256: hashBytes(bytes) };
  return { document, assets, omittedAssets: manifest.omittedAssets };
}
