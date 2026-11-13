import { timingSafeEqual, randomBytes } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import type { IncomingMessage } from 'node:http';

export const LOOPBACK = '127.0.0.1';
export const MAX_JSON_BYTES = 1024 * 1024;

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function requireLoopback(host: string): void {
  if (host !== LOOPBACK) throw new Error('Only the IPv4 loopback bind address is supported.');
}

/** Launcher configuration only; no request can add an origin. */
export function localOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)
      || url.username || url.password || url.origin !== value) {
    throw new Error('Expected an exact local HTTP origin.');
  }
  return value;
}

export function newSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function requireSession(request: IncomingMessage, token: string): void {
  const supplied = request.headers.authorization;
  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(typeof supplied === 'string' ? supplied : '');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new HttpError(401, 'UNAUTHORIZED', 'A valid local session is required.');
  }
}

export function requireLocalRequest(request: IncomingMessage, port: number, origins: ReadonlySet<string>): void {
  // Reject duplicate authority/authentication headers rather than relying on Node's coalescing.
  for (const name of ['host', 'origin', 'authorization']) {
    if (request.rawHeaders.filter((_, i) => i % 2 === 0 && request.rawHeaders[i].toLowerCase() === name).length > 1) {
      throw new HttpError(400, 'INVALID_HEADERS', 'Duplicate security header.');
    }
  }
  if (request.socket.remoteAddress !== LOOPBACK || request.headers.host !== `${LOOPBACK}:${port}`) {
    throw new HttpError(403, 'INVALID_HOST', 'The local service authority is required.');
  }
  const origin = request.headers.origin;
  if (origin !== undefined && !origins.has(origin)) {
    throw new HttpError(403, 'INVALID_ORIGIN', 'The request origin is not allowed.');
  }
  const site = request.headers['sec-fetch-site'];
  if (site === 'cross-site') throw new HttpError(403, 'INVALID_ORIGIN', 'Cross-site requests are not allowed.');
  if (!['GET', 'HEAD'].includes(request.method ?? '') && origin === undefined) {
    throw new HttpError(403, 'ORIGIN_REQUIRED', 'Mutations require the configured local origin.');
  }
}

export function opaqueId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)) {
    throw new HttpError(422, 'INVALID_INPUT', 'Expected an opaque identifier.');
  }
  return value;
}

/** Resolve trusted startup configuration once, independent of HTTP input. */
export function storageRoot(checkoutRoot: string, configuredDirectory?: string): string {
  const root = path.resolve(checkoutRoot, configuredDirectory ?? '.local/storytelling-studio');
  // Reject existing symlinks/junctions in the configured chain. This does not defend
  // against a same-user process replacing directories after the check.
  rejectLinks(root);
  return root;
}

function rejectLinks(target: string): void {
  const parsed = path.parse(target);
  let current = parsed.root;
  for (const part of target.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory() || path.resolve(realpathSync(current)).toLowerCase() !== current.toLowerCase()) {
        throw new Error('Storage directories must not contain links or non-directory entries.');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
  }
}

/** Internal future storage layout helper. HTTP routes never accept a path. */
export function storageDirectory(root: string, area: 'assets' | 'jobs' | 'imports' | 'backups', id: string): string {
  if (!['assets', 'jobs', 'imports', 'backups'].includes(area)) throw new Error('Unknown storage area.');
  opaqueId(id);
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(id)) throw new Error('Reserved storage name.');
  const target = path.resolve(root, area, id);
  const relative = path.relative(root, target);
  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Storage escape rejected.');
  rejectLinks(target);
  return target;
}
