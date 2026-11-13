import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createConnection } from 'node:net';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createService } from '../../apps/local-service/src/server.ts';
import type { ServiceOptions, ProjectRepository } from '../../apps/local-service/src/server.ts';
import { HttpError, storageRoot, storageDirectory, localOrigin, newSessionToken } from '../../apps/local-service/src/security.ts';

const token = 'a'.repeat(64); // Synthetic test session; never used by a launcher.
const origin = 'http://127.0.0.1:43210';
const fixture = JSON.parse(readFileSync(new URL('../fixtures/synthetic-story/project.json', import.meta.url), 'utf8'));
const revision = { projectId: fixture.id, revisionId: 'revision-1', document: fixture };

function repository(): ProjectRepository {
  return {
    ready: () => true,
    list: () => [{ id: fixture.id, title: fixture.title, headRevisionId: 'revision-1', updatedAt: fixture.updatedAt }],
    create: () => structuredClone(revision),
    get: (projectId, revisionId) => projectId === fixture.id && (!revisionId || revisionId === 'revision-1') ? structuredClone(revision) : undefined,
    save: (_id, input) => {
      if (input.expectedRevisionId !== 'revision-1') throw new HttpError(409, 'REVISION_CONFLICT', 'Private internal details');
      return { ...structuredClone(revision), revisionId: 'revision-2', document: input.document };
    },
  };
}

async function running(t: TestContext, options: ServiceOptions = {}) {
  const server = createService({ sessionToken: token, studioOrigin: origin, repository: repository(), ...options });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const port = (server.address() as AddressInfo).port;
  const send = (target = '/api/projects', options: {
    method?: string; headers?: Record<string, string | string[]>; body?: string | Buffer; chunks?: string[];
  } = {}) => new Promise<{ status: number; body: unknown; text: string; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1', port, path: target, method: options.method ?? 'GET',
      headers: { authorization: `Bearer ${token}`, ...options.headers },
    }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; });
      response.on('end', () => resolve({ status: response.statusCode!, body: text ? JSON.parse(text) : undefined, text, headers: response.headers }));
      response.on('error', reject);
    });
    request.on('error', reject);
    if (options.chunks) for (const chunk of options.chunks) request.write(chunk);
    request.end(options.body);
  });
  return { server, send, port };
}

const mutationHeaders = { origin, 'content-type': 'application/json' };
const createBody = JSON.stringify({ title: 'Synthetic project', clientMutationId: 'mutation-1' });

function rawRequest(port: number, headers: string[], requestLine = 'GET /api/projects HTTP/1.1', body = ''): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port }, () => {
      socket.write(`${requestLine}\r\n${headers.join('\r\n')}\r\nConnection: close\r\n\r\n${body}`);
    });
    let result = '';
    socket.setEncoding('utf8');
    socket.on('data', chunk => { result += chunk; });
    socket.on('end', () => resolve(result));
    socket.on('error', reject);
  });
}

test('binding rejects wildcard, remote, IPv6, DNS names, pipes and handles', () => {
  for (const host of ['0.0.0.0', '192.0.2.1', '::', '::1', 'localhost', '127.0.0.2']) {
    assert.throws(() => createService({ host }), /loopback/);
    assert.throws(() => createService().listen(0, host), /loopback/);
    assert.throws(() => createService().listen({ port: 0, host }), /loopback/);
  }
  assert.throws(() => createService().listen('pipe-name'), /TCP port/);
  assert.throws(() => createService().listen({ path: 'pipe-name' }), /Unsupported/);
  assert.throws(() => createService().listen({ fd: 1 }), /Unsupported/);
});

test('default bind is loopback and the legacy launcher shares the boundary', async t => {
  const { createService: legacy } = await import('../../apps/local-service/src/server.mjs');
  assert.equal(legacy, createService);
  const server = legacy();
  await new Promise<void>(resolve => server.listen(0, resolve));
  assert.equal((server.address() as AddressInfo).address, '127.0.0.1');
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
});

test('liveness is public; readiness and project reads require the current session', async t => {
  const { send } = await running(t);
  assert.equal((await send('/health', { headers: { authorization: '' } })).status, 200);
  for (const target of ['/api/health', '/api/projects', `/api/projects/${fixture.id}`]) {
    for (const authorization of ['', 'Bearer incorrect', `Bearer ${'b'.repeat(64)}`, `Basic ${token}`]) {
      assert.equal((await send(target, { headers: { authorization } })).status, 401);
    }
    assert.equal((await send(target)).status, 200);
  }
  const session = await running(t, { sessionToken: 'c'.repeat(64) });
  assert.equal((await session.send()).status, 401);
  assert.match(newSessionToken(), /^[a-f0-9]{64}$/);
  assert.notEqual(newSessionToken(), newSessionToken());
  assert.throws(() => createService({ sessionToken: 'weak' }), /256-bit/);
});

test('authority, exact origins, fetch metadata and duplicate headers fail closed', async t => {
  const { send, port } = await running(t);
  for (const host of ['evil.example', `localhost:${port}`, `127.0.0.1:${port + 1}`, `127.0.0.1:${port}.evil.example`]) {
    assert.equal((await send('/api/projects', { headers: { host } })).status, 403);
  }
  for (const bad of ['null', 'https://evil.example', `${origin}/`, `${origin}.evil.example`, 'http://127.0.0.1:43211']) {
    assert.equal((await send('/api/projects', { headers: { origin: bad } })).status, 403);
    assert.equal((await send('/health', { headers: { origin: bad } })).status, 403);
  }
  for (const name of ['Origin', 'Authorization']) {
    const value = name === 'Origin' ? origin : name === 'Host' ? `127.0.0.1:${port}` : `Bearer ${token}`;
    assert.equal((await send('/api/projects', { headers: { [name]: [value, value] } })).status, 400);
  }
  assert.match(await rawRequest(port, [`Host: 127.0.0.1:${port}`, `Host: 127.0.0.1:${port}`, `Authorization: Bearer ${token}`]), /^HTTP\/1.1 400 /);
  assert.equal((await send('/api/projects', { headers: { origin, 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await send('/api/projects', { headers: { origin: `http://127.0.0.1:${port}` } })).status, 200);
  assert.equal((await send('/api/projects', { headers: { origin } })).status, 200);
  assert.equal((await send('/api/projects', { headers: { host: 'evil.example', 'x-forwarded-host': `127.0.0.1:${port}` } })).status, 403);
  assert.equal((await send('/api/projects', { method: 'OPTIONS', headers: { origin } })).status, 405);
  const response = await send();
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.equal(response.headers['cache-control'], 'no-store');
  for (const value of ['*', 'http://0.0.0.0:80', 'http://evil.example', `${origin}/`, 'http://user:pass@localhost:80', 'file:///tmp']) {
    assert.throws(() => localOrigin(value));
  }
});

test('mutations require origin, token, exact fields, document validation and matching IDs', async t => {
  let calls = 0;
  const repo = repository();
  repo.create = () => { calls++; return structuredClone(revision); };
  const { send } = await running(t, { repository: repo });
  const post = (body: string, headers: Record<string, string> = mutationHeaders) => send('/api/projects', { method: 'POST', headers, body });
  assert.equal((await post(createBody, { 'content-type': 'application/json' })).status, 403);
  assert.equal((await post(createBody, { ...mutationHeaders, authorization: '' })).status, 401);
  for (const value of [null, {}, { title: '', clientMutationId: 'm' }, { title: 'x', clientMutationId: '../m' },
    { title: 'x', clientMutationId: 'm', dataDirectory: 'private' }]) {
    assert.equal((await post(JSON.stringify(value))).status, 422);
  }
  assert.equal(calls, 0);
  assert.equal((await post(createBody)).status, 201);
  assert.equal(calls, 1);
  const save = (body: unknown) => send(`/api/projects/${fixture.id}`, { method: 'PUT', headers: mutationHeaders, body: JSON.stringify(body) });
  const input = { expectedRevisionId: 'revision-1', clientMutationId: 'm', document: structuredClone(fixture) };
  assert.equal((await save(input)).status, 200);
  assert.equal((await save({ ...input, expectedRevisionId: 'old' })).status, 409);
  assert.equal((await save({ ...input, document: { ...fixture, id: 'different' } })).status, 422);
  assert.equal((await save({ ...input, document: { ...fixture, schemaVersion: 99 } })).status, 422);
  assert.equal((await save({ ...input, document: { ...fixture, assets: [{ ...fixture.assets[0], path: '../secret' }] } })).status, 422);
});

test('fixed and chunked body limits, media type, encoding and malformed JSON', async t => {
  const { send, port } = await running(t, { maxJsonBytes: Buffer.byteLength(createBody) });
  const post = (body: string | Buffer, headers: Record<string, string> = mutationHeaders) => send('/api/projects', { method: 'POST', headers, body });
  assert.equal((await post(createBody)).status, 201);
  assert.equal((await post(`${createBody} `)).status, 413);
  assert.equal((await send('/api/projects', { method: 'POST', headers: mutationHeaders, chunks: [createBody, ' '] })).status, 413);
  const tooLarge = `${createBody} `;
  const headers = [`Host: 127.0.0.1:${port}`, `Authorization: Bearer ${token}`, `Origin: ${origin}`, 'Content-Type: application/json'];
  // Neither request finishes its body: rejection must happen before stream completion.
  assert.match(await rawRequest(port, [...headers, 'Transfer-Encoding: chunked'], 'POST /api/projects HTTP/1.1', `${Buffer.byteLength(tooLarge).toString(16)}\r\n${tooLarge}\r\n`), /^HTTP\/1.1 413 /);
  assert.match(await rawRequest(port, [...headers, 'Content-Length: 10000'], 'POST /api/projects HTTP/1.1'), /^HTTP\/1.1 413 /);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post(Buffer.from([0xff]))).status, 400);
  assert.equal((await post(createBody, { ...mutationHeaders, 'content-type': 'text/plain' })).status, 415);
  assert.equal((await post(createBody, { ...mutationHeaders, 'content-encoding': 'gzip' })).status, 415);
  assert.equal((await send('/api/projects', { headers: { 'content-length': '1' }, body: 'x' })).status, 400);
  assert.throws(() => createService({ maxJsonBytes: 0 }));
  assert.throws(() => createService({ maxJsonBytes: 1024 * 1024 + 1 }));
});

test('path escapes, arbitrary files, URL proxies and query credentials have no route', async t => {
  const { send } = await running(t);
  for (const target of ['/api/projects/../secret', '/api/projects/%2e%2e', '/api/projects/%252e%252e',
    '/api/projects/a%2fb', '/api/projects/a%5cb', '/api/projects/a\\b', '/api/projects/C:/secret',
    '/api/projects//secret', '/api/projects/a?path=/secret', '/api/projects?token=secret',
    '/api/files', '/api/assets/abc', '/api/proxy', '/api/projects/a/revisions/../secret', 'http://example.test/api/projects']) {
    const response = await send(target);
    assert.ok([400, 404].includes(response.status), `${target}: ${response.status}`);
    assert.doesNotMatch(response.text, /secret|example.test/);
  }
});

test('readiness is honest; missing and mismatched revisions fail; output errors are sanitized', async t => {
  const unavailable = await running(t, { repository: undefined });
  assert.equal((await unavailable.send('/api/health')).status, 503);
  assert.equal((await unavailable.send()).status, 503);
  const repo = repository();
  const { send } = await running(t, { repository: repo });
  assert.equal((await send(`/api/projects/${fixture.id}/revisions/revision-1`)).status, 200);
  assert.equal((await send(`/api/projects/${fixture.id}/revisions/other`)).status, 404);
  assert.equal((await send('/api/projects/other')).status, 404);
  repo.list = () => [
    { id: 'z', title: 'Z', headRevisionId: 'r', updatedAt: fixture.updatedAt },
    { id: 'a', title: 'A', headRevisionId: 'r', updatedAt: fixture.updatedAt },
    { id: 'b', title: 'B', headRevisionId: 'r', updatedAt: '2000-01-01T00:00:00Z' },
  ];
  assert.deepEqual((await send()).body, [
    { id: 'a', title: 'A', headRevisionId: 'r', updatedAt: fixture.updatedAt },
    { id: 'z', title: 'Z', headRevisionId: 'r', updatedAt: fixture.updatedAt },
    { id: 'b', title: 'B', headRevisionId: 'r', updatedAt: '2000-01-01T00:00:00Z' },
  ]);
  repo.get = () => ({ ...revision, projectId: 'other' });
  assert.equal((await send(`/api/projects/${fixture.id}`)).status, 500);
  repo.get = () => ({ ...revision, revisionId: 'other' });
  assert.equal((await send(`/api/projects/${fixture.id}/revisions/revision-1`)).status, 500);
  repo.list = () => [{ privatePath: 'PRIVATE-DETAIL' }];
  assert.equal((await send()).status, 500);
  repo.list = () => { throw new Error(`PRIVATE-DETAIL ${token}`); };
  const failed = await send();
  assert.equal(failed.status, 500);
  assert.doesNotMatch(failed.text, /PRIVATE-DETAIL|aaaaaaaa|stack/);
  repo.list = () => { throw new HttpError(500, `PRIVATE-DETAIL ${token}`, 'PRIVATE-DETAIL'); };
  assert.doesNotMatch((await send()).text, /PRIVATE-DETAIL|aaaaaaaa/);
});

test('project summaries sort by descending instant, then ID across timestamp precisions', async t => {
  const repo = repository();
  const { send } = await running(t, { repository: repo });
  const summaries = [
    { id: 'z', title: 'Z', headRevisionId: 'r', updatedAt: '2026-11-13T12:00:00Z' },
    { id: 'a', title: 'A', headRevisionId: 'r', updatedAt: '2026-11-13T12:00:00.000Z' },
    { id: 'b', title: 'B', headRevisionId: 'r', updatedAt: '2026-11-13T12:00:00.999Z' },
    { id: 'c', title: 'C', headRevisionId: 'r', updatedAt: '2026-11-13T12:00:00.001Z' },
    { id: 'd', title: 'D', headRevisionId: 'r', updatedAt: '2026-11-13T11:59:59.999Z' },
  ];
  const expected = [summaries[2], summaries[3], summaries[1], summaries[0], summaries[4]];
  for (const input of [summaries, [...summaries].reverse()]) {
    repo.list = () => input;
    const response = await send();
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, expected);
  }
});

test('storage uses startup configuration and rejects path components and links', async t => {
  const checkout = fileURLToPath(new URL('../../', import.meta.url));
  const parent = path.join(checkout, '.local');
  await mkdir(parent, { recursive: true });
  const temporary = await mkdtemp(path.join(parent, 'security-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  assert.equal(storageRoot(checkout), path.join(checkout, '.local', 'storytelling-studio'));
  assert.equal(storageRoot(checkout, temporary), temporary);
  for (const id of ['../secret', '/secret', 'C:\\secret', 'a/b', 'a\\b', 'x:y', '%2e%2e', '.', '..', '', 'CON', 'lpt1']) {
    assert.throws(() => storageDirectory(temporary, 'jobs', id));
  }
  assert.equal(storageDirectory(temporary, 'jobs', 'job-1'), path.join(temporary, 'jobs', 'job-1'));
  const outside = path.join(temporary, 'elsewhere');
  await mkdir(outside);
  // Windows junctions do not require symlink privilege and stay within this test root.
  await symlink(outside, path.join(temporary, 'jobs'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => storageDirectory(temporary, 'jobs', 'job-1'), /links/);
  assert.throws(() => storageRoot(checkout, path.join(temporary, 'jobs')), /links/);
});
