import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from '@remotion/renderer';
import vue from '@vitejs/plugin-vue';
import { createServer } from 'vite';

test('Vue preview conceals stale frames and recovers', { timeout: 90_000 }, async t => {
  assert.ok(process.env.GSTORY_CHROME, 'Set GSTORY_CHROME to an installed Chromium executable');
  const vite = await createServer({
    configFile: false,
    plugins: [vue(), {
      name: 'preview-test-route',
      configureServer(server) {
        server.middlewares.use('/__preview', (_, response) => {
          response.setHeader('Content-Type', 'text/html');
          response.end('<!doctype html><div id="app"></div><script type="module" src="/apps/studio/src/main.js"></script>');
        });
      },
    }],
    server: { host: '127.0.0.1', port: 0, hmr: false },
  });
  let browser;
  t.after(async () => {
    try { await browser?.close({ silent: true }); } finally { await vite.close(); }
  });
  await vite.listen();
  browser = await openBrowser('chrome', {
    browserExecutable: process.env.GSTORY_CHROME,
    chromiumOptions: { gl: 'swangle' },
    logLevel: 'error',
  });
  const page = await browser.newPage({
    context: () => Promise.resolve(null), indent: false, logLevel: 'error',
    onBrowserLog: null, onLog: () => {}, pageIndex: 0,
  });
  await page.goto({ url: new URL('/__preview', vite.resolvedUrls.local[0]).href, timeout: 30_000 });
  await page.evaluate(async () => {
    const wait = async predicate => {
      const deadline = Date.now() + 20_000;
      while (!predicate()) {
        if (Date.now() > deadline) throw new Error('Timed out waiting for preview');
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    };
    const input = document.querySelector('#frame');
    const host = document.querySelector('.surface');
    const viewport = document.querySelector('.viewport');
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const setFrame = value => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    await wait(() => window.__GSTORY_BRIDGE__?.readiness === 'ready');
    const canvas = host.querySelector('canvas');
    check(canvas && getComputedStyle(host).opacity === '1', 'Ready canvas must be visible');
    const dimensions = [viewport.clientWidth, viewport.clientHeight, canvas.width, canvas.height];
    for (const value of ['300', '']) {
      setFrame(value);
      await wait(() => window.__GSTORY_BRIDGE__.readiness === 'failed');
      check(document.querySelector('[role=status]').textContent.includes('Frame error'), 'Failure must be announced');
      check(getComputedStyle(host).opacity === '0' && host.inert, 'Failed surface must be concealed and inert');
      check(host.querySelector('canvas') === canvas, 'Prior canvas remains mounted for this regression');
      check(JSON.stringify([viewport.clientWidth, viewport.clientHeight, canvas.width, canvas.height]) === JSON.stringify(dimensions), 'Concealment must preserve dimensions');
      setFrame('1');
      await wait(() => window.__GSTORY_BRIDGE__.readiness === 'ready' && window.__GSTORY_BRIDGE__.requestedFrame === 1);
      check(getComputedStyle(host).opacity === '1' && !host.inert, 'Valid frame must recover');
    }
    input.focus();
  });
  const client = page._client();
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  assert.equal(await page.evaluate(() => document.activeElement.value), '2');
});
