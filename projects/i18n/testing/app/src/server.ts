import { REQUEST } from '@angular/core';
import { renderApplication } from '@angular/platform-server';
import { readFile } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import bootstrap from './main.server';

/**
 * Minimal SSR host: renders `/` with `renderApplication` and serves the
 * browser build's static files (the JS bundles and `i18n/*.json`).
 *
 * `REQUEST` is provided at the platform level exactly as `@angular/ssr` does,
 * because it is what gives `@rivinia/i18n` an absolute base URL for the
 * default `jsonLoader()` — the defect this release fixes.
 */
const BROWSER_DIR = fileURLToPath(new URL('../browser/', import.meta.url));
const PORT = Number(process.env['PORT'] ?? 4300);

/**
 * Paths the router owns, so they are rendered by the server. Everything else is
 * a static asset (the JS bundles and `i18n/*.json`) — including the
 * prerendered `toggle/index.html`, which would otherwise mask what the server
 * actually renders.
 */
const PAGES = new Set(['/', '/index.html', '/toggle', '/toggle/']);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

let templateCache: Promise<string> | null = null;
function template(): Promise<string> {
  // `index.csr.html` is the clean shell the builder emits for SSR builds.
  // `index.html` is NOT a shell: `outputMode: 'server'` forces prerendering,
  // so it already contains the rendered app AND its own `ng-state` script.
  // Using it as the template produced two `ng-state` scripts — `getElementById`
  // then finds the prerendered one, which has no dictionaries, and the client
  // refetched (measured 2026-10-28).
  templateCache ??= readFile(join(BROWSER_DIR, 'index.csr.html'), 'utf8').catch(() =>
    readFile(join(BROWSER_DIR, 'index.html'), 'utf8'),
  );
  return templateCache;
}

async function serveStatic(path: string, res: ServerResponse): Promise<void> {
  const safe = normalize(path).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(BROWSER_DIR, safe);
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
}

const server = createServer(async (req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (!PAGES.has(path)) {
    await serveStatic(path, res);
    return;
  }

  const url = `http://127.0.0.1:${PORT}${req.url ?? '/'}`;
  try {
    const html = await renderApplication(bootstrap, {
      document: await template(),
      url,
      platformProviders: [{ provide: REQUEST, useValue: new Request(url) }],
      // `renderApplication` validates the request host against this list
      // (NG05706); there is no implicit default, and an open list would make
      // the host a request-forgery relay. A real deployment passes its own
      // hostname here.
      allowedHosts: ['127.0.0.1', 'localhost'],
    });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (error) {
    console.error('[i18n-e2e] SSR failed:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(error));
  }
});

/**
 * `@angular/build` imports this module from memory while prerendering, in one
 * Piscina worker per batch. Listening on import made every worker race for port
 * 4300 — harmless with a single route, `EADDRINUSE` as soon as `/toggle` joined
 * it (measured 2026-10-29). The socket opens only when this file is the process
 * entry point, which is how the smoke test runs it.
 */
const isEntryPoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[i18n-e2e] SSR listening on http://127.0.0.1:${PORT}`);
  });
}
