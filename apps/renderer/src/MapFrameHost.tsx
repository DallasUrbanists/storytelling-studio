import { useLayoutEffect, useRef } from 'react';
import { cancelRender, continueRender, delayRender } from 'remotion';
import { setWorkerUrl } from 'maplibre-gl';
import {
  mount,
  FrameReadinessError,
  type BridgeResources,
  type FrameSurface,
} from '@gstory/map-adapter';
import type { FrameState } from '@gstory/story-core';
import { hashFrameState, type BridgeDiagnostic } from './diagnostics.ts';

type Props = Readonly<{
  state: FrameState;
  resources: BridgeResources;
  workerUrl: string;
}>;

/** Keep the surface alive across seeks; only a resource or viewport change remounts it. */
export function MapFrameHost({ state, resources, workerUrl }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const surface = useRef<FrameSurface | null>(null);
  const sequence = useRef(0);
  const { width, height, pixelRatio } = state.viewport;
  const { id: styleId, url: styleUrl } = resources.style;
  const { id: fontId, url: fontUrl } = resources.font;

  useLayoutEffect(() => {
    const url = new URL(workerUrl, document.baseURI);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== location.origin) {
      cancelRender(new Error('The MapLibre worker must use a same-origin HTTP URL'));
      return;
    }
    setWorkerUrl(url.href);
    const mounted = mount(container.current!, {
      style: { id: styleId, url: styleUrl },
      font: { id: fontId, url: fontUrl },
    }, { width, height, pixelRatio });
    surface.current = mounted;
    return () => {
      mounted.dispose();
      surface.current = null;
    };
  }, [workerUrl, styleId, styleUrl, fontId, fontUrl, width, height, pixelRatio]);

  useLayoutEffect(() => {
    const mounted = surface.current;
    if (!mounted) return;
    const requestId = `remotion-${state.variantId}-${state.frame}-${++sequence.current}`;
    // Layout effects run in the commit before Remotion can capture this frame.
    const handle = delayRender(`Map frame ${requestId}`, { timeoutInMilliseconds: 65_000, retries: 0 });
    let active = true;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      continueRender(handle);
    };
    let diagnostic: BridgeDiagnostic = {
      requestedFrame: state.frame, variantId: state.variantId, requestId,
      status: 'pending', stateHash: null,
    };
    const publish = () => {
      window.__GSTORY_BRIDGE__ = diagnostic;
      if (container.current) {
        container.current.dataset.readiness = diagnostic.status;
        container.current.dataset.stateHash = diagnostic.stateHash ?? '';
        container.current.dataset.requestId = requestId;
      }
    };
    publish();

    void Promise.all([mounted.applyFrame(state, requestId), hashFrameState(state)]).then(
      ([ready, stateHash]) => {
        if (!active) return;
        const readiness = mounted.inspectReadiness();
        if (ready.requestId !== requestId || ready.frame !== state.frame
            || readiness.status !== 'ready' || readiness.request.requestId !== requestId) {
          throw new Error(`Readiness does not match requested frame ${requestId}`);
        }
        diagnostic = { ...diagnostic, status: 'ready', stateHash };
        publish();
        release();
      },
    ).catch((cause: unknown) => {
      if (!active) return;
      const error = cause instanceof Error ? cause : new Error(String(cause));
      diagnostic = {
        ...diagnostic, status: 'failed',
        error: {
          name: error.name, message: error.message,
          ...(error instanceof FrameReadinessError
            ? { code: error.code, resourceId: error.resourceId } : {}),
        },
      };
      publish();
      // Failure retains its delay handle. Remotion records and throws the failure.
      cancelRender(error);
    });

    return () => {
      active = false;
      if (window.__GSTORY_BRIDGE__?.requestId === requestId) {
        diagnostic = { ...diagnostic, status: 'disposed' };
        publish();
      }
      // A replaced/unmounted request cannot acknowledge a later request's handle.
      release();
    };
  }, [state, workerUrl, styleId, styleUrl, fontId, fontUrl, width, height, pixelRatio]);

  return <div ref={container} data-testid="bridge-frame" data-requested-frame={state.frame}
    data-variant-id={state.variantId}
    style={{ position: 'absolute', top: 0, left: 0, width, height, overflow: 'hidden' }} />;
}
