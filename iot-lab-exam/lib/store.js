// Shared helpers for the API: Upstash Redis over REST, passwords from environment variables.
// Vercel sets KV_REST_API_URL / KV_REST_API_TOKEN when you add "Upstash for Redis" (Storage tab).
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN also work.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasStore = () => !!(URL_ && TOKEN);

export async function redis(...cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j.result;
}

// Constant-time-ish string compare
function same(a, b) {
  a = String(a ?? ''); b = String(b ?? '');
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
export const isFaculty = pw => !!process.env.FACULTY_PASSWORD && same(pw, process.env.FACULTY_PASSWORD);
export const isBypass = pw => !!process.env.BYPASS_PASSWORD && same(pw, process.env.BYPASS_PASSWORD);

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

export function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

// Deep merge for update(): objects merge, everything else (arrays included) replaces.
export function merge(a, b) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) a = {};
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k], v) : v;
  }
  return out;
}
