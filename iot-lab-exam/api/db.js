// Shared exam records for the faculty panel.
//   GET  /api/db?ping=1                 -> {ok, store}
//   GET  /api/db?path=exam/<USN>        -> {exists, data}        (anyone: a student reads their own record)
//   GET  /api/db?path=config/exam       -> {exists, data}        (anyone)
//   GET  /api/db?col=exam               -> {docs:[{id,data}]}    (faculty only)
//   POST /api/db {op:"set"|"update"|"delete", path, data}
//        Students may write their own exam/<USN> record, except the faculty-controlled "ctl" field.
//        Faculty (header x-faculty-pw) may change "ctl", delete records and write config/exam.
import { hasStore, redis, isFaculty, readBody, send, merge } from '../lib/store.js';

const USN = /^[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}$/;
const MAX = 200_000; // bytes per record

function parse(path) {
  const m = /^exam\/([0-9A-Z]{8,12})$/.exec(String(path || ''));
  if (m && USN.test(m[1])) return { kind: 'exam', id: m[1] };
  if (path === 'config/exam') return { kind: 'config' };
  return null;
}
const getExam = async id => { const v = await redis('HGET', 'exam', id); return v ? JSON.parse(v) : null; };
const putExam = (id, d) => redis('HSET', 'exam', id, JSON.stringify(d));

export default async function handler(req, res) {
  try {
    if (!hasStore()) return send(res, 503, { ok: false, store: false, error: 'No Redis store connected. Add Upstash for Redis in the Vercel Storage tab.' });
    const fac = isFaculty(req.headers['x-faculty-pw']);

    if (req.method === 'GET') {
      const q = new URL(req.url, 'http://x').searchParams;
      if (q.get('ping')) return send(res, 200, { ok: true, store: true });
      if (q.get('col') === 'exam') {
        if (!fac) return send(res, 401, { error: 'faculty password needed' });
        const all = (await redis('HGETALL', 'exam')) || [];
        const docs = [];
        for (let i = 0; i < all.length; i += 2) docs.push({ id: all[i], data: JSON.parse(all[i + 1]) });
        return send(res, 200, { docs });
      }
      const p = parse(q.get('path'));
      if (!p) return send(res, 400, { error: 'bad path' });
      if (p.kind === 'config') { const v = await redis('GET', 'config:exam'); return send(res, 200, v ? { exists: true, data: JSON.parse(v) } : { exists: false }); }
      const d = await getExam(p.id);
      return send(res, 200, d ? { exists: true, data: d } : { exists: false });
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'GET or POST' });
    const { op, path, data } = await readBody(req);
    const p = parse(path);
    if (!p) return send(res, 400, { error: 'bad path' });
    if (data && JSON.stringify(data).length > MAX) return send(res, 413, { error: 'record too large' });

    if (p.kind === 'config') {
      if (!fac) return send(res, 401, { error: 'faculty password needed' });
      if (op !== 'set') return send(res, 400, { error: 'config supports set only' });
      const pass = Math.max(0, Math.min(100, Math.round(+data?.pass))), maxSw = Math.max(1, Math.min(10, Math.round(+data?.maxSw)));
      if (!isFinite(pass) || !isFinite(maxSw)) return send(res, 400, { error: 'bad config' });
      await redis('SET', 'config:exam', JSON.stringify({ pass, maxSw }));
      return send(res, 200, { ok: true });
    }

    const cur = await getExam(p.id);
    if (op === 'delete') {
      if (!fac) return send(res, 401, { error: 'faculty password needed' });
      await redis('HDEL', 'exam', p.id);
      return send(res, 200, { ok: true });
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return send(res, 400, { error: 'data must be an object' });
    const body = { ...data };
    if (!fac) { delete body.ctl; }            // students never change faculty controls
    if (op === 'set') {
      const next = { ...body, ctl: fac && data.ctl ? data.ctl : (cur?.ctl || {}) };
      await putExam(p.id, next);
      return send(res, 200, { ok: true });
    }
    if (op === 'update') {
      if (!cur) return send(res, 400, { error: 'record does not exist' });
      const next = merge(cur, body);
      if (fac && data.ctl) next.ctl = data.ctl;   // faculty replaces ctl whole
      await putExam(p.id, next);
      return send(res, 200, { ok: true });
    }
    return send(res, 400, { error: 'unknown op' });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
}
