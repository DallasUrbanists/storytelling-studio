import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { sha256 } from './compare.mjs';

const require = createRequire(import.meta.url);
const timeout = 70_000;

/** These private APIs are deliberately restricted to the pinned renderer test harness. */
export function rendererHooks() {
  assert.equal(require('@remotion/renderer/package.json').version, '4.0.542');
  const directory = dirname(require.resolve('@remotion/renderer/package.json'));
  return {
    ...require(join(directory, 'dist/set-props-and-env.js')),
    ...require(join(directory, 'dist/seek-to-frame.js')),
  };
}

export async function previewServer(cacheDir) {
  const [{ createServer }, { default: vue }] = await Promise.all([import('vite'), import('@vitejs/plugin-vue')]);
  const server = await createServer({
    configFile: false, cacheDir,
    optimizeDeps: { noDiscovery: true, include: ['vue', 'quasar', 'maplibre-gl'] },
    plugins: [vue(), {
      name: 'render-contract-preview',
      configureServer(vite) {
        vite.middlewares.use('/__parity', (_, response) => {
          response.setHeader('Content-Type', 'text/html');
          response.end('<!doctype html><meta charset="utf-8"><div id="app"></div><script type="module" src="/apps/studio/src/main.js"></script>');
        });
      },
    }],
    server: { host: '127.0.0.1', port: 0, hmr: false },
  });
  try { await server.listen(); return server; }
  catch (error) { await server.close(); throw error; }
}

export const faultCases = Object.freeze([
  { name: 'missing-style', resource: 'fixture-style', code: 'resource', match: 'bridge-style.json', response: 404 },
  { name: 'missing-font', resource: 'fixture-font', code: 'resource', match: 'Inter-Regular.woff2', response: 404 },
  { name: 'invalid-font', resource: 'fixture-font', code: 'resource', match: 'Inter-Regular.woff2', response: 200, body: 'invalid font bytes' },
  { name: 'unsupported-tile-style', resource: 'fixture-style', code: 'resource', match: 'bridge-style.json', response: 200,
    body: JSON.stringify({ version: 8, sources: { missing: { type: 'raster', tiles: ['/missing-tile/{z}/{x}/{y}'] } }, layers: [] }) },
  { name: 'initialization-timeout', resource: 'fixture-font', code: 'initialization-timeout', match: 'Inter-Regular.woff2', hold: true },
]);

function fixtureResource(url, resourceType) {
  // Vite also requests these paths as Script modules exporting an asset URL.
  // Fetch interception and Network observation can report different types.
  // Exclude module URLs explicitly rather than requiring the Fetch type.
  const parsed = new URL(url);
  if (resourceType === 'Script' || parsed.searchParams.has('import') || parsed.searchParams.has('url')) return null;
  const path = parsed.pathname;
  return path.endsWith('/bridge-style.json') ? 'fixture-style'
    : path.endsWith('/Inter-Regular.woff2') ? 'fixture-font' : null;
}

/** Capture successful resource bytes and inject failures before either actual host starts. */
export async function observeNetwork(page, origin, fault) {
  const client = page._client(), resources = [], errors = [], pending = new Set(), requests = new Map();
  const observed = [];
  let injected = 0;
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  client.on('Fetch.requestPaused', event => {
    const operation = (async () => {
      const url = new URL(event.request.url);
      if (url.pathname.endsWith('/bridge-style.json') || url.pathname.endsWith('/Inter-Regular.woff2')) {
        observed.push({ path: url.pathname + url.search, resourceType: event.resourceType });
      }
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) {
        errors.push(`Unexpected remote request: ${url.origin}${url.pathname}`);
        await client.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' });
      } else if (fault && fixtureResource(url, event.resourceType) === fault.resource && url.pathname.includes(fault.match)) {
        injected++;
        if (!fault.hold) await client.send('Fetch.fulfillRequest', {
          requestId: event.requestId, responseCode: fault.response,
          body: Buffer.from(fault.body ?? 'Required fixture resource is missing').toString('base64'),
          responseHeaders: [{ name: 'Content-Type', value: fault.match.endsWith('.json') ? 'application/json' : 'application/octet-stream' }],
        });
        // A held resource remains pending until the adapter's own initialization deadline.
      } else await client.send('Fetch.continueRequest', { requestId: event.requestId });
    })().catch(error => errors.push(String(error)));
    pending.add(operation); void operation.finally(() => pending.delete(operation));
  });
  client.on('Network.responseReceived', event => {
    const id = fixtureResource(event.response.url, event.type);
    if (id) requests.set(event.requestId, { id, status: event.response.status });
  });
  client.on('Network.loadingFinished', event => {
    if (!requests.has(event.requestId)) return;
    // Remotion 4.0.542 wraps CDP results in { value, size }.
    const operation = client.send('Network.getResponseBody', { requestId: event.requestId }).then(({ value: body }) => {
      resources.push({ ...requests.get(event.requestId), sha256: sha256(Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8')) });
    }).catch(error => errors.push(String(error)));
    pending.add(operation); void operation.finally(() => pending.delete(operation));
  });
  return {
    resources,
    async settled() { await Promise.all([...pending]); assert.deepEqual(errors, []); },
    assertInjected() { assert.ok(injected > 0, `Fault ${fault.name} was not exercised; asset requests: ${JSON.stringify(observed)}`); },
  };
}

export async function openHost({ browser, host, variant, project, vueUrl, remotionServer, composition, fault }) {
  const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false,
    pageIndex: 0, onBrowserLog: null, onLog: () => {} });
  try {
    const { width, height } = project.outputVariants[variant];
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    const url = host === 'vue' ? vueUrl : remotionServer.serveUrl;
    const network = await observeNetwork(page, new URL(url).origin, fault);
    const hooks = rendererHooks();
    if (host === 'vue') {
      await page.goto({ url, timeout });
      await page.evaluate(async () => {
        const end = Date.now() + 60_000;
        while (!document.querySelector('#frame')) {
          if (Date.now() > end) throw new Error('Vue preview did not mount');
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        const style = document.head.appendChild(document.createElement('style'));
        style.textContent = 'html,body {margin:0!important;padding:0!important;overflow:hidden!important} '
          + '.viewport {position:fixed!important;left:0!important;top:0!important;z-index:9999} '
          + '.surface {transform:none!important} '
          + '.viewport.landscape {width:1920px!important;height:1080px!important} '
          + '.viewport.portrait {width:1080px!important;height:1920px!important}';
      });
    } else {
      await hooks.setPropsAndEnv({ page, serveUrl: url, initialFrame: fault ? 149 : 0,
        serializedInputPropsWithCustomSchema: JSON.stringify({ project }), envVariables: {},
        timeoutInMilliseconds: timeout, proxyPort: remotionServer.offthreadPort, retriesRemaining: 0,
        audioEnabled: false, videoEnabled: true, indent: false, logLevel: 'error',
        onServeUrlVisited: () => {}, isMainTab: true, mediaCacheSizeInBytes: null,
        preferredEffectBackend: 'auto', initialMemoryAvailable: null, darkMode: false, sampleRate: 48000 });
      await page.evaluate(({ composition, project }) => {
        window.remotion_setBundleMode({ type: 'composition', compositionName: composition.id,
          serializedResolvedPropsWithSchema: JSON.stringify({ ...composition.props, project }),
          compositionDurationInFrames: composition.durationInFrames, compositionFps: composition.fps,
          compositionHeight: composition.height, compositionWidth: composition.width });
      }, { composition, project });
    }
    const seek = async frame => {
      if (host === 'vue') {
        await page.evaluate(({ frame, variant }) => {
          const select = document.querySelector('#variant');
          select.value = variant; select.dispatchEvent(new Event('change', { bubbles: true }));
          const input = document.querySelector('#frame');
          input.value = String(frame); input.dispatchEvent(new Event('input', { bubbles: true }));
        }, { frame, variant });
      } else if (!fault) {
        await hooks.seekToFrame({ page, composition: composition.id, frame, attempt: 0,
          videoEnabled: true, audioEnabled: false, timeoutInMilliseconds: timeout, logLevel: 'error', indent: false });
      }
      const diagnostic = await page.evaluate(async ({ frame, variant, host }) => {
        const end = Date.now() + 65_000;
        while (Date.now() < end) {
          const d = window.__GSTORY_BRIDGE__;
          const status = d?.readiness ?? d?.status;
          if (d?.requestedFrame === frame && (d.variant ?? d.variantId) === variant
              && ['ready', 'failed'].includes(status)) {
            // Synchronize Vue's reactive concealment/status DOM with its diagnostic.
            await new Promise(resolve => requestAnimationFrame(resolve));
            return { ...d, renderReady: host === 'remotion' ? window.remotion_renderReady : null,
              cancelled: host === 'remotion' ? window.remotion_cancelledError ?? null : null };
          }
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        throw new Error(`No terminal ${host} diagnostic for ${variant} frame ${frame}`);
      }, { frame, variant, host });
      await network.settled();
      return diagnostic;
    };
    return { page, seek, network, close: () => page.close() };
  } catch (error) { await page.close(); throw error; }
}

/** Inspect the real host DOM and raw MapLibre canvas independently of the pixel comparison. */
export async function inspectContent(page) {
  return page.evaluate(() => {
    const host = document.querySelector('.surface, [data-testid="bridge-frame"]');
    const svg = host.querySelector('svg[viewBox]'), canvas = host.querySelector('canvas');
    const gl = canvas.getContext('webgl2'), pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let contextPixels = 0;
    for (let p = 0; p < pixels.length; p += 4) {
      if (pixels[p + 3] === 255 && (pixels[p] !== 245 || pixels[p + 1] !== 244 || pixels[p + 2] !== 237)) contextPixels++;
    }
    const dim = svg.querySelector('[data-outside-dimming]');
    const annotations = [...svg.querySelectorAll('[data-annotation]')].map(group => {
      const text = group.querySelector('text'), box = text.getBBox();
      return { id: group.dataset.annotation, text: text.textContent,
        opacity: Number(group.getAttribute('opacity')), lines: group.querySelectorAll('line').length,
        bounds: { x: box.x, y: box.y, width: box.width, height: box.height } };
    });
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      canvas: [canvas.width, canvas.height], contextPixels,
      mapPainted: pixels.subarray(0, 4).join() === '245,244,237,255' && contextPixels > 0,
      layers: [...svg.querySelectorAll('[data-layer]')].map(group => group.dataset.layer),
      annotations, dim: dim?.getAttribute('data-outside-dimming') ?? null,
      dimFirst: !dim || svg.firstElementChild === dim,
      fontsReady: [...svg.querySelectorAll('text')].every(text => document.fonts.check(`30px ${text.getAttribute('font-family')}`)),
      svg: svg.outerHTML.replace(/GstoryBridge\d+/g, 'GstoryBridgePINNED'),
      environment: { userAgent: navigator.userAgent, pixelRatio: devicePixelRatio,
        glVersion: gl.getParameter(gl.VERSION),
        renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) },
    };
  });
}

/** Crop the full-size surface; isolate the SVG for a separate authored-edge comparison. */
export async function capture(page, width, height, overlayOnly = false) {
  const client = page._client();
  if (overlayOnly) {
    await client.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await page.evaluate(() => {
      const style = document.head.appendChild(document.createElement('style'));
      style.id = 'parity-overlay-capture';
      style.textContent = '* {background:transparent!important} '
        + 'canvas,.maplibregl-control-container,main>h1,main>p,.controls,[role=status] {visibility:hidden!important}';
    });
  }
  try {
    const { value: image } = await client.send('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    return Buffer.from(image.data, 'base64');
  } finally {
    if (overlayOnly) {
      await page.evaluate(() => document.querySelector('#parity-overlay-capture')?.remove());
      await client.send('Emulation.setDefaultBackgroundColorOverride');
    }
  }
}

export async function verifyFault(session, host, fault) {
  const diagnostic = await session.seek(149);
  session.network.assertInjected();
  assert.equal(diagnostic.readiness ?? diagnostic.status, 'failed', 'Failed resource was captured as ready');
  assert.equal(diagnostic.stateHash, null, 'Failure retained a ready state hash');
  const message = typeof diagnostic.error === 'string' ? diagnostic.error : diagnostic.error?.message;
  assert.match(message, /Frame 149/);
  assert.ok(message.includes(fault.resource), 'Failure lost required resource identity');
  if (host === 'remotion') {
    assert.equal(diagnostic.error.code, fault.code);
    assert.equal(diagnostic.renderReady, false, 'Failed delay handle was released');
    assert.ok(diagnostic.cancelled, 'Remotion did not cancel the failed render');
  } else {
    assert.equal(await session.page.evaluate(() => {
      const host = document.querySelector('.surface');
      return host.inert && getComputedStyle(host).opacity === '0'
        && document.querySelector('[role=status]').textContent.includes('Frame error');
    }), true, 'Vue failure must conceal the surface and announce the error');
  }
  return diagnostic;
}
