import type { BridgeResources } from '@gstory/map-adapter';
import { parseProject } from '@gstory/project-schema';
import type { FrameState } from '@gstory/story-core';

export type StoryInput = {
  project: unknown;
  resources: BridgeResources;
  workerUrl: string;
};

export function storyMetadata(input: StoryInput, variantId: FrameState['variantId']) {
  const project = parseProject(input.project);
  return {
    ...project.outputVariants[variantId],
    fps: project.fps,
    durationInFrames: project.scenes.reduce((total, scene) => total + scene.durationFrames, 0),
  };
}
