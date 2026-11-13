import { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { parseProject } from '@gstory/project-schema';
import { evaluateFrame, type FrameState } from '@gstory/story-core';
import { MapFrameHost } from './MapFrameHost.tsx';
import type { StoryInput } from './render-input.ts';

export function StoryComposition({ project: document, resources, workerUrl, variantId }:
  StoryInput & { variantId: FrameState['variantId'] }) {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const project = useMemo(() => parseProject(document), [document]);
  const state = useMemo(() => evaluateFrame(project, variantId, frame), [project, variantId, frame]);
  if (config.width !== state.viewport.width || config.height !== state.viewport.height
      || config.fps !== project.fps
      || config.durationInFrames !== project.scenes.reduce((total, scene) => total + scene.durationFrames, 0)) {
    throw new Error('Remotion composition metadata must match the validated project and output variant');
  }
  return <MapFrameHost state={state} resources={resources} workerUrl={workerUrl} />;
}

export function PortraitStory(props: StoryInput) {
  return <StoryComposition {...props} variantId="portrait" />;
}

export function LandscapeStory(props: StoryInput) {
  return <StoryComposition {...props} variantId="landscape" />;
}
