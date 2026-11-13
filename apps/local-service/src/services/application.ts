import type http from 'node:http';
import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SqliteProjectRepository } from '../db/project-repository.ts';
import { exportGstory, importGstory, PACKAGE_LIMITS } from '../packaging/gstory.ts';
import { HttpError, opaqueId } from '../security.ts';
import { preflight } from './preflight.ts';
import { startRender } from './render-runner.ts';

const send = (response: http.ServerResponse, value: unknown, status = 200) => { response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); response.end(JSON.stringify(value)); };
async function body(request: http.IncomingMessage, max: number): Promise<Buffer> {
  if (request.headers['content-encoding']) throw new HttpError(415, 'UNSUPPORTED_ENCODING', 'Compressed uploads are unsupported.');
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) { size += chunk.length; if (size > max) throw new HttpError(413, 'REQUEST_TOO_LARGE', 'File size limit exceeded.'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function json(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  if (request.headers['content-type'] !== 'application/json') throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json.');
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await body(request, 1024 * 1024)));
}

/** Add bounded asset, exchange, research and saved-revision job routes behind session checks. */
export function applicationRoutes(repository: SqliteProjectRepository, directory: string) {
  const cancel = new Map<string, () => Promise<void>>();
  const research = new Map<string, Worker>();
  const route = async (request: http.IncomingMessage, response: http.ServerResponse, target: string): Promise<boolean> => {
    if (!/^\/api\/(assets|package-import|packages|preflight|research|jobs)(\/|$)/.test(target)) return false;
    try {
      if (target === '/api/assets' && request.method === 'POST') {
        const mediaType = request.headers['x-asset-type'];
        if (typeof mediaType !== 'string' || !['application/json','text/plain','text/csv','image/png','image/jpeg','font/woff2'].includes(mediaType)) throw new Error('Choose JSON, CSV, plain text, PNG, JPEG, or WOFF2 assets.');
        const bytes = await body(request, 32 * 1024 * 1024);
        if (mediaType === 'application/json') JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        if (mediaType === 'image/png' && bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG.');
        if (mediaType === 'image/jpeg' && bytes.subarray(0, 3).toString('hex') !== 'ffd8ff') throw new Error('Invalid JPEG.');
        if (mediaType === 'font/woff2' && bytes.subarray(0, 4).toString() !== 'wOF2') throw new Error('Invalid WOFF2 font.');
        send(response, { sha256: repository.putAsset(bytes, mediaType), bytes: bytes.length }, 201); return true;
      }
      const assetMatch = /^\/api\/assets\/([a-f0-9]{64})$/.exec(target);
      if (assetMatch && request.method === 'GET') {
        const bytes = repository.getAsset(assetMatch[1]); if (!bytes) throw new HttpError(404, 'NOT_FOUND', 'Asset is missing.');
        response.writeHead(200, { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); response.end(bytes); return true;
      }
      if (target === '/api/package-import' && request.method === 'POST') {
        const imported = importGstory(await body(request, PACKAGE_LIMITS.compressed));
        const envelope = repository.import(imported.document, imported.assets, opaqueId(request.headers['x-mutation-id']));
        send(response, { ...envelope, omittedAssets: imported.omittedAssets }, 201); return true;
      }
      const packageMatch = /^\/api\/packages\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/(portable|references)$/.exec(target);
      if (packageMatch && request.method === 'GET') {
        const [, projectId, revisionId, mode] = packageMatch;
        const saved = repository.get(projectId, revisionId); if (!saved) throw new HttpError(404, 'NOT_FOUND', 'Saved project is missing.');
        const bytes = exportGstory(saved.document, revisionId, hash => repository.getAsset(hash), mode as 'portable' | 'references');
        response.writeHead(200, { 'content-type': 'application/zip', 'content-disposition': 'attachment; filename="story.gstory"', 'cache-control': 'no-store' }); response.end(bytes); return true;
      }
      if (target === '/api/preflight' && request.method === 'POST') {
        const input = await json(request), saved = repository.get(opaqueId(input.projectId), opaqueId(input.revisionId));
        if (!saved) throw new Error('Save this project before exporting.');
        send(response, preflight(saved.document, hash => repository.getAsset(hash))); return true;
      }
      if (target === '/api/research' && request.method === 'POST') {
        const input = await json(request), saved = repository.get(opaqueId(input.projectId), opaqueId(input.revisionId));
        if (!saved) throw new Error('Save the selected project before running research.');
        const area = saved.document.featureRevisions.find(f => f.id === input.featureRevisionId);
        if (!area || !['Polygon','MultiPolygon'].includes(area.geometry.type)) throw new Error('Select a saved area.');
        const tableAsset = saved.document.assets.find(a => a.id === input.tableAssetId), boundaryAsset = saved.document.assets.find(a => a.id === input.boundaryAssetId);
        if (!tableAsset || !boundaryAsset) throw new Error('Save both source files in the project first.');
        const tableBytes = repository.getAsset(tableAsset.sha256), boundaryBytes = repository.getAsset(boundaryAsset.sha256);
        if (!tableBytes || !boundaryBytes) throw new Error('Research source bytes are missing.');
        let table = JSON.parse(Buffer.from(tableBytes).toString('utf8'));
        if (Array.isArray(table[0])) { const [keys, ...rows] = table; table = rows.map((row: unknown[]) => Object.fromEntries(keys.map((key: string, i: number) => [key, row[i]]))); }
        const tableSource = saved.document.sources.find(s => s.sourceKind === 'dataset' && s.contentSha256 === tableAsset.sha256);
        const boundarySource = saved.document.sources.find(s => s.sourceKind === 'dataset' && s.contentSha256 === boundaryAsset.sha256);
        if (!tableSource || tableSource.sourceKind !== 'dataset' || tableSource.version !== 'ACS5-2024' || tableSource.referencePeriod !== '2020-2024' || !boundarySource || boundarySource.sourceKind !== 'dataset' || boundarySource.boundaryVintage !== '2024') throw new Error('Confirm the retained ACS 2024 five-year and TIGER 2024 source metadata.');
        if (research.size) throw new Error('Wait for the active analysis or cancel it before starting another.');
        const id = randomUUID();
        const record = { id, kind: 'research', projectId: saved.projectId, revisionId: saved.revisionId, featureRevisionId: area.id, tableAssetId: tableAsset.id, boundaryAssetId: boundaryAsset.id, status: 'running', progress: 0 };
        repository.putJob(record);
        const worker = new Worker(new URL('./research-worker.ts', import.meta.url), { workerData: { rows: table, boundaries: JSON.parse(Buffer.from(boundaryBytes).toString('utf8')), geometry: area.geometry, period: tableSource.referencePeriod } });
        research.set(id, worker);
        let finished = false;
        const finish = (error?: string, result?: unknown) => { if (finished) return; finished = true; research.delete(id); if (repository.getJob(id)?.status === 'cancelled') return; repository.putJob({ ...record, status: error ? 'failed' : 'completed', progress: error ? 0 : 1, ...(error ? { error } : { result }) }); };
        worker.on('message', message => finish(message.error, message.result));
        worker.on('error', () => finish('The local analysis worker could not complete. The source inputs are retained.'));
        worker.on('exit', code => { if (!finished) finish('Analysis stopped before returning a verified result (exit ' + code + ').'); });
        send(response, { id }, 202); return true;
      }
      if (target === '/api/jobs' && request.method === 'POST') {
        const input = await json(request), saved = repository.get(opaqueId(input.projectId), opaqueId(input.revisionId));
        if (!saved) throw new Error('Save the selected project before exporting.');
        if (!Array.isArray(input.variants) || !input.variants.length || input.variants.some(v => !['portrait','landscape'].includes(String(v))) || new Set(input.variants).size !== input.variants.length) throw new Error('Choose portrait, landscape, or both.');
        const issues = preflight(saved.document, hash => repository.getAsset(hash)); if (issues.length) { send(response, { code: 'PREFLIGHT_FAILED', message: issues.join(' ') }, 422); return true; }
        if (cancel.size) throw new Error('An export is already running. Wait or cancel it before starting another.');
        const id = randomUUID(), folder = path.join(directory, 'jobs', id);
        await mkdir(folder, { recursive: true });
        const assets = [];
        for (const asset of saved.document.assets.filter(a => ['fixture-style','fixture-font','font-license'].includes(a.id))) {
          const file = path.join(folder, asset.sha256); await writeFile(file, repository.getAsset(asset.sha256)!); assets.push({ ...asset, file });
        }
        await writeFile(path.join(folder, 'input.json'), JSON.stringify({ ...saved, variants: input.variants, assets }));
        repository.putJob({ id, kind: 'render', projectId: saved.projectId, revisionId: saved.revisionId, status: 'queued', progress: 0 });
        const stop = startRender(folder, progress => repository.putJob({ ...repository.getJob(id)!, id, status: 'running', progress }), async (error) => {
          cancel.delete(id); if (repository.getJob(id)?.status === 'cancelled') return;
          let receipt;
          if (!error) try { receipt = JSON.parse(await readFile(path.join(folder, 'receipt.json'), 'utf8')); } catch { error = 'The render did not produce a completion receipt.'; }
          repository.putJob({ ...repository.getJob(id)!, id, status: error ? 'failed' : 'completed', progress: error ? 0 : 1, ...(error ? { error } : { receipt }) });
        }); cancel.set(id, stop); send(response, { id }, 202); return true;
      }
      const jobMatch = /^\/api\/jobs\/([A-Za-z0-9_-]+)(?:\/(cancel|portrait|landscape))?$/.exec(target);
      if (jobMatch) {
        const [, id, action] = jobMatch, job = repository.getJob(id); if (!job) throw new HttpError(404, 'NOT_FOUND', 'Unknown job.');
        if (!action && request.method === 'GET') { send(response, job); return true; }
        if (action === 'cancel' && request.method === 'POST') {
          if (['running','queued'].includes(String(job.status))) { cancel.get(id)?.(); void research.get(id)?.terminate(); repository.putJob({ ...job, id, status: 'cancelled' }); }
          send(response, repository.getJob(id)); return true;
        }
        if (['portrait','landscape'].includes(action) && request.method === 'GET' && job.status === 'completed') {
          const bytes = await readFile(path.join(directory, 'jobs', id, action + '.mp4'));
          response.writeHead(200, { 'content-type': 'video/mp4', 'content-disposition': `attachment; filename="${action}.mp4"`, 'cache-control': 'no-store' }); response.end(bytes); return true;
        }
      }
      throw new HttpError(404, 'NOT_FOUND', 'Unknown resource.');
    } catch (error) {
      if (error instanceof HttpError) throw error;
      send(response, { code: 'INVALID_INPUT', message: error instanceof Error && !/ENOENT|EPERM|EACCES|SQLITE/.test(error.message) ? error.message : 'The requested file or local operation is unavailable.' }, 422); return true;
    }
  };
  return Object.assign(route, { close: async () => { await Promise.all([...cancel.values()].map(stop => stop())); await Promise.all([...research.values()].map(worker => worker.terminate())); } });
}
