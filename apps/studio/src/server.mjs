import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import { requireLocalRequest } from '../../local-service/src/security.ts';

/** Keep the backend token in the local proxy, outside browser JavaScript. */
export function createStudio({ proxy = { origin: '', token: '' } } = {}) {
  let vite;
  let closing = false;
  const setup = () => vite ??= createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    plugins: [vue({ template: { transformAssetUrls } }), quasar()],
    resolve: { alias: {
      '@gstory/project-schema': fileURLToPath(new URL('../../../packages/project-schema/src/index.ts', import.meta.url)),
      '@gstory/story-core': fileURLToPath(new URL('../../../packages/story-core/src/index.ts', import.meta.url)),
      '@gstory/map-adapter': fileURLToPath(new URL('../../../packages/map-adapter/src/mount.ts', import.meta.url)),
    } },
    server: { middlewareMode: true, hmr: false, watch: null, fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] } },
    appType: 'spa',
  });
  const server = http.createServer((request, response) => {
    const address = server.address();
    if (!address || typeof address === 'string') return response.writeHead(503).end();
    try { requireLocalRequest(request, address.port, new Set([`http://127.0.0.1:${address.port}`])); }
    catch { return response.writeHead(403).end('Use the local Studio address.'); }
    if (request.url?.startsWith('/api/')) {
      if (!proxy.origin) return response.writeHead(503).end('The local service is starting.');
      const headers = { ...request.headers, host: new URL(proxy.origin).host, authorization: `Bearer ${proxy.token}` };
      delete headers.connection;
      const upstream = http.request(proxy.origin + request.url, { method: request.method, headers }, result => {
        response.writeHead(result.statusCode ?? 502, result.headers); result.pipe(response);
      });
      upstream.on('error', () => { if (!response.headersSent) response.writeHead(503, { 'content-type': 'application/json' }); response.end('{"message":"The local service is unavailable."}'); });
      request.on('aborted', () => upstream.destroy());
      request.pipe(upstream); return;
    }
    setup().then(async (dev) => {
      if (closing) return response.writeHead(503).end();
      if (['/', '/bridge-preview'].includes(request.url ?? '')) {
        const html = await readFile(new URL('../index.dev.html', import.meta.url), 'utf8');
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(await dev.transformIndexHtml(request.url, html)); return;
      }
      dev.middlewares(request, response, () => response.writeHead(404).end());
    }).catch(error => { console.error('Studio tooling:', error.message); response.writeHead(500).end('Studio tooling failed to start'); });
  });
  server.on('close', () => {
    closing = true;
    void vite?.then((dev) => dev.close()).catch((error) => {
      console.error('Preview tooling failed during shutdown:', error.message);
    });
  });
  return server;
}

