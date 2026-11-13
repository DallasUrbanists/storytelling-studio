/** Canonical JSON keeps hashes independent of object property insertion order. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + Array.from({ length: value.length }, (_, i) => {
    if (!Object.hasOwn(value, i)) throw new Error('Sparse JSON array');
    return canonicalJson(value[i]);
  }).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson((value as Record<string, unknown>)[key])).join(',') + '}';
  }
  throw new Error('Expected finite JSON data');
}
