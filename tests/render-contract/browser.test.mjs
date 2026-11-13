import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { capture, faultCases, observeNetwork } from './browser.mjs';
import { decodePng, encodePng, sha256 } from './compare.mjs';

const require = createRequire(import.meta.url);
assert.equal(require('@remotion/renderer/package.json').version, '4.0.542');
const { CDPSession } = require(join(dirname(require.resolve('@remotion/renderer/package.json')), 'dist/browser/Connection.js'));

// Exercise the installed renderer's response envelope without launching a browser.
function protocolPage(respond) {
  let sequence = 0, session;
  const commands = [];
  const connection = {
    _rawSend({ method, params }) {
      const id = ++sequence;
      commands.push({ method, params });
      queueMicrotask(() => session._onMessage({ id, result: respond(method, params) }, 128));
      return id;
    },
  };
  session = new CDPSession(connection, 'page', 'regression');
  return { _client: () => session, evaluate: async () => {}, commands, session };
}

test('resource observer hashes text and binary bodies from pinned CDP replies', async () => {
  const style = Buffer.from('{"version":8}'), font = Buffer.from([0, 255, 1, 128]);
  const page = protocolPage((method, params) => method === 'Fetch.getResponseBody'
    ? params.requestId === 'style'
      ? { body: style.toString('utf8'), base64Encoded: false }
      : { body: font.toString('base64'), base64Encoded: true }
    : {});
  const network = await observeNetwork(page, 'http://localhost');
  for (const [requestId, path] of [['style', 'bridge-style.json'], ['font', 'Inter-Regular.woff2']]) {
    page.session.emit('Fetch.requestPaused', { requestId, resourceType: 'Fetch', responseStatusCode: 200, request: { url: `http://localhost/${path}` } });
  }
  await network.settled();
  assert.deepEqual(network.resources, [
    { id: 'fixture-style', status: 200, sha256: sha256(style) },
    { id: 'fixture-font', status: 200, sha256: sha256(font) },
  ]);
});

test('resource faults preserve URL modules without depending on CDP resource classification', async () => {
  for (const fault of faultCases) for (const resourceType of ['Fetch', 'XHR', 'Other']) {
    const page = protocolPage(() => ({ body: 'module source', base64Encoded: false }));
    const network = await observeNetwork(page, 'http://localhost', fault);
    const path = `/tests/fixtures/synthetic-story/assets/${fault.match}`;
    for (const [index, query] of ['?import&url', '?url', '?url&t=123', '?t=123&import&url'].entries()) {
      const requestId = `module-${index}`, url = `http://localhost${path}${query}`;
      page.session.emit('Fetch.requestPaused', { requestId, resourceType, request: { url } });
      page.session.emit('Network.responseReceived', { requestId, type: resourceType, response: { url, status: 200 } });
      page.session.emit('Network.loadingFinished', { requestId });
    }
    // A script request remains a module even without Vite's query flags.
    page.session.emit('Fetch.requestPaused', { requestId: 'script', resourceType: 'Script', request: { url: `http://localhost${path}` } });
    page.session.emit('Network.responseReceived', { requestId: 'script', type: 'Script', response: { url: `http://localhost${path}`, status: 200 } });
    page.session.emit('Network.loadingFinished', { requestId: 'script' });
    await network.settled();
    assert.deepEqual(page.commands.filter(c => c.method === 'Fetch.continueRequest').map(c => c.params.requestId),
      ['module-0', 'module-1', 'module-2', 'module-3', 'script']);
    assert.equal(page.commands.some(c => c.method === 'Fetch.fulfillRequest' || c.method === 'Fetch.getResponseBody'), false);
    assert.deepEqual(network.resources, [], 'URL module source must not count as pinned asset bytes');
    assert.throws(() => network.assertInjected(), /was not exercised/);

    page.session.emit('Fetch.requestPaused', { requestId: 'asset', resourceType,
      request: { url: `http://localhost${path}` } });
    await network.settled();
    network.assertInjected();
    const fulfilled = page.commands.filter(c => c.method === 'Fetch.fulfillRequest');
    assert.equal(fulfilled.length, fault.hold ? 0 : 1);
    assert.equal(page.commands.some(c => c.method === 'Fetch.continueRequest' && c.params.requestId === 'asset'), false);
    if (!fault.hold) {
      assert.equal(fulfilled[0].params.requestId, 'asset');
      assert.equal(fulfilled[0].params.responseCode, fault.response);
      assert.equal(Buffer.from(fulfilled[0].params.body, 'base64').toString(),
        fault.body ?? 'Required fixture resource is missing');
    }
  }
});

test('resource observer hashes raw responses with alternate CDP types and reports missed interception', async () => {
  const body = Buffer.from('{"version":8}');
  const page = protocolPage(() => ({ body: body.toString(), base64Encoded: false }));
  const fault = faultCases[0];
  const network = await observeNetwork(page, 'http://localhost', fault);
  for (const type of ['XHR', 'Other']) {
    page.session.emit('Fetch.requestPaused', { requestId: type, resourceType: type, responseStatusCode: 200,
      request: { url: 'http://localhost/bridge-style.json' } });
  }
  page.session.emit('Fetch.requestPaused', { requestId: 'module', resourceType: 'Script',
    request: { url: 'http://localhost/bridge-style.json?import&url' } });
  await network.settled();
  assert.deepEqual(network.resources, ['XHR', 'Other'].map(() => ({ id: 'fixture-style', status: 200, sha256: sha256(body) })));
  assert.throws(() => network.assertInjected(), /asset requests:.*bridge-style.json\?import&url.*Script/);
});

test('capture decodes pinned CDP screenshot replies for full and isolated overlay images', async () => {
  const image = { width: 2, height: 1, rgba: Buffer.from([10, 20, 30, 255, 1, 2, 3, 0]) };
  const png = encodePng(image);
  const page = protocolPage(method => method === 'Page.captureScreenshot' ? { data: png.toString('base64') } : {});
  for (const overlay of [false, true]) {
    assert.deepEqual(decodePng(await capture(page, 2, 1, overlay)), image);
  }
  const captures = page.commands.filter(command => command.method === 'Page.captureScreenshot');
  assert.equal(captures.length, 2);
  assert.deepEqual(captures[0].params.clip, { x: 0, y: 0, width: 2, height: 1, scale: 1 });
  assert.deepEqual(page.commands.at(-1), { method: 'Emulation.setDefaultBackgroundColorOverride', params: undefined });
});


test('only confirmed cancelled interceptions can be discarded', async () => {
  for (const cancelled of [true, false]) {
    const session = new (require('node:events').EventEmitter)();
    session.send = async method => {
      if (method === 'Fetch.continueRequest') throw new Error('Protocol error: Invalid InterceptionId.');
      return { value: {} };
    };
    const network = await observeNetwork({ _client: () => session }, 'http://localhost');
    if (cancelled) session.emit('Network.loadingFailed', { requestId: 'aborted', canceled: true });
    session.emit('Fetch.requestPaused', { requestId: 'interception', networkId: 'aborted', resourceType: 'Fetch', request: { url: 'http://localhost/font' } });
    if (cancelled) await network.settled();
    else await assert.rejects(network.settled(), /Invalid InterceptionId/);
  }
});
