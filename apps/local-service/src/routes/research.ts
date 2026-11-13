import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Method = { id: string; version: number; parameters: { [key: string]: Json } };
export type StudyArea = {
  kind: 'synthetic';
  featureRevisionId: string;
  geometry: Json;
};
export type ResearchRequest = {
  projectRevision: string;
  area: StudyArea;
  geometrySha256: string;
  method: Method;
  methodSha256: string;
  selectionRationale: string;
  derivedInputs: Json[];
};

// Sort object keys recursively; array order and every coordinate are retained.
function canonical(value: Json): string {
  if (value === null || typeof value !== 'object') {
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw new Error('Invalid JSON value');
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite JSON number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    // JSON.stringify converts array holes to null; do not hash different inputs
    // as if they were the same saved geometry or method.
    return `[${Array.from({ length: value.length }, (_, index) => {
      if (!Object.hasOwn(value, index)) throw new Error('Sparse JSON array');
      return canonical(value[index]);
    }).join(',')}]`;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new Error('Invalid JSON object');
  }
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

function digest(value: Json): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

function required(value: string): boolean { return typeof value === 'string' && value.trim().length > 0; }

/** Create a request only from an explicitly synthetic selection and a current method record. */
export function selectStudyArea(
  area: StudyArea, projectRevision: string, selectionRationale: string,
  method: Method, expectedMethodSha256: string, previous?: ResearchRequest,
): ResearchRequest {
  if (!area || area.kind !== 'synthetic' || !required(area.featureRevisionId)) throw new Error('Only identified synthetic study areas are supported');
  if (!area.geometry || typeof area.geometry !== 'object' || Array.isArray(area.geometry) ||
      !['Polygon', 'MultiPolygon'].includes(String(area.geometry.type)) || !Array.isArray(area.geometry.coordinates)) {
    throw new Error('Study area must be polygon geometry');
  }
  if (!required(projectRevision) || !required(selectionRationale)) throw new Error('Project revision and selection rationale are required');
  if (!method || !required(method.id) || !Number.isSafeInteger(method.version) || method.version < 1 ||
      !method.parameters || typeof method.parameters !== 'object' || Array.isArray(method.parameters)) throw new Error('Method record is required');
  const methodSha256 = digest(method);
  if (methodSha256 !== expectedMethodSha256) throw new Error('Missing or stale method record');
  const geometrySha256 = digest(area.geometry);
  // Any change to the selected identity or method invalidates dependent values.
  const unchanged = previous && Array.isArray(previous.derivedInputs) && previous.area &&
    digest(previous.area.geometry) === previous.geometrySha256 && digest(previous.method) === previous.methodSha256 &&
    previous.geometrySha256 === geometrySha256 &&
    previous.area.featureRevisionId === area.featureRevisionId && previous.projectRevision === projectRevision &&
    previous.methodSha256 === methodSha256;
  return structuredClone({ projectRevision, area, geometrySha256, method, methodSha256, selectionRationale,
    derivedInputs: unchanged ? previous.derivedInputs : [] });
}

export function methodHash(method: Method): string { return digest(method); }

/** Revalidate stored content and its method against the current method record. */
export function reopenResearchRequest(saved: ResearchRequest, currentMethod: Method, currentMethodSha256: string): ResearchRequest {
  if (!saved || !Array.isArray(saved.derivedInputs) || digest(saved.area?.geometry) !== saved.geometrySha256 ||
      digest(saved.method) !== saved.methodSha256 || saved.methodSha256 !== currentMethodSha256) throw new Error('Invalid or stale saved request');
  canonical(saved.derivedInputs);
  return selectStudyArea(saved.area, saved.projectRevision, saved.selectionRationale, currentMethod, currentMethodSha256, saved);
}

/** The caller owns the destination and must persist each revision separately. */
export async function saveResearchRequest(path: string, request: ResearchRequest, currentMethod: Method, currentMethodSha256: string): Promise<void> {
  const checked = reopenResearchRequest(request, currentMethod, currentMethodSha256);
  await writeFile(path, JSON.stringify(checked), { encoding: 'utf8', flag: 'wx' });
}

export async function loadResearchRequest(path: string, currentMethod: Method, currentMethodSha256: string): Promise<ResearchRequest> {
  const saved: ResearchRequest = JSON.parse(await readFile(path, 'utf8'));
  return reopenResearchRequest(saved, currentMethod, currentMethodSha256);
}

