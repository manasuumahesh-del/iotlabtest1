// Run the site on your own computer: `npm run dev`, then open http://localhost:3000
// Serves the pages, runs /api/* like Vercel does, and (if no Upstash keys are set)
// uses an in-memory Redis so the faculty panel works across browsers on this machine.
// Passwords: set FACULTY_PASSWORD and BYPASS_PASSWORD, or the defaults below are used locally.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +process.env.PORT || 3000;
process.env.FACULTY_PASSWORD ||= 'faculty-local';
process.env.BYPASS_PASSWORD ||= 'bypass-local';

// --- in-memory Redis (only the commands the API uses) ---
const mem = { hash: new Map(), str: new Map() };
function fakeRedis([cmd, ...a]) {
  const h = k => (mem.hash.has(k) || mem.hash.set(k, new Map()), mem.hash.get(k));
  switch (String(cmd).toUpperCase()) {
    case 'HGET': return h(a[0]).get(a[1]) ?? null;
    case 'HSET': h(a[0]).set(a[1], a[2]); return 1;
    case 'HDEL': return h(a[0]).delete(a[1]) ? 1 : 0;
    case 'HGETALL': return [...h(a[0])].flat();
    case 'GET': return mem.str.get(a[0]) ?? null;
    case 'SET': mem.str.set(a[0], a[1]); return 'OK';
    default: throw new Error('unsupported ' + cmd);
  }
}
const useFake = !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);
if (useFake) { process.env.KV_REST_API_URL = `http://127.0.0.1:${PORT}/__redis`; process.env.KV_REST_API_TOKEN = 'local'; }

const api = {
  '/api/db': (await import('../api/db.js')).default,
  '/api/auth': (await import('../api/auth.js')).default,
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/__redis' && useFake) {
    let b = ''; for await (const c of req) b += c;
    try { res.end(JSON.stringify({ result: fakeRedis(JSON.parse(b)) })); } catch (e) { res.end(JSON.stringify({ error: e.message })); }
    return;
  }
  if (api[path]) return api[path](req, res);
  // static files with Vercel-style clean URLs
  const cands = path.endsWith('/') ? [path + 'index.html'] : [path, path + '.html', path + '/index.html'];
  for (const c of cands) {
    const f = join(ROOT, c);
    if (!f.startsWith(ROOT) || /\/(api|lib|tools)\//.test(c)) continue;
    try { if ((await stat(f)).isFile()) { res.setHeader('Content-Type', TYPES[extname(f)] || 'application/octet-stream'); return res.end(await readFile(f)); } } catch {}
  }
  res.statusCode = 404; res.end('Not found');
}).listen(PORT, () => {
  console.log(`IoT Lab Exam running at http://localhost:${PORT}`);
  console.log(`  Student kit  http://localhost:${PORT}/`);
  console.log(`  Lab exam     http://localhost:${PORT}/exam/`);
  console.log(`  Faculty      http://localhost:${PORT}/faculty`);
  if (useFake) console.log('  Storage: in-memory (records are lost when you stop the server)');
});
