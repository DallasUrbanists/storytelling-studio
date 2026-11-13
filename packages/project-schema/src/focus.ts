import type { CameraKeyframe } from './project.ts';

/** Saved WGS84 [west, south, east, north] bounds without antimeridian wrapping. */
export type FocusExtent = [number, number, number, number];
export type FocusCamera = Pick<CameraKeyframe, 'center' | 'zoom' | 'bearing' | 'pitch'>;
export type FocusTransition = { kind: 'cut' } | { kind: 'linear'; durationFrames: number };
export type FocusVariantOverride = { extent?: FocusExtent; camera?: FocusCamera };

/** Scene-local [startFrame, endFrameExclusive), with an explicitly saved target. */
export type FocusStep = {
  id: string;
  featureRevisionId: string;
  startFrame: number;
  endFrameExclusive: number;
  extent: FocusExtent;
  camera: FocusCamera;
  transition: FocusTransition;
  variantOverrides?: { portrait?: FocusVariantOverride; landscape?: FocusVariantOverride };
};

export type SceneFocus =
  | { focusFeatureRevisionId: string; focusSteps?: never }
  | { focusSteps: FocusStep[]; focusFeatureRevisionId?: never };

export type FocusErrorCode = 'invalid-step-id' | 'duplicate-step-id' | 'invalid-interval'
  | 'missing-reference' | 'invalid-extent' | 'invalid-camera' | 'invalid-transition'
  | 'invalid-override' | 'ambiguous-focus' | 'unsupported-field';

/** Machine-readable focus failure for future authoring controls. */
export class FocusValidationError extends Error {
  readonly code: FocusErrorCode;
  readonly path: string;

  constructor(code: FocusErrorCode, path: string) {
    super(`Invalid project: ${path}: ${code}`);
    this.name = 'FocusValidationError';
    this.code = code;
    this.path = path;
  }
}

function fail(code: FocusErrorCode, path: string): never {
  throw new FocusValidationError(code, path);
}
function record(value: unknown, code: FocusErrorCode, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, path);
  return value as Record<string, unknown>;
}
function fields(value: Record<string, unknown>, allowed: string[], path: string): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail('unsupported-field', `${path}.${key}`);
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function extent(value: unknown, path: string): void {
  if (!Array.isArray(value) || value.length !== 4 || !Array.from(value).every(finite)) fail('invalid-extent', path);
  const [west, south, east, north] = value;
  if (west < -180 || east > 180 || west > east || south < -85.05112878 || north > 85.05112878 || south > north) {
    fail('invalid-extent', path);
  }
}
function camera(value: unknown, path: string): void {
  const target = record(value, 'invalid-camera', path);
  fields(target, ['center', 'zoom', 'bearing', 'pitch'], path);
  const center = target.center;
  if (!Array.isArray(center) || center.length !== 2 || !Array.from(center).every(finite)
    || Math.abs(center[0]) > 180 || Math.abs(center[1]) > 85.05112878
    || !finite(target.zoom) || !finite(target.bearing) || target.pitch !== 0) fail('invalid-camera', path);
}

/** Validate sequence shape, references and timing before any frame evaluation. */
export function validateFocusSteps(value: unknown, revisionIds: ReadonlySet<string>, duration: number): void {
  const path = 'scene.focusSteps';
  if (!Array.isArray(value)) fail('invalid-interval', path);
  const ids = new Set<string>();
  let previousEnd = 0;
  for (const [index, item] of value.entries()) {
    const at = `${path}[${index}]`;
    const step = record(item, 'invalid-step-id', at);
    fields(step, ['id', 'featureRevisionId', 'startFrame', 'endFrameExclusive', 'extent', 'camera', 'transition', 'variantOverrides'], at);
    if (typeof step.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(step.id)) fail('invalid-step-id', `${at}.id`);
    if (ids.has(step.id)) fail('duplicate-step-id', `${at}.id`);
    ids.add(step.id);
    const start = step.startFrame, end = step.endFrameExclusive;
    if (typeof start !== 'number' || typeof end !== 'number' || !Number.isSafeInteger(start)
      || !Number.isSafeInteger(end) || start < previousEnd || start >= end || end > duration) fail('invalid-interval', at);
    if (typeof step.featureRevisionId !== 'string' || !revisionIds.has(step.featureRevisionId)) fail('missing-reference', `${at}.featureRevisionId`);
    extent(step.extent, `${at}.extent`);
    camera(step.camera, `${at}.camera`);
    const transition = record(step.transition, 'invalid-transition', `${at}.transition`);
    if (transition.kind === 'cut') fields(transition, ['kind'], `${at}.transition`);
    else if (transition.kind === 'linear') {
      fields(transition, ['kind', 'durationFrames'], `${at}.transition`);
      const frames = transition.durationFrames;
      if (index === 0 || start !== previousEnd || typeof frames !== 'number' || !Number.isSafeInteger(frames)
        || frames <= 0 || frames >= end - start) fail('invalid-transition', `${at}.transition`);
    } else fail('invalid-transition', `${at}.transition`);
    if (step.variantOverrides !== undefined) {
      const overrides = record(step.variantOverrides, 'invalid-override', `${at}.variantOverrides`);
      fields(overrides, ['portrait', 'landscape'], `${at}.variantOverrides`);
      for (const [variant, value] of Object.entries(overrides)) {
        const atVariant = `${at}.variantOverrides.${variant}`;
        const override = record(value, 'invalid-override', atVariant);
        fields(override, ['extent', 'camera'], atVariant);
        if (override.extent !== undefined) extent(override.extent, `${atVariant}.extent`);
        if (override.camera !== undefined) camera(override.camera, `${atVariant}.camera`);
      }
    }
    previousEnd = end;
  }
}
