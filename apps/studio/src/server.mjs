import http from 'node:http';

export function createStudio() {
  return http.createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><html lang="en"><title>Storytelling Studio</title><h1>Storytelling Studio</h1><p>Development stub</p></html>');
  });
}
