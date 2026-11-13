import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { test } from 'node:test';
import { openSandboxedBrowser } from '../../apps/renderer/src/sandboxed-browser.ts';
import { createServer } from 'vite';

test('MapLibre bridge in Chromium', { timeout: 90_000 }, async t => {
  assert.ok(process.env.GSTORY_CHROME, 'Set GSTORY_CHROME to an installed Chromium executable');
  const cacheRoot = new URL('../../.local/d1-09-prerequisite/', import.meta.url);
  await mkdir(cacheRoot, { recursive: true });
  const cacheDir = await mkdtemp(new URL('adapter-vite-', cacheRoot));
  const vite = await createServer({
    configFile: false,
    cacheDir,
    // The browser imports this native ESM graph through a diagnostic route.
    // Do not scan unrelated application entries or wait for dependency discovery.
    optimizeDeps: { noDiscovery: true, include: [], exclude: ['maplibre-gl'] },
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
    plugins: [{
      name: 'bridge-test-routes',
      configureServer(server) {
        server.middlewares.use('/__bridge', (_, response) => {
          response.setHeader('Content-Type', 'text/html');
          response.end('<!doctype html><meta charset="utf-8"><title>Map adapter checks</title>');
        });
        server.middlewares.use('/__hold-font', () => {});
      },
    }],
  });
  let browser;
  t.after(async () => {
    try {
      await browser?.close({ silent: true });
    } finally {
      await vite.close();
    }
  });
  await vite.listen();
  const url = new URL('/__bridge', vite.resolvedUrls.local[0]);

  browser = await openSandboxedBrowser(process.env.GSTORY_CHROME);
  const page = await browser.newPage({
    context: () => Promise.resolve(null),
    indent: false,
    logLevel: 'error',
    onBrowserLog: null,
    onLog: () => {},
    pageIndex: 0,
  });
  const client = page._client();
  await client.send('Network.enable');
  const external = [];
  client.on('Network.requestWillBeSent', ({ request }) => {
    const requested = new URL(request.url);
    if (requested.protocol.startsWith('http') && requested.origin !== url.origin) {
      external.push(request.url);
    }
  });
  await page.goto({ url: url.href, timeout: 30_000 });

  for (const name of [
    'seekAndRecreate', 'fixturePrerequisite', 'supersededAndDisposed', 'fixedViewport', 'constrainedCamera',
    'resourceFailures', 'contextLoss', 'timeouts',
  ]) {
    await t.test(name, async () => {
      t.diagnostic(`Browser case: ${name}`);
      await page.evaluate(async name => {
        const cases = await import('/tests/map-adapter/bridge.browser.mjs');
        await cases[name]();
      }, name);
    });
  }
  assert.deepEqual(external, []);
});

