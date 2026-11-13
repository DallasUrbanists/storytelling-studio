import { Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FrameState } from '../../story-core/src/index.ts';
import { createOverlay, drawOverlay } from './apply-frame.ts';
import {
  afterMapPaint,
  FrameReadinessError,
  untilAborted,
  type FrameRequest,
  type Readiness,
  type ReadinessCode,
} from './readiness.ts';

export { FrameReadinessError, type FrameRequest, type Readiness, type ReadinessCode };

type Resource = Readonly<{ id: string; url: string }>;
export type BridgeResources = Readonly<{ style: Resource; font: Resource }>;

export type MountOptions = Readonly<{
  initializationTimeoutMs?: number;
  frameTimeoutMs?: number;
}>;

export type FrameSurface = Readonly<{
  applyFrame(frameState: FrameState, requestId: string): Promise<FrameRequest>;
  inspectReadiness(): Readiness;
  dispose(): void;
}>;

type Request = {
  identity: FrameRequest;
  abort: AbortController;
};

class Problem extends Error {
  constructor(readonly code: ReadinessCode, detail: string, readonly resourceId?: string) {
    super(detail);
  }
}

let nextFontFamily = 0;

const cameraTolerance = 1e-9;

function angleDistance(a: number, b: number): number {
  const distance = Math.abs((a - b) % 360);
  return Math.min(distance, 360 - distance);
}

function assertCamera(map: MapLibreMap, camera: FrameState['camera']): void {
  const { lng, lat } = map.getCenter();
  const zoom = map.getZoom();
  const bearing = map.getBearing();
  const pitch = map.getPitch();
  const [longitude, latitude] = camera.center;
  const matches = [
    angleDistance(lng, longitude),
    Math.abs(lat - latitude),
    Math.abs(zoom - camera.zoom),
    angleDistance(bearing, camera.bearing),
    Math.abs(pitch - camera.pitch),
  ].every(distance => distance <= cameraTolerance);
  if (!matches) {
    throw new Problem('camera',
      `MapLibre applied center [${lng}, ${lat}], zoom ${zoom}, bearing ${bearing}, pitch ${pitch}. `
      + `Requested center [${longitude}, ${latitude}], zoom ${camera.zoom}, `
      + `bearing ${camera.bearing}, pitch ${camera.pitch}`);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function bridgeStyle(value: unknown): StyleSpecification {
  if (!object(value) || value.version !== 8 || !object(value.sources)
      || !Array.isArray(value.layers) || 'sprite' in value || 'glyphs' in value
      || 'terrain' in value || 'projection' in value) {
    throw new Error('Expected a version 8 bridge style without sprites, glyphs, terrain, or custom projection');
  }
  for (const [id, source] of Object.entries(value.sources)) {
    if (!object(source) || source.type !== 'geojson' || !object(source.data)) {
      throw new Error(`Source "${id}" requires inline GeoJSON`);
    }
  }
  for (const layer of value.layers) {
    if (!object(layer) || !['background', 'fill', 'line', 'circle'].includes(String(layer.type))) {
      throw new Error('Bridge styles support background, fill, line, and circle layers');
    }
  }
  return { ...value, transition: { duration: 0, delay: 0 } } as unknown as StyleSpecification;
}

async function fetchResource(owner: Document, resource: Resource, signal: AbortSignal): Promise<Response> {
  const url = new URL(resource.url, owner.baseURI);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== owner.location.origin) {
    throw new Error('Use a same-origin HTTP resource URL');
  }
  const response = await fetch(url, { signal, mode: 'same-origin', redirect: 'error' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

/**
 * Own one fixed-size, non-interactive browser surface for its host's lifetime.
 *
 * The host supplies URLs for pinned same-origin style and font bytes. A viewport
 * change requires a new surface. The first frame starts resource initialization.
 */
export function mount(
  container: HTMLElement,
  resources: BridgeResources,
  viewport: FrameState['viewport'],
  options: MountOptions = {},
): FrameSurface {
  const owner = container.ownerDocument;
  const { width, height, pixelRatio } = viewport;
  const styleResource = { ...resources.style };
  const fontResource = { ...resources.font };
  const {
    initializationTimeoutMs = 30_000,
    frameTimeoutMs = 30_000,
  } = options;
  const root = owner.createElement('div');
  const mapHost = owner.createElement('div');
  const overlay = createOverlay(owner, viewport);
  Object.assign(root.style, {
    position: 'relative', width: `${width}px`, height: `${height}px`, overflow: 'hidden',
    visibility: 'hidden',
  });
  Object.assign(mapHost.style, { position: 'absolute', inset: '0' });
  root.append(mapHost, overlay);
  container.append(root);

  const fontFamily = `GstoryBridge${++nextFontFamily}`;
  const pending = new Set<string>();
  const setupAbort = new AbortController();
  let font: FontFace | undefined;
  let map: MapLibreMap | undefined;
  let setup: Promise<MapLibreMap> | undefined;
  let fatal: Problem | undefined;
  let current: Request | undefined;
  let readiness: Readiness = { status: 'idle' };

  function report(problem: Problem, request: Request): FrameReadinessError {
    return new FrameReadinessError(problem.code, request.identity, problem.message, problem.resourceId);
  }

  function assertViewport(surfaceMap?: MapLibreMap): void {
    const { clientWidth, clientHeight } = mapHost;
    if (clientWidth !== width || clientHeight !== height) {
      throw new Problem('viewport',
        `Map layout is ${clientWidth} × ${clientHeight} CSS pixels. `
        + `Show the fixed-size ${width} × ${height} surface before requesting a frame.`);
    }
    if (!surfaceMap) return;

    const canvas = surfaceMap.getCanvas();
    const gl = canvas.getContext('webgl2');
    const expectedWidth = width * pixelRatio;
    const expectedHeight = height * pixelRatio;
    if (canvas.width !== expectedWidth || canvas.height !== expectedHeight
        || gl?.drawingBufferWidth !== expectedWidth || gl.drawingBufferHeight !== expectedHeight) {
      throw new Problem('viewport',
        `Expected a ${expectedWidth} × ${expectedHeight} canvas and drawing buffer. `
        + `Got canvas ${canvas.width} × ${canvas.height}, `
        + `buffer ${gl?.drawingBufferWidth ?? 0} × ${gl?.drawingBufferHeight ?? 0}.`);
    }
  }

  function mapFailed(problem: Problem): void {
    if (fatal || readiness.status === 'disposed') return;
    fatal = problem;
    setupAbort.abort(problem);
    if (!current) return;
    const error = report(problem, current);
    current.abort.abort(error);
    readiness = { status: 'failed', request: current.identity, error };
    root.style.visibility = 'hidden';
  }

  async function load<T>(resource: Resource, decode: (response: Response) => Promise<T>): Promise<T> {
    pending.add(resource.id);
    try {
      return await decode(await fetchResource(owner, resource, setupAbort.signal));
    } catch (error) {
      setupAbort.signal.throwIfAborted();
      throw new Problem('resource', `Resource "${resource.id}": ${describe(error)}`, resource.id);
    } finally {
      pending.delete(resource.id);
    }
  }

  async function initialize(): Promise<MapLibreMap> {
    const signal = setupAbort.signal;
    const timeout = setTimeout(() => {
      const resourceIds = pending.size ? [...pending] : [styleResource.id];
      setupAbort.abort(new Problem('initialization-timeout',
        `Initialization timed out waiting for ${resourceIds.join(', ')}`,
        resourceIds.length === 1 ? resourceIds[0] : undefined));
    }, initializationTimeoutMs);
    try {
      const [style, loadedFont] = await Promise.all([
        load(styleResource, async response => bridgeStyle(await response.json())),
        load(fontResource, async response => {
          const face = new FontFace(fontFamily, await response.arrayBuffer());
          return await untilAborted(face.load(), signal);
        }),
      ]);
      signal.throwIfAborted();
      assertViewport();
      font = loadedFont;
      owner.fonts.add(font);

      const surfaceMap = new MapLibreMap({
        container: mapHost,
        attributionControl: false,
        canvasContextAttributes: { preserveDrawingBuffer: true },
        fadeDuration: 0,
        interactive: false,
        pixelRatio,
        trackResize: false,
        transformRequest: () => {
          throw new Error('The bridge style must use inline map resources');
        },
      });
      map = surfaceMap;
      surfaceMap.on('error', ({ error }) => {
        mapFailed(new Problem('map', `MapLibre: ${describe(error)}`, styleResource.id));
      });
      surfaceMap.on('webglcontextlost', () => {
        mapFailed(new Problem('context-lost', 'MapLibre lost its WebGL context', styleResource.id));
      });
      pending.add(styleResource.id);
      await afterMapPaint(surfaceMap, signal, () => surfaceMap.setStyle(style));
      signal.throwIfAborted();
      return surfaceMap;
    } catch (error) {
      if (error instanceof Problem && error.code === 'viewport') {
        setup = undefined;
        throw error;
      }
      const problem = error instanceof Problem
        ? error
        : new Problem('map', `MapLibre: ${describe(error)}`, styleResource.id);
      setupAbort.abort(problem);
      throw problem;
    } finally {
      pending.clear();
      clearTimeout(timeout);
    }
  }

  async function applyFrame(state: FrameState, requestId: string): Promise<FrameRequest> {
    const request: Request = {
      identity: Object.freeze({ requestId, frame: state.frame }),
      abort: new AbortController(),
    };
    if (readiness.status === 'disposed') {
      throw report(new Problem('disposed', 'The map surface was disposed'), request);
    }
    if (current) {
      current.abort.abort(report(new Problem('superseded', 'A newer frame was requested'), current));
    }
    current = request;
    root.style.visibility = 'hidden';
    readiness = { status: 'pending', request: request.identity, pendingResources: [] };

    const signal = request.abort.signal;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (state.viewport.width !== width || state.viewport.height !== height
          || state.viewport.pixelRatio !== pixelRatio) {
        throw new Problem('viewport', 'Frame dimensions must match the mounted surface');
      }
      if (fatal) throw fatal;
      assertViewport();
      setup ??= initialize();
      const surfaceMap = await untilAborted(setup, signal);
      signal.throwIfAborted();
      assertViewport(surfaceMap);

      readiness = { status: 'pending', request: request.identity, pendingResources: [styleResource.id] };
      timeout = setTimeout(() => {
        request.abort.abort(report(new Problem(
          'frame-timeout', 'MapLibre did not paint and settle the requested frame', styleResource.id,
        ), request));
      }, frameTimeoutMs);
      await afterMapPaint(surfaceMap, signal, () => {
        const { center, zoom, bearing, pitch } = state.camera;
        surfaceMap.jumpTo({ center: [...center], zoom, bearing, pitch });
        assertCamera(surfaceMap, state.camera);
        drawOverlay(overlay, surfaceMap, state, fontFamily);
      });
      signal.throwIfAborted();
      assertViewport(surfaceMap);
      assertCamera(surfaceMap, state.camera);

      root.style.visibility = 'visible';
      readiness = { status: 'ready', request: request.identity };
      return request.identity;
    } catch (error) {
      const failure = error instanceof FrameReadinessError ? error : report(
        error instanceof Problem ? error : new Problem('map', describe(error), styleResource.id),
        request,
      );
      if (current === request) {
        readiness = { status: 'failed', request: request.identity, error: failure };
      }
      throw failure;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    applyFrame,
    inspectReadiness() {
      if (readiness.status === 'ready') {
        try {
          assertViewport(map);
        } catch (problem) {
          if (!(problem instanceof Problem)) throw problem;
          const { request } = readiness;
          const error = new FrameReadinessError(problem.code, request, problem.message);
          root.style.visibility = 'hidden';
          readiness = { status: 'failed', request, error };
        }
      }
      if (readiness.status === 'pending') {
        return { ...readiness, pendingResources: [...pending, ...readiness.pendingResources] };
      }
      return { ...readiness };
    },
    dispose() {
      if (readiness.status === 'disposed') return;
      readiness = { status: 'disposed' };
      setupAbort.abort(new Problem('disposed', 'The map surface was disposed'));
      if (current) {
        current.abort.abort(report(new Problem('disposed', 'The map surface was disposed'), current));
        current = undefined;
      }
      map?.remove();
      if (font) owner.fonts.delete(font);
      root.remove();
    },
  };
}
