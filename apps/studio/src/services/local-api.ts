/** Browser requests stay on the studio origin; the server proxy owns its session token. */
export async function api<T = unknown>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api' + path, { method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({ message: 'The local service is unavailable.' }));
    throw Object.assign(new Error(problem.message ?? 'The request failed.'), { code: problem.code, status: response.status });
  }
  return response.json();
}
export async function sha256(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function download(bytes: BlobPart, name: string, type = 'application/octet-stream'): void {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function uploadAsset(file: Blob, mediaType: string): Promise<{ sha256: string; bytes: number }> {
  const response = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Asset-Type': mediaType }, body: file });
  const result = await response.json(); if (!response.ok) throw new Error(result.message); return result;
}
export async function downloadFrom(path: string, filename: string): Promise<void> {
  const response = await fetch('/api' + path);
  if (!response.ok) throw new Error((await response.json()).message);
  download(await response.blob(), filename);
}
