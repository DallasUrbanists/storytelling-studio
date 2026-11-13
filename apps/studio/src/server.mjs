import http from 'node:http';
import { fileURLToPath, URL } from 'node:url';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';

export function createStudio() {
  let vite;
  let closing = false;
  const setup = () => vite ??= createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    plugins: [vue()],
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'spa',
  });
  const server = http.createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html lang="en"><title>Storytelling Studio</title><h1>Storytelling Studio</h1><p>Development stub</p><a href="/bridge-preview">Diagnostic bridge preview</a></html>');
      return;
    }
    setup().then((dev) => {
      if (closing) return response.writeHead(503).end();
      dev.middlewares(request, response, () => response.writeHead(404).end());
    }).catch(() => response.writeHead(500).end('Preview tooling failed to start'));
  });
  server.on('close', () => {
    closing = true;
    void vite?.then((dev) => dev.close()).catch((error) => {
      console.error('Preview tooling failed during shutdown:', error.message);
    });
  });
  return server;
}
