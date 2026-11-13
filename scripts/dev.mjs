import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readdir, realpath } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createStudio } from '../apps/studio/src/server.mjs';
import { createService } from '../apps/local-service/src/server.mjs';
import { SqliteProjectRepository } from '../apps/local-service/src/db/project-repository.ts';
import { applicationRoutes } from '../apps/local-service/src/services/application.ts';
import { newSessionToken, storageRoot } from '../apps/local-service/src/security.ts';

const root = await realpath(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
);
const directory = path.join(root, '.local', 'lifecycle');
const unavailable = 'Lifecycle record is incomplete, stale, or replaced. Inspect it before retrying.';

// The record is [requested, stopped, process]. Each flag has one writer
// role, and the file handle keeps both flags tied to the original instance.
const requestOffset = 1;
const stoppedOffset = 3;

function fileIdentity(stats) {
  if (!stats.isFile() || stats.ino === 0n || stats.nlink !== 1n) {
    throw new Error(unavailable);
  }
  return `${stats.dev}:${stats.ino}`;
}

const recordPath = (generation) => path.join(directory, `record-${generation}.json`);

async function latestGeneration() {
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error.code === 'ENOENT') return 0n;
    throw error;
  }
  let latest = 0n;
  for (const name of names) {
    const match = /^record-([1-9]\d*)\.json$/.exec(name);
    if (match && BigInt(match[1]) > latest) latest = BigInt(match[1]);
  }
  return latest;
}

async function openRecord(generation, mode) {
  const record = recordPath(generation);
  const identity = fileIdentity(await lstat(record, { bigint: true }));
  const file = await open(record, mode);
  try {
    return { file, record: await readRecord(file, identity) };
  } catch (error) {
    await file.close();
    throw error;
  }
}

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      const address = server.address();
      resolve(address.port);
    });
  });
}

function close(server) {
  if (!server?.listening) return;
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve(undefined));
    server.closeAllConnections();
  });
}

async function readFlag(file, position) {
  const flag = Buffer.alloc(1);
  const { bytesRead } = await file.read(flag, 0, 1, position);
  return bytesRead === 1 && flag.toString('ascii') === '1';
}

async function finishRecord(file, owner, published) {
  if (!published) {
    await file.truncate(0);
    await file.write(JSON.stringify([0, 0, owner]), 0, 'utf8');
  }
  // Retain the completed generation. Shutdown never removes a pathname that
  // another process could have reused while this handle was open.
  await file.write('1', stoppedOffset, 'ascii');
}

async function start() {
  await mkdir(directory, { recursive: true });
  const previous = await latestGeneration();
  if (previous) {
    const { file } = await openRecord(previous, 'r');
    try {
      if (!await readFlag(file, stoppedOffset)) {
        throw new Error('Lifecycle record exists. Check its status before retrying.');
      }
    } finally {
      await file.close();
    }
  }
  const file = await open(recordPath(previous + 1n), 'wx+').catch((error) => {
    if (error.code === 'EEXIST') throw new Error('Lifecycle record exists. Check its status before retrying.');
    throw error;
  });
  const proxy = { origin: '', token: newSessionToken() };
  const studio = createStudio({ proxy });
  let service, repository, routes;
  let interrupted = false;
  const onInterrupt = () => { interrupted = true; };
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onInterrupt);
  const owner = { instance: randomUUID(), root, pid: process.pid, file: '' };
  const controller = http.createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/status') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(owner));
  });

  let published = false;
  try {
    owner.file = fileIdentity(await file.stat({ bigint: true }));
    const studioPort = await listen(studio, Number(process.env.GSTORY_STUDIO_PORT || 4173));
    const dataDirectory = storageRoot(root, process.env.STORY_STUDIO_DATA_DIR);
    repository = new SqliteProjectRepository(dataDirectory);
    routes = applicationRoutes(repository, dataDirectory);
    service = createService({ repository, dataDirectory, studioOrigin: `http://127.0.0.1:${studioPort}`, sessionToken: proxy.token, extension: routes });
    const servicePort = await listen(service, Number(process.env.GSTORY_SERVICE_PORT || 0));
    proxy.origin = `http://127.0.0.1:${servicePort}`;
    const controlPort = await listen(controller);
    await file.writeFile(JSON.stringify([0, 0, {
      ...owner, studio: studioPort, service: servicePort, control: controlPort,
    }]));
    published = true;
    console.log([
      `Studio: http://127.0.0.1:${studioPort}/`,
      `Service: http://127.0.0.1:${servicePort}/health`,
      `PID: ${process.pid}`,
      'Press Ctrl+C to stop.',
    ].join('\n'));

    while (!interrupted && !await readFlag(file, requestOffset)) {
      await delay(100);
    }
  } finally {
    try {
      await Promise.all([studio, service, controller].map(close));
      await routes?.close();
      repository?.close();
      await finishRecord(file, owner, published);
    } finally {
      await file.close();
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onInterrupt);
    }
  }
  console.log('Stopped');
}

async function readRecord(file, pathIdentity) {
  let parsed;
  try {
    parsed = JSON.parse(await file.readFile('utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(unavailable);
    throw error;
  }
  const record = Array.isArray(parsed) && parsed[2];
  const identity = fileIdentity(await file.stat({ bigint: true }));
  if (!record || identity !== pathIdentity || record.root !== root || record.file !== identity
      || typeof record.instance !== 'string' || !record.instance
      || !Number.isSafeInteger(record.pid) || record.pid < 1) {
    throw new Error(unavailable);
  }
  return record;
}

const get = (port, route) => fetch(`http://127.0.0.1:${port}${route}`, {
  redirect: 'error',
  signal: AbortSignal.timeout(2000),
});

async function verifyOwner(record) {
  try {
    const response = await get(record.control, '/status');
    const owner = await response.json();
    if (response.ok && owner.root === record.root && owner.pid === record.pid
        && owner.instance === record.instance && owner.file === record.file) {
      return;
    }
  } catch {
    // A stale control port can be unavailable or answer with unrelated data.
  }
  throw new Error('Recorded process identity could not be verified.');
}

async function stop(file, record) {
  if (!await readFlag(file, requestOffset) && !await readFlag(file, stoppedOffset)) {
    try {
      await verifyOwner(record);
    } catch (error) {
      if (!await readFlag(file, requestOffset) && !await readFlag(file, stoppedOffset)) {
        throw error;
      }
    }
    await file.write('1', requestOffset, 'ascii');
  }
  const deadline = performance.now() + 5000;
  while (!await readFlag(file, stoppedOffset)) {
    if (performance.now() >= deadline) {
      throw new Error('Shutdown was not confirmed. Inspect the foreground terminal.');
    }
    await delay(100);
  }
  console.log('Stopped');
}

async function main() {
  const action = process.argv[2];
  if (action === 'start') return start();
  if (action !== 'status' && action !== 'stop') {
    throw new Error('Expected start, status, or stop');
  }
  const generation = await latestGeneration();
  if (!generation) {
    console.log('Stopped');
    return;
  }
  const { file, record } = await openRecord(generation, action === 'stop' ? 'r+' : 'r');
  try {
    if (await readFlag(file, stoppedOffset)) {
      console.log('Stopped');
      return;
    }
    if (![record.studio, record.service, record.control].every(
      (port) => Number.isInteger(port) && port > 0 && port <= 65535,
    )) throw new Error(unavailable);
    if (action === 'stop') return await stop(file, record);

    await verifyOwner(record);
    const responses = await Promise.all([
      get(record.studio, '/'),
      get(record.service, '/health'),
    ]);
    if (responses.some((response) => !response.ok)
        || await readFlag(file, requestOffset) || await readFlag(file, stoppedOffset)) {
      throw new Error('A server is not ready.');
    }
    console.log([
      `Ready: studio http://127.0.0.1:${record.studio}/`,
      `service http://127.0.0.1:${record.service}/health`,
      `PID ${record.pid}`,
    ].join('; '));
  } finally {
    await file.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
