const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png':'image/png' };
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let file;
  try { file = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  if (file === '/') file = '/index.html';
  // Serve only runtime assets, never backups, documents or future server files.
  const allowed = /^\/assets\/crests\/br-\d{1,2}\.png$/.test(file) || file === '/index.html' || /^\/(styles|src)\/[a-zA-Z0-9/_-]+\.(css|js)$/.test(file);
  if (!allowed) { response.writeHead(404).end(); return; }
  try {
    const bytes = await fs.readFile(path.join(root, file));
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(404).end(); }
});
server.on('error', error => { console.error('Servidor local:', error.message); process.exitCode = 1; });
server.listen(5173, '127.0.0.1', () => console.log('MAXBALL: http://127.0.0.1:5173 (Ctrl+C para encerrar)'));
