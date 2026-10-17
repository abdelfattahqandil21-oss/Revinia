import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import process from 'node:process';

const dir = process.argv[2] || 'dist/menu-e2e/browser';
const port = Number(process.argv[3] || 4299);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const safe = normalize(url).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = join(dir, safe === '/' ? 'index.html' : safe);
    try {
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      const data = await readFile(join(dir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    }
  } catch (err) {
    res.writeHead(500);
    res.end(String(err));
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log('serving', dir, 'on', port);
});
