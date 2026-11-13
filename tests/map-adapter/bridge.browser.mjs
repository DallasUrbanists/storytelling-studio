import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import { mount } from '../../packages/map-adapter/src/mount.ts';
import { parseProject } from '../../packages/project-schema/src/index.ts';
import { evaluateFrame } from '../../packages/story-core/src/index.ts';
import fixture from '../fixtures/synthetic-story/project.json';
import styleUrl from '../fixtures/synthetic-story/assets/bridge-style.json?url&no-inline';
import fontUrl from '../fixtures/synthetic-story/assets/Inter-Regular.woff2?url&no-inline';

setWorkerUrl(new URL('/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', location.href).href);

const project = parseProject(fixture);
const resources = {
  style: { id: 'fixture-style', url: styleUrl },
  font: { id: 'fixture-font', url: fontUrl },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function rejects(promise, code, requestId, resourceId) {
  try {
    await promise;
  } catch (error) {
    assert(error.code === code, `Expected ${code}, got ${error.stack}`);
    assert(error.request.requestId === requestId, `Wrong failed request: ${error.message}`);
    assert(error.resourceId === resourceId, `Wrong failed resource: ${error.message}`);
    return;
  }
  throw new Error(`Expected frame ${requestId} to fail with ${code}`);
}

async function withSurface(test, variant = 'portrait', assets = resources, options) {
  const container = document.body.appendChild(document.createElement('div'));
  const frame = number => evaluateFrame(project, variant, number);
  const surface = mount(container, assets, frame(0).viewport, options);
  try {
    await test({ container, surface, frame });
  } finally {
    surface.dispose();
    container.remove();
  }
}

export async function seekAndRecreate() {
  let portraitPath;
  const initialFonts = document.fonts.size;
  await withSurface(async ({ container, surface, frame }) => {
    const first = surface.applyFrame(frame(149), 'first');
    assert(surface.inspectReadiness().status === 'pending', 'First request must be pending');
    const ready = await first;
    assert(ready.requestId === 'first' && ready.frame === 149, 'Wrong ready frame');
    const svg = container.querySelector('svg[viewBox]');
    const canvas = container.querySelector('canvas');
    assert(canvas.width === 1080 && canvas.height === 1920, 'Portrait canvas dimensions are wrong');
    const gl = canvas.getContext('webgl2');
    const pixel = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    assert(pixel[0] === 245 && pixel[1] === 244 && pixel[2] === 237 && pixel[3] === 255,
      `Map canvas was blank or unpainted: ${pixel}`);
    const text = svg.querySelector('[data-annotation] text');
    assert(text?.textContent === 'Fictional place', 'Expected fixture label');
    assert(document.fonts.check(`30px ${text.getAttribute('font-family')}`), 'Font is not ready');
    const snapshot = svg.innerHTML;
    const trace = () => svg.querySelector('[data-layer="line-layer"] path');
    portraitPath = trace().getAttribute('d');

    await surface.applyFrame(frame(149), 'repeated');
    assert(surface.inspectReadiness().request.requestId === 'repeated', 'Repeated camera reused readiness');
    assert(svg.innerHTML === snapshot, 'Repeated frame changed the overlay');
    await surface.applyFrame(frame(0), 'start');
    assert(!trace() && !svg.querySelector('[data-annotation]'), 'Trace or label survived seek to zero');
    await surface.applyFrame(frame(299), 'end');
    assert(trace() && !svg.querySelector('[data-annotation]'), 'Expected full trace without label');
    await surface.applyFrame(frame(149), 'seek-back');
    assert(svg.innerHTML === snapshot, 'Overlay depends on seek history');
    await rejects(surface.applyFrame(evaluateFrame(project, 'landscape', 149), 'wrong-size'),
      'viewport', 'wrong-size');

    surface.dispose();
    surface.dispose();
    assert(container.childNodes.length === 0, 'Dispose left map or SVG behind');
    assert(document.fonts.size === initialFonts, 'Dispose left the owned font registered');
    assert(surface.inspectReadiness().status === 'disposed', 'Dispose did not update readiness');
  });

  await withSurface(async ({ container, surface, frame }) => {
    await surface.applyFrame(frame(149), 'recreated');
    const path = container.querySelector('[data-layer="line-layer"] path').getAttribute('d');
    assert(path === portraitPath, 'Recreated surface changed the projected trace');
  });
  await withSurface(async ({ container, surface, frame }) => {
    await surface.applyFrame(frame(149), 'landscape');
    const canvas = container.querySelector('canvas');
    assert(canvas.width === 1920 && canvas.height === 1080, 'Landscape canvas dimensions are wrong');
  }, 'landscape');
}

export async function supersededAndDisposed() {
  await withSurface(async ({ surface, frame }) => {
    const old = rejects(surface.applyFrame(frame(149), 'old'), 'superseded', 'old');
    const fresh = surface.applyFrame(frame(150), 'fresh');
    await old;
    assert((await fresh).frame === 150, 'Superseded frame affected the current request');
    const disposed = rejects(surface.applyFrame(frame(151), 'disposing'), 'disposed', 'disposing');
    surface.dispose();
    await disposed;
    await rejects(surface.applyFrame(frame(151), 'disposed'), 'disposed', 'disposed');
  });
}

export async function fixedViewport() {
  await withSurface(async ({ container, surface, frame }) => {
    const assertCanvasSize = () => {
      const canvas = container.querySelector('canvas');
      assert(canvas?.width === 1080 && canvas.height === 1920, 'Canvas lost its fixed dimensions');
      const gl = canvas.getContext('webgl2');
      assert(gl.drawingBufferWidth === 1080 && gl.drawingBufferHeight === 1920,
        'The drawing buffer lost its fixed dimensions');
    };

    container.style.display = 'none';
    await rejects(surface.applyFrame(frame(149), 'hidden'), 'viewport', 'hidden');
    assert(surface.inspectReadiness().status === 'failed', 'A hidden container reported ready');

    container.style.display = '';
    const initializing = surface.applyFrame(frame(149), 'hidden-during-setup');
    container.style.display = 'none';
    await rejects(initializing, 'viewport', 'hidden-during-setup');

    container.style.display = '';
    await surface.applyFrame(frame(149), 'revealed');
    assertCanvasSize();
    const svg = container.querySelector('svg[viewBox]');
    const initialOverlay = svg.innerHTML;

    container.style.width = '540px';
    container.style.height = '960px';
    container.style.transformOrigin = 'top left';
    container.style.transform = 'scale(0.5)';
    await surface.applyFrame(frame(149), 'resized-host');
    assertCanvasSize();
    assert(svg.innerHTML === initialOverlay, 'Resizing the host changed overlay projection');

    const mapHost = container.querySelector('.maplibregl-map');
    mapHost.style.width = '540px';
    assert(surface.inspectReadiness().error?.code === 'viewport', 'A resized map host reported ready');
    await rejects(surface.applyFrame(frame(149), 'resized-map'), 'viewport', 'resized-map');

    mapHost.style.width = '';
    await surface.applyFrame(frame(149), 'restored');
    assertCanvasSize();
    assert(svg.innerHTML === initialOverlay, 'Restoring the layout changed overlay projection');

    const hideOnPaint = MapLibreMap.prototype.triggerRepaint;
    MapLibreMap.prototype.triggerRepaint = function () {
      container.style.display = 'none';
      return hideOnPaint.call(this);
    };
    try {
      await rejects(surface.applyFrame(frame(149), 'hidden-before-paint'),
        'viewport', 'hidden-before-paint');
    } finally {
      MapLibreMap.prototype.triggerRepaint = hideOnPaint;
      container.style.display = '';
    }
    await surface.applyFrame(frame(149), 'revealed-after-paint');
    assertCanvasSize();
  });
}

export async function constrainedCamera() {
  await withSurface(async ({ container, surface, frame }) => {
    for (const [id, changes] of [
      ['clamped-zoom', { zoom: 23 }],
      ['clamped-center', { center: [-96.8, 85], zoom: 4 }],
    ]) {
      const document = structuredClone(fixture);
      Object.assign(document.scenes[0].cameraTrack[0], changes);
      const state = evaluateFrame(parseProject(document), 'portrait', 0);
      await rejects(surface.applyFrame(state, id), 'camera', id);
      assert(surface.inspectReadiness().status === 'failed', 'A constrained camera reported ready');
      assert(container.firstElementChild.style.visibility === 'hidden',
        'A constrained camera exposed a frame');
    }

    const normal = frame(149);
    await surface.applyFrame(normal, 'camera-restored');
    const anchor = () => {
      const circle = container.querySelector('[data-annotation] circle');
      return [Number(circle.getAttribute('cx')), Number(circle.getAttribute('cy'))];
    };
    const [originalX, originalY] = anchor();
    await surface.applyFrame({
      ...normal, camera: { ...normal.camera, bearing: normal.camera.bearing + 360 },
    }, 'wrapped-bearing');
    const [wrappedX, wrappedY] = anchor();
    assert(Math.hypot(wrappedX - originalX, wrappedY - originalY) < 1e-6,
      'An equivalent bearing changed overlay projection');
  });
}

export async function resourceFailures() {
  for (const [kind, url] of [
    ['style', '/missing-style.json'],
    ['font', '/missing-font.woff2'],
    ['font', styleUrl],
    ['style', 'https://example.invalid/style.json'],
  ]) {
    const id = resources[kind].id;
    await withSurface(async ({ surface, frame }) => {
      await rejects(surface.applyFrame(frame(149), kind), 'resource', kind, id);
      const failed = surface.inspectReadiness();
      assert(failed.status === 'failed' && failed.request.frame === 149, 'Failure lost frame identity');
    }, 'portrait', { ...resources, [kind]: { id, url } });
  }
}

export async function contextLoss() {
  await withSurface(async ({ container, surface, frame }) => {
    await surface.applyFrame(frame(149), 'before-loss');
    const canvas = container.querySelector('canvas');
    const gl = canvas.getContext('webgl2');
    const contextLoss = new Promise(resolve => {
      canvas.addEventListener('webglcontextlost', resolve, { once: true });
    });
    gl.getExtension('WEBGL_lose_context').loseContext();
    await contextLoss;
    assert(surface.inspectReadiness().error?.code === 'context-lost', 'Lost context left a ready frame');
    await rejects(surface.applyFrame(frame(150), 'after-loss'),
      'context-lost', 'after-loss', resources.style.id);
  });
}

export async function timeouts() {
  await withSurface(async ({ surface, frame }) => {
    await rejects(surface.applyFrame(frame(149), 'init-timeout'),
      'initialization-timeout', 'init-timeout', resources.font.id);
  }, 'portrait', {
    ...resources, font: { ...resources.font, url: '/__hold-font' },
  }, { initializationTimeoutMs: 1000 });

  await withSurface(async ({ surface, frame }) => {
    await surface.applyFrame(frame(149), 'before-timeout');
    const repaint = MapLibreMap.prototype.triggerRepaint;
    MapLibreMap.prototype.triggerRepaint = () => {};
    try {
      await rejects(surface.applyFrame(frame(149), 'frame-timeout'),
        'frame-timeout', 'frame-timeout', resources.style.id);
    } finally {
      MapLibreMap.prototype.triggerRepaint = repaint;
    }
    await surface.applyFrame(frame(150), 'recovered');
  }, 'portrait', resources, { frameTimeoutMs: 1000 });
}
