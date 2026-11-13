import type { FocusCamera, FocusExtent, FocusStep, Geometry, ProjectDocument } from '../../project-schema/src/index.ts';
import { evaluateCamera } from './camera.ts';
import { copyGeometry } from './geometry.ts';

type VariantId = keyof ProjectDocument['outputVariants'];

export type FocusState = {
  stepId: string;
  featureRevisionId: string;
  geometry: Geometry;
  extent: FocusExtent;
  transition: { kind: 'cut' | 'linear'; progress: number; fromStepId?: string };
};

function target(step: FocusStep, variantId: VariantId) {
  const override = step.variantOverrides?.[variantId];
  return { camera: override?.camera ?? step.camera, extent: override?.extent ?? step.extent };
}

/** Resolve a validated sequence from scene-local time and saved values alone. */
export function evaluateFocus(
  steps: readonly FocusStep[],
  variantId: VariantId,
  localFrame: number,
  geometries: ReadonlyMap<string, Geometry>,
): { camera: FocusCamera; focus: FocusState } | null {
  const index = steps.findIndex(step => localFrame >= step.startFrame && localFrame < step.endFrameExclusive);
  if (index === -1) return null;
  const step = steps[index];
  const resolved = target(step, variantId);
  const elapsed = localFrame - step.startFrame;
  const linear = step.transition.kind === 'linear';
  const duration = step.transition.kind === 'linear' ? step.transition.durationFrames : 0;
  const camera = linear ? evaluateCamera([
    { ...target(steps[index - 1], variantId).camera, frame: 0, easing: 'linear' },
    { ...resolved.camera, frame: duration, easing: 'linear' },
  ], elapsed) : { ...resolved.camera, center: [...resolved.camera.center] as [number, number] };
  return {
    camera,
    focus: {
      stepId: step.id,
      featureRevisionId: step.featureRevisionId,
      geometry: copyGeometry(geometries.get(step.featureRevisionId)!),
      extent: [...resolved.extent],
      transition: {
        kind: step.transition.kind,
        progress: linear ? Math.min(1, elapsed / duration) : 1,
        ...(linear ? { fromStepId: steps[index - 1].id } : {}),
      },
    },
  };
}

