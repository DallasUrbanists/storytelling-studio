import type { FrameState } from '@gstory/story-core';

export type BridgeDiagnostic = Readonly<{
  requestedFrame: number;
  variantId: FrameState['variantId'];
  requestId: string;
  status: 'pending' | 'ready' | 'failed' | 'disposed';
  stateHash: string | null;
  error?: Readonly<{ name: string; message: string; code?: string; resourceId?: string }>;
}>;

declare global {
  interface Window {
    __GSTORY_BRIDGE__?: BridgeDiagnostic;
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, child]) => [key, canonical(child)]));
  }
  return value;
}

/** SHA-256 of UTF-8 JSON with recursively sorted object keys and preserved array order. */
export async function hashFrameState(state: FrameState): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(state)));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
