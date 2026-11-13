import type { Map as MapLibreMap } from 'maplibre-gl';

export type ReadinessCode =
  | 'resource'
  | 'map'
  | 'context-lost'
  | 'initialization-timeout'
  | 'frame-timeout'
  | 'viewport'
  | 'camera'
  | 'superseded'
  | 'disposed';

export type FrameRequest = Readonly<{ requestId: string; frame: number }>;

export class FrameReadinessError extends Error {
  constructor(
    readonly code: ReadinessCode,
    readonly request: FrameRequest,
    detail: string,
    readonly resourceId?: string,
  ) {
    super(`Frame ${request.frame} (${request.requestId}): ${detail}`);
    this.name = 'FrameReadinessError';
  }
}

export type Readiness =
  | Readonly<{ status: 'idle' | 'disposed' }>
  | Readonly<{ status: 'pending'; request: FrameRequest; pendingResources: readonly string[] }>
  | Readonly<{ status: 'ready'; request: FrameRequest }>
  | Readonly<{ status: 'failed'; request: FrameRequest; error: FrameReadinessError }>;

/** Stop waiting for a shared operation when the caller is cancelled. */
export function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const cleanup = () => signal.removeEventListener('abort', abort);
    promise.then(value => {
      cleanup();
      resolve(value);
    }, error => {
      cleanup();
      reject(error);
    });
  });
}

/** Require a render after the mutation, followed by a settled map. */
export function afterMapPaint(
  map: MapLibreMap,
  signal: AbortSignal,
  apply: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    let applied = false;
    let painted = false;
    const cleanup = () => {
      map.off('render', render);
      map.off('idle', idle);
      signal.removeEventListener('abort', abort);
    };
    const render = () => {
      if (applied) painted = true;
    };
    const idle = () => {
      if (!painted || !map.loaded() || !map.areTilesLoaded()) return;
      cleanup();
      resolve();
    };
    const abort = () => {
      cleanup();
      reject(signal.reason);
    };

    map.on('render', render);
    map.on('idle', idle);
    signal.addEventListener('abort', abort, { once: true });
    try {
      apply();
      if (signal.aborted) return;
      applied = true;
      map.triggerRepaint();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
