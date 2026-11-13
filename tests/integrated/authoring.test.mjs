import test from 'node:test';
import assert from 'node:assert/strict';
import { allocatePopulation, joinPopulationRows, compareMeasures } from '../../packages/story-core/src/population.ts';
import { roadwayPreset, evaluateRoadwayAnimation, validateBandMapping } from '../../packages/story-core/src/roadway-animation.ts';
import { sandboxedBrowserArguments } from '../../apps/renderer/src/sandboxed-browser.ts';
import { readGeoJson, fitGeometry, retimeProject } from '../../packages/story-core/src/authoring.ts';
import { evaluateFrame } from '../../packages/story-core/src/index.ts';
import { blankProject } from '../../apps/local-service/src/db/project-repository.ts';

const square = { type: 'Polygon', coordinates: [[[0,0],[.02,0],[.02,.02],[0,.02],[0,0]]] };
const unit = { geoid: '010010001001', geometry: square, estimate: 1000, marginOfError: 70, estimateAnnotation: null, marginAnnotation: null };
test('population allocation preserves a whole count and reports density from the same geodesic area', () => {
  const r = allocatePopulation(square, [unit]);
  assert.equal(r.complete,true); assert.equal(r.population,1000); assert.equal(r.contributions[0].fraction,1);
  assert.equal(r.contributions[0].marginOfError,70); assert.equal(r.densityPerKm2,1000/(r.areaM2/1e6));
});
test('missing counts and incomplete coverage never become zero-population claims', () => {
  assert.equal(allocatePopulation(square,[{...unit,estimate:null}]).population,null);
  const half = {...square,coordinates:[[[0,0],[.01,0],[.01,.02],[0,.02],[0,0]]]};
  const r=allocatePopulation(square,[{...unit,geometry:half}]);
  assert.equal(r.complete,false); assert.equal(r.population,null); assert.ok(Math.abs(r.coverage-.5)<.00001);
});
test('overlapping or duplicated units cannot silently double-count population', () => {
  assert.throws(()=>allocatePopulation(square,[unit,unit]),/distinct/);
  assert.throws(()=>allocatePopulation(square,[unit,{...unit,geoid:'010010001002'}]),/Overlapping/);
});
test('Census joins retain leading zeros, annotations, and unmatched rows', () => {
  const r=joinPopulationRows([{GEO_ID:'1500000US010010001001',B01003_001E:'-666666666',B01003_001M:'N',B01003_001EA:'**'}],{type:'FeatureCollection',features:[{properties:{GEOID:'010010001001'},geometry:square}]});
  assert.equal(r.units[0].geoid,'010010001001');assert.equal(r.units[0].estimate,null);assert.equal(r.units[0].estimateAnnotation,'**');
  assert.throws(()=>joinPopulationRows([{GEOID:10010001001}],{type:'FeatureCollection',features:[]}),/strings/);
});
test('roadway reallocation conserves total width at every sampled frame and is seek independent', () => {
  const preset=roadwayPreset('corridor','road'), before=JSON.stringify(preset);
  for(const frame of [100,0,50,25,99,1,100,50]){
    const r=evaluateRoadwayAnimation(preset.roadway,preset.mappings,frame,0,100);
    const bands=r.segments[0].bands;
    assert.ok(Math.abs(bands.reduce((n,b)=>n+b.width,0)-20)<1e-10);
    assert.ok(Math.abs(bands.reduce((n,b)=>n+b.widthEnd,0)-20)<1e-10);
    assert.ok(bands.every(b=>b.width>=0));
    if(frame===0) assert.equal(bands.find(b=>b.to==='bike-lane').width,0);
    if(frame===100)assert.equal(bands.find(b=>b.from==='through-lane'&&!b.to).width,0);
  }
  assert.equal(JSON.stringify(preset),before);
  const bad=structuredClone(preset.mappings['segment-1']);bad.reverse();
  assert.throws(()=>validateBandMapping(preset.roadway.segments[0].existing.bands,preset.roadway.segments[0].proposed.bands,bad),/saved order/);
});
test('multipart import preserves separate parts and fitting respects aspect ratio',()=>{
  const geometry={type:'MultiLineString',coordinates:[[[0,0],[.01,.01]],[[1,1],[1.01,1.01]]]};
  assert.deepEqual(readGeoJson(geometry)[0].geometry,geometry);
  const p=fitGeometry(square,{width:1080,height:1920}), l=fitGeometry(square,{width:1920,height:1080});
  assert.deepEqual(p.center,l.center);
  assert.throws(()=>readGeoJson({type:'LineString',coordinates:[[0,0],[0,0]]}),/distinct/);
});
test('scene retiming follows stable scene IDs and rejects a reversed Keep-visible range',()=>{
  const p=blankProject('Range');p.scenes.push({...structuredClone(p.scenes[0]),id:'second',durationFrames:150});
  p.features=[{id:'area',name:'Synthetic area',kind:'area',currentRevisionId:'r'}];p.featureRevisions=[{id:'r',featureId:'area',geometry:square,geometrySha256:'a'.repeat(64),sourceIds:[]}];p.layers=[{id:'l',featureRevisionId:'r',order:0,startFrame:300,endFrameExclusive:450,sceneRange:{from:'second',through:'second'},fillFade:{startFrame:310,endFrameExclusive:330}}];p.scenes[0].durationFrames=120;
  const result=retimeProject(p);assert.equal(result.layers[0].startFrame,120);assert.equal(result.layers[0].fillFade.startFrame,130);assert.equal(result.layers[0].fillFade.endFrameExclusive,150);
  assert.equal(evaluateFrame(result,'landscape',129).layers[0].style.fillOpacity,0);assert.equal(evaluateFrame(result,'landscape',149).layers[0].style.fillOpacity,.26);
  result.layers[0].sceneRange={from:'second',through:result.scenes[0].id};assert.throws(()=>retimeProject(result),/range/);
});
test('owned Chromium launch keeps browser, GPU, and site sandboxes enabled',()=>{
  const args=sandboxedBrowserArguments('C:/local/profile');
  for(const flag of ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu-sandbox','--disable-web-security','--disable-site-isolation-trials'])assert.ok(!args.includes(flag));
  assert.ok(args.includes('--remote-debugging-address=127.0.0.1'));
});

test('comparison rejects overlapping periods and spatially aggregated medians',()=>{const a={value:100,variable:'population',universe:'residents',units:'people',geographySha256:'a'.repeat(64),method:'area-weighted-count',periodStart:2015,periodEnd:2019,kind:'count'};const b={...a,value:120,periodStart:2020,periodEnd:2024};assert.equal(compareMeasures(a,b).change,20);assert.throws(()=>compareMeasures(a,{...b,periodStart:2019}),/nonoverlapping/);assert.throws(()=>compareMeasures({...a,kind:'median'},{...b,kind:'median'}),/medians/);assert.equal(compareMeasures({...a,value:0},b).percent,null);});
