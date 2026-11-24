// POST /api/auth  {kind: "faculty" | "bypass", pw}  ->  {ok}
// Passwords live only in Vercel environment variables FACULTY_PASSWORD and BYPASS_PASSWORD.
import { isFaculty, isBypass, readBody, send } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST only' });
  const { kind, pw } = await readBody(req);
  if (kind === 'faculty') {
    if (!process.env.FACULTY_PASSWORD) return send(res, 500, { ok: false, error: 'FACULTY_PASSWORD is not set on the server' });
    return send(res, 200, { ok: isFaculty(pw) });
  }
  if (kind === 'bypass') {
    if (!process.env.BYPASS_PASSWORD && !process.env.FACULTY_PASSWORD) return send(res, 500, { ok: false, error: 'BYPASS_PASSWORD is not set on the server' });
    // The faculty password also works as a bypass password.
    return send(res, 200, { ok: isBypass(pw) || isFaculty(pw) });
  }
  return send(res, 400, { ok: false, error: 'unknown kind' });
}
