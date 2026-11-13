import { Composition, registerRoot, staticFile } from 'remotion';
import fixture from '../../../tests/fixtures/synthetic-story/project.json';
import { LandscapeStory, PortraitStory } from './StoryComposition.tsx';
import { storyMetadata, type StoryInput } from './render-input.ts';

// The bundle's public directory supplies these exact local files; no editor is needed.
const resources = {
  style: { id: 'fixture-style', url: staticFile('assets/bridge-style.json') },
  font: { id: 'fixture-font', url: staticFile('assets/Inter-Regular.woff2') },
};

export function RemotionRoot() {
  return <>
    <Composition id="StoryPortrait" component={PortraitStory}
      width={1080} height={1920} fps={30} durationInFrames={300}
      defaultProps={{ project: fixture, resources, workerUrl: staticFile('maplibre-gl-worker.mjs') }}
      calculateMetadata={({ props }: { props: StoryInput }) => storyMetadata(props, 'portrait')} />
    <Composition id="StoryLandscape" component={LandscapeStory}
      width={1920} height={1080} fps={30} durationInFrames={300}
      defaultProps={{ project: fixture, resources, workerUrl: staticFile('maplibre-gl-worker.mjs') }}
      calculateMetadata={({ props }: { props: StoryInput }) => storyMetadata(props, 'landscape')} />
  </>;
}

registerRoot(RemotionRoot);
