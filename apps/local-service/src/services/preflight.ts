import type { ProjectDocument } from '../../../../packages/project-schema/src/index.ts';
import { parseProject } from '../../../../packages/project-schema/src/index.ts';
import { evaluateFrame } from '../../../../packages/story-core/src/index.ts';
import { hashBytes } from '../db/project-repository.ts';

/** Check the resources and factual claims actually included in the saved film. */
export function preflight(project: ProjectDocument, asset: (hash: string) => Uint8Array | undefined): string[] {
  const problems: string[] = [];
  try { parseProject(project); } catch (error) { return [(error as Error).message]; }
  const revisions = new Set<string>(), sourceIds = new Set<string>(), hashes = new Set<string>();
  for (const layer of project.layers) if (layer.style?.opacity !== 0) {
    revisions.add(layer.featureRevisionId);
    if (layer.group === 'walkshed' && !project.walksheds?.some(w => w.featureRevisionId === layer.featureRevisionId)) problems.push('Attach a network evidence packet to the included walkshed layer.');
  }
  for (const scene of project.scenes) {
    if (scene.focusFeatureRevisionId) revisions.add(scene.focusFeatureRevisionId);
    for (const step of scene.focusSteps ?? []) revisions.add(step.featureRevisionId);
    if (scene.outsideDimming) revisions.add(scene.outsideDimming.featureRevisionId);
    if (scene.researchSnapshotId) {
      const snapshot = project.researchSnapshots!.find(s => s.id === scene.researchSnapshotId)!;
      revisions.add(snapshot.inputs.featureRevisionId);
      snapshot.inputs.sourceInputs.forEach(s => sourceIds.add(s.sourceId));
      if (snapshot.status !== 'approved') problems.push('Review the research snapshot in ' + (scene.title ?? scene.id) + '.');
      if (snapshot.result.kind !== 'estimate') problems.push('Only the supported population estimate can be used in a research scene.');
      if (snapshot.result.value && typeof snapshot.result.value === 'object' && !Array.isArray(snapshot.result.value) && snapshot.result.value.complete !== true) problems.push('Resolve incomplete source coverage before publishing population.');
    }
    if (scene.roadway) {
      const road = project.roadways!.find(r => r.id === scene.roadway!.roadwayId)!;
      revisions.add(road.corridorFeatureRevisionId); road.sourceIds.forEach(id => sourceIds.add(id));
      const sections = [...road.segments.flatMap(s => [s.existing,s.proposed]).filter(s => !('layoutId' in s)), ...(road.layouts ?? []).map(l => l.section)];
      for (const section of sections) if (!('layoutId' in section)) for (const d of [section.curbToCurb,section.envelope.width,...section.bands.map(b=>b.width)]) if (d.status === 'estimated' || d.status === 'documented') d.sourceIds.forEach(id=>sourceIds.add(id));
    }
    if ((scene.caption?.length ?? 0) > 240 || (scene.credit?.length ?? 0) > 400) problems.push('Shorten the caption or credits in ' + (scene.title ?? scene.id) + ' to fit both frames.');
  }
  for (const id of revisions) project.featureRevisions.find(r => r.id === id)!.sourceIds.forEach(s => sourceIds.add(s));
  for (const walk of project.walksheds ?? []) if (revisions.has(walk.featureRevisionId)) {
    if (!walk.technicalReview) problems.push('Record a technical review of the included walkshed origins and barriers.');
    for (const id of [walk.reachableNetworkAssetId,...walk.sourceAssetIds]) hashes.add(project.assets.find(a=>a.id===id)!.sha256);
    if (!walk.sourceAssetIds.some(id=>project.assets.find(a=>a.id===id)?.sha256===walk.networkSha256)) problems.push('Retain the network file matching the walkshed network checksum.');
  }
  for (const source of project.sources) if (sourceIds.has(source.id) && source.sourceKind === 'dataset') {
    if (source.rights.localUse !== 'allowed' || source.rights.publication !== 'allowed') problems.push('Confirm local-use and publication permission for ' + source.title + '.');
    if (!source.contentSha256 || !project.assets.some(a=>a.sha256===source.contentSha256)) problems.push('Retain the exact source bytes for ' + source.title + '.');
    else hashes.add(source.contentSha256);
  }
  for (const id of ['fixture-style','fixture-font','font-license']) {
    const item=project.assets.find(a=>a.id===id); if(!item)problems.push('The local style, font, and font license are required.');else hashes.add(item.sha256);
  }
  for (const item of project.assets) if (hashes.has(item.sha256)) {
    const bytes=asset(item.sha256);
    if(!bytes||hashBytes(bytes)!==item.sha256)problems.push('Locate the original asset: '+item.path+'.');
    if(!item.permission?.localUse||!item.permission?.publication)problems.push('Record video-publication permission for '+item.path+'.');
  }
  let offset=0;
  for(const scene of project.scenes){
    for(const variant of ['portrait','landscape'] as const)try{
      for(const frame of [offset,offset+Math.floor(scene.durationFrames/2),offset+scene.durationFrames-1])evaluateFrame(project,variant,frame);
    }catch(error){problems.push((scene.title??scene.id)+': '+(error as Error).message);}
    offset+=scene.durationFrames;
  }
  return [...new Set(problems)];
}
