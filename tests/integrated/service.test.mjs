import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { SqliteProjectRepository, hashBytes } from '../../apps/local-service/src/db/project-repository.ts';
import { createService } from '../../apps/local-service/src/server.ts';
import { applicationRoutes } from '../../apps/local-service/src/services/application.ts';
import { canonicalJson } from '../../packages/project-schema/src/canonical.ts';
import { exportGstory, importGstory, readZip } from '../../apps/local-service/src/packaging/gstory.ts';
import { zipSync } from 'fflate';

async function environment(t) {
  const directory=await mkdtemp(path.join(tmpdir(),'gstory-integrated-'));
  const repository=new SqliteProjectRepository(directory), extension=applicationRoutes(repository,directory), token='a'.repeat(64);
  const server=createService({repository,extension,sessionToken:token,dataDirectory:directory});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await extension.close();repository.close();const resolved=path.resolve(directory);assert.ok(resolved.startsWith(path.resolve(tmpdir())+path.sep));await rm(resolved,{recursive:true,force:true});});
  const request=async(route,method='GET',value)=>{const response=await fetch(origin+route,{method,headers:{Origin:origin,Authorization:'Bearer '+token,...(value?{'Content-Type':'application/json'}:{})},body:value?JSON.stringify(value):undefined});return {status:response.status,value:await response.json()};};
  return {repository,request};
}
const area={type:'Polygon',coordinates:[[[0,0],[.01,0],[.01,.01],[0,.01],[0,0]]]};
test('HTTP research worker computes a retained fixture and cannot overwrite a saved revision',async t=>{
  const {repository,request}=await environment(t);
  const created=await request('/api/projects','POST',{title:'Synthetic API acceptance',clientMutationId:randomUUID()});
  assert.equal(created.status,201);const saved=created.value, d=saved.document;
  const rows=[{GEOID:'010010001001',B01003_001E:'250',B01003_001M:'30'}], boundaries={type:'FeatureCollection',features:[{type:'Feature',properties:{GEOID:'010010001001'},geometry:area}]};
  for(const [id,value,version,period]of[['table',rows,'ACS5-2024','2020-2024'],['boundary',boundaries,'TIGER-2024','2024']]){
    const sha=repository.putAsset(Buffer.from(JSON.stringify(value)),'application/json');
    d.assets.push({id,path:'assets/'+id+'.json',mediaType:'application/json',sha256:sha,permission:{localUse:true,publication:true,redistribution:true,license:'Synthetic test fixture',credit:'Synthetic fixture'}});
    d.sources.push({id,sourceKind:'dataset',title:'Synthetic '+id,publisher:'Automated test',version,referencePeriod:period,boundaryVintage:'2024',contentSha256:sha,universe:'Synthetic population',rights:{localUse:'allowed',publication:'allowed',redistribution:'allowed'},interpretation:'synthetic'});
  }
  d.features=[{id:'area',name:'Synthetic area',kind:'area',currentRevisionId:'area-v1'}];d.featureRevisions=[{id:'area-v1',featureId:'area',geometry:area,geometrySha256:hashBytes(canonicalJson(area)),sourceIds:['boundary']}];
  const revision=await request('/api/projects/'+d.id,'PUT',{document:d,expectedRevisionId:saved.revisionId,clientMutationId:randomUUID()});assert.equal(revision.status,200);
  const running=await request('/api/research','POST',{projectId:d.id,revisionId:revision.value.revisionId,featureRevisionId:'area-v1',tableAssetId:'table',boundaryAssetId:'boundary'});assert.equal(running.status,202);
  let job;for(let i=0;i<80;i++){job=(await request('/api/jobs/'+running.value.id)).value;if(job.status!=='running')break;await new Promise(resolve=>setTimeout(resolve,25));}
  assert.equal(job.status,'completed');assert.equal(job.result.population,250);assert.equal(job.result.contributions[0].marginOfError,30);
  assert.equal(repository.get(d.id).revisionId,revision.value.revisionId);
  const stale=await request('/api/projects/'+d.id,'PUT',{document:d,expectedRevisionId:saved.revisionId,clientMutationId:randomUUID()});assert.equal(stale.status,409);
});
test('archive traversal, case collisions and undeclared payloads fail before import',()=>{
  const zip=entries=>zipSync(Object.fromEntries(Object.entries(entries).map(([name,value])=>[name,Buffer.from(value)])),{level:0});
  assert.throws(()=>readZip(zip({'../escape':'x'})),/path|Unsafe|unsafe/i);
  assert.throws(()=>readZip(zip({'A.json':'1','a.json':'2'})),/Duplicate|duplicate|collision/i);
  assert.throws(()=>importGstory(zip({'manifest.json':'{}','project.json':'{}','extra':'x'})),/Unsupported/);
});
test('reference package reports an omitted asset and portable mode refuses its bytes',async t=>{
  const {repository}=await environment(t), saved=repository.create({title:'Permission fixture',clientMutationId:randomUUID()});
  const d=saved.document;d.assets[0].permission.redistribution=false;
  assert.throws(()=>exportGstory(d,saved.revisionId,sha=>repository.getAsset(sha)),/redistribution permission/);
  const packageBytes=exportGstory(d,saved.revisionId,sha=>repository.getAsset(sha),'references');
  const restored=importGstory(packageBytes);assert.equal(restored.omittedAssets.length,1);assert.equal(restored.omittedAssets[0].assetId,'fixture-style');
  const imported=repository.import(restored.document,restored.assets,randomUUID());assert.notEqual(imported.projectId,d.id);assert.equal(imported.document.importedFrom.revisionId,saved.revisionId);
});
test('a false geometry digest rolls back the entire save',async t=>{
  const {repository}=await environment(t), saved=repository.create({title:'Digest fixture',clientMutationId:randomUUID()});
  const d=saved.document;d.features=[{id:'p',kind:'point',name:'point',currentRevisionId:'p-v1'}];d.featureRevisions=[{id:'p-v1',featureId:'p',geometry:{type:'Point',coordinates:[0,0]},geometrySha256:'a'.repeat(64),sourceIds:[]}];
  assert.throws(()=>repository.save(d.id,{document:d,expectedRevisionId:saved.revisionId,clientMutationId:randomUUID()}),/checksum/);
  assert.equal(repository.get(d.id).revisionId,saved.revisionId);
});
