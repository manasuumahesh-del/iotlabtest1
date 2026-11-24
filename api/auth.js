// POST /api/auth  {kind: "faculty", pw}  ->  {ok}
// Passwords live only in Vercel environment variable FACULTY_PASSWORD.
// (The student-screen bypass was removed; faculty unlock students from the faculty panel.)
import { isFaculty, readBody, send } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST only' });
  const { kind, pw } = await readBody(req);
  if (kind === 'faculty') {
    if (!process.env.FACULTY_PASSWORD) return send(res, 500, { ok: false, error: 'FACULTY_PASSWORD is not set on the server' });
    return send(res, 200, { ok: isFaculty(pw) });
  }
  return send(res, 400, { ok: false, error: 'unknown kind' });
}
