import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
import { parseProject } from '../../../packages/project-schema/src/index.ts';
import type { ProjectDocument } from '../../../packages/project-schema/src/index.ts';
import {
  HttpError, LOOPBACK, MAX_JSON_BYTES, localOrigin, newSessionToken, opaqueId,
  requireLocalRequest, requireLoopback, requireSession, storageRoot,
} from './security.ts';

export type ProjectSummary = { id: string; title: string; headRevisionId: string; updatedAt: string };
export type RevisionEnvelope = { projectId: string; revisionId: string; document: ProjectDocument };
export type CreateProject = { title: string; clientMutationId: string };
export type SaveProject = { expectedRevisionId: string; clientMutationId: string; document: ProjectDocument };

/** D1-16 supplies durable transactions, conflicts, retry receipts and readiness. */
export interface ProjectRepository {
  ready(): boolean | Promise<boolean>;
  list(): unknown | Promise<unknown>;
  create(input: CreateProject): unknown | Promise<unknown>;
  get(projectId: string, revisionId?: string): unknown | Promise<unknown>;
  save(projectId: string, input: SaveProject): unknown | Promise<unknown>;
}

export type ServiceOptions = {
  host?: string;
  sessionToken?: string;
  studioOrigin?: string;
  dataDirectory?: string;
  maxJsonBytes?: number;
  repository?: ProjectRepository;
  extension?: (request: http.IncomingMessage, response: http.ServerResponse, target: string) => Promise<boolean>;
};

function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some(key => !keys.includes(key))
      || keys.some(key => !Object.hasOwn(value, key))) {
    throw new HttpError(422, 'INVALID_INPUT', 'Unexpected or missing fields.');
  }
  return value as Record<string, unknown>;
}

function title(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) {
    throw new HttpError(422, 'INVALID_INPUT', 'A title of 1 to 200 characters is required.');
  }
  return value;
}

function document(value: unknown): ProjectDocument {
  try { return parseProject(value); }
  catch { throw new HttpError(422, 'INVALID_DOCUMENT', 'The project document is invalid.'); }
}

function envelope(value: unknown, projectId?: string, revisionId?: string): RevisionEnvelope {
  const data = record(value, ['projectId', 'revisionId', 'document']);
  const result = { projectId: opaqueId(data.projectId), revisionId: opaqueId(data.revisionId), document: document(data.document) };
  if (result.document.id !== result.projectId || (projectId && result.projectId !== projectId)
      || (revisionId && result.revisionId !== revisionId)) throw new Error('Invalid repository revision.');
  return result;
}

function summaries(value: unknown): ProjectSummary[] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error('Project capacity exceeded.');
  const seen = new Set<string>();
  return value.map(item => {
    const data = record(item, ['id', 'title', 'headRevisionId', 'updatedAt']);
    const id = opaqueId(data.id);
    if (seen.has(id) || typeof data.updatedAt !== 'string'
        || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(data.updatedAt)
        || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error('Invalid repository summary.');
    seen.add(id);
    return { id, title: title(data.title), headRevisionId: opaqueId(data.headRevisionId), updatedAt: data.updatedAt };
  }).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.id.localeCompare(b.id));
}

function send(response: http.ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    connection: 'close',
  });
  response.end(JSON.stringify(value));
}

async function json(request: http.IncomingMessage, limit: number): Promise<unknown> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use UTF-8 application/json.');
  }
  if (request.headers['content-encoding'] !== undefined) {
    throw new HttpError(415, 'UNSUPPORTED_ENCODING', 'Encoded bodies are not supported.');
  }
  const chunks: Buffer[] = [];
  let length = 0;
  // Iteration ends immediately at the limit; no unbounded drain or JSON allocation.
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > limit) throw new HttpError(413, 'REQUEST_TOO_LARGE', 'The JSON request limit was exceeded.');
    chunks.push(chunk);
  }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
  catch { throw new HttpError(400, 'INVALID_JSON', 'A valid UTF-8 JSON body is required.'); }
}

/** Construct the boundary without listening or creating files. No token is returned over HTTP. */
export function createService(options: ServiceOptions = {}): http.Server {
  requireLoopback(options.host ?? LOOPBACK);
  const token = options.sessionToken ?? newSessionToken();
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Expected a 256-bit hexadecimal session token.');
  const studioOrigin = options.studioOrigin === undefined ? undefined : localOrigin(options.studioOrigin);
  const limit = options.maxJsonBytes ?? MAX_JSON_BYTES;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_JSON_BYTES) throw new Error('Invalid JSON size limit.');
  const checkout = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  // Resolve once from launcher configuration; never take a root from a request.
  storageRoot(checkout, options.dataDirectory ?? process.env.STORY_STUDIO_DATA_DIR);
  const repository = options.repository;

  const server = http.createServer({ maxHeaderSize: 8192, requestTimeout: 10_000, headersTimeout: 5000, connectionsCheckingInterval: 1000 }, (request, response) => {
    void handle(request, response).catch(error => {
      if (response.destroyed) return;
      const errorCodes: Record<string, number> = {
        UNAUTHORIZED: 401, INVALID_HEADERS: 400, INVALID_HOST: 403, INVALID_ORIGIN: 403,
        ORIGIN_REQUIRED: 403, REQUEST_TOO_LARGE: 413, INVALID_TARGET: 400,
        UNEXPECTED_BODY: 400, NOT_FOUND: 404, NOT_READY: 503, REVISION_CONFLICT: 409,
        INVALID_INPUT: 422, INVALID_DOCUMENT: 422, UNSUPPORTED_MEDIA_TYPE: 415,
        UNSUPPORTED_ENCODING: 415, INVALID_JSON: 400, METHOD_NOT_ALLOWED: 405,
      };
      const known = error instanceof HttpError && Object.hasOwn(errorCodes, error.code)
        && errorCodes[error.code] === error.status;
      // Exception messages and repository error details can contain private paths.
      const status = known ? error.status : 500;
      const code = known ? error.code : 'INTERNAL_ERROR';
      const messages: Record<string, string> = {
        UNAUTHORIZED: 'A valid local session is required.',
        INVALID_HOST: 'The local service authority is required.',
        INVALID_ORIGIN: 'The request origin is not allowed.',
        ORIGIN_REQUIRED: 'Mutations require the configured local origin.',
        REQUEST_TOO_LARGE: 'The JSON request limit was exceeded.',
        NOT_FOUND: 'The requested resource was not found.',
        NOT_READY: 'Project storage is not ready.',
        REVISION_CONFLICT: 'The saved head has changed.',
      };
      send(response, status, { code, message: messages[code] ?? 'The request could not be completed.', details: {}, retryable: status === 503 });
    });
  });
  server.maxRequestsPerSocket = 1;
  server.setTimeout(10_000, socket => socket.destroy());
  // The returned Node server must not be rebound to a wildcard, pipe, fd or DNS name.
  const listen = server.listen;
  server.listen = ((...args: unknown[]) => {
    let port: unknown;
    let host: unknown;
    let callback: (() => void) | undefined;
    if (typeof args[0] === 'object' && args[0] !== null) {
      const config = args[0] as Record<string, unknown>;
      if (Object.keys(config).some(key => !['port', 'host'].includes(key))) throw new Error('Unsupported listen options.');
      port = config.port; host = config.host;
      callback = typeof args[1] === 'function' ? args[1] as () => void : undefined;
    } else {
      port = args[0]; host = typeof args[1] === 'string' ? args[1] : undefined;
      callback = args.find(arg => typeof arg === 'function') as (() => void) | undefined;
      if (args.some(arg => typeof arg !== 'number' && typeof arg !== 'string' && typeof arg !== 'function')) throw new Error('Unsupported listen arguments.');
    }
    requireLoopback(host === undefined ? LOOPBACK : String(host));
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Expected a TCP port.');
    return Reflect.apply(listen, server, [{ port, host: LOOPBACK }, callback]) as http.Server;
  }) as http.Server['listen'];

  async function handle(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
    const port = (server.address() as AddressInfo).port;
    const origins = new Set([`http://${LOOPBACK}:${port}`]);
    if (studioOrigin) origins.add(studioOrigin);
    requireLocalRequest(request, port, origins);
    // Do not normalize/decode paths: encoded separators, dot segments, query paths,
    // absolute-form URLs and duplicate slashes must never turn into valid routes.
    const target = request.url ?? '';
    if (!/^\/[A-Za-z0-9/_-]*$/.test(target) || target.includes('//') || target.length > 512) {
      throw new HttpError(400, 'INVALID_TARGET', 'Expected a canonical API path.');
    }
    const length = request.headers['content-length'];
    const bodyLimit = ['/api/assets', '/api/package-import'].includes(target) && options.extension ? 64 * 1024 * 1024 : limit;
    if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > bodyLimit)) {
      throw new HttpError(413, 'REQUEST_TOO_LARGE', 'The JSON request limit was exceeded.');
    }
    if (['GET', 'HEAD'].includes(request.method ?? '')
        && (Number(length ?? 0) !== 0 || request.headers['transfer-encoding'] !== undefined)) {
      throw new HttpError(400, 'UNEXPECTED_BODY', 'Read requests cannot contain bodies.');
    }
    // Kept for the D1-02 lifecycle probe; this reports liveness, never database readiness.
    if (request.method === 'GET' && target === '/health') return send(response, 200, { status: 'ok' });
    requireSession(request, token);
    if (options.extension && await options.extension(request, response, target)) return;
    if (request.method === 'GET' && target === '/api/health') {
      const database = !!repository && await repository.ready() === true;
      return send(response, database ? 200 : 503, { runtime: 'ready', schema: 1, database: database ? 'ready' : 'unavailable' });
    }
    const match = /^\/api\/projects(?:\/([A-Za-z0-9][A-Za-z0-9_-]{0,127})(?:\/revisions\/([A-Za-z0-9][A-Za-z0-9_-]{0,127}))?)?$/.exec(target);
    if (!match) throw new HttpError(404, 'NOT_FOUND', 'Unknown route.');
    const [, projectId, revisionId] = match;
    const method = request.method;
    if (!(method === 'GET' || (method === 'POST' && !projectId) || (method === 'PUT' && projectId && !revisionId))) {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Unsupported method.');
    }
    let input: CreateProject | SaveProject | undefined;
    if (method === 'POST') {
      const data = record(await json(request, limit), ['title', 'clientMutationId']);
      input = { title: title(data.title), clientMutationId: opaqueId(data.clientMutationId) };
    } else if (method === 'PUT') {
      const data = record(await json(request, limit), ['expectedRevisionId', 'clientMutationId', 'document']);
      const parsed = document(data.document);
      if (parsed.id !== projectId) throw new HttpError(422, 'INVALID_DOCUMENT', 'Project IDs must match.');
      input = { expectedRevisionId: opaqueId(data.expectedRevisionId), clientMutationId: opaqueId(data.clientMutationId), document: parsed };
    }
    if (!repository || await repository.ready() !== true) throw new HttpError(503, 'NOT_READY', 'Project storage is not ready.');
    // Validation failures in a repository response are implementation errors, not client errors.
    const checked = <T>(validate: () => T): T => {
      try { return validate(); } catch { throw new Error('Invalid repository response.'); }
    };
    if (method === 'POST') {
      const result = await repository.create(input as CreateProject);
      return send(response, 201, checked(() => envelope(result)));
    }
    if (method === 'PUT') {
      const result = await repository.save(projectId!, input as SaveProject);
      return send(response, 200, checked(() => envelope(result, projectId)));
    }
    if (!projectId) {
      const result = await repository.list();
      return send(response, 200, checked(() => summaries(result)));
    }
    const result = await repository.get(projectId, revisionId);
    if (result === undefined || result === null) throw new HttpError(404, 'NOT_FOUND', 'Unknown revision.');
    return send(response, 200, checked(() => envelope(result, projectId, revisionId)));
  }
  return server;
}

