# IoT Lab Exam

BCS701 Internet of Things Lab, Dept. of CSE, CITNC. Faculty: Mahesh N.

Seven Arduino UNO experiments in the browser: a student kit to learn and practise, a proctored lab exam, and a faculty panel that sees every student live.

| Page | Address | Who |
| --- | --- | --- |
| Student kit (Learn and Practice) | `/` | Students |
| Learn mode | `/learn` | Students |
| Practice bench | `/practice` | Students |
| Lab exam | `/exam/` | Students, during the exam |
| Faculty panel | `/faculty` | Faculty only, password needed |

## What the exam does

1. The student enters name and USN, picks a program and types it from memory (pasting blocked).
2. At the pass mark (default 60 %) the test bench opens; the student wires the circuit and submits for a score out of 100.
3. Copy and paste attempts show a warning and are recorded.
4. Tab switches: warnings until the limit (default 3), then the student is out of the exam.

The faculty panel shows every student live and can **bypass** the typing check, **revoke** or **reinstate** a test, **clear tab switches**, **reset** a student, change the pass mark and the tab-switch limit, and copy all results as CSV.

## Deploy on Vercel

1. Create a GitHub repository named `iot-lab-exam` and upload these files (keep the folders).
2. In Vercel: **Add New > Project**, import `iot-lab-exam`. Framework preset: **Other**. No build command. Deploy.
3. In the project: **Storage > Create Database > Upstash for Redis** (free plan), connect it to this project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
4. **Settings > Environment Variables**, add:
   - `FACULTY_PASSWORD`: the faculty panel password
   - `BYPASS_PASSWORD`: the password for the Bypass button on the student's typing screen (the faculty password also works there)
5. **Deployments > Redeploy** so the new settings take effect.

Passwords are only checked on the server. They are never in the page code, so the repository can be public.

Without the Redis store the site still works, but each computer keeps its own records and the faculty panel shows only students who used that browser.

## Run on your own computer

Needs Node.js 18 or later.

```
npm run dev
```

Open http://localhost:3000. Local passwords default to `faculty-local` and `bypass-local`; set `FACULTY_PASSWORD` and `BYPASS_PASSWORD` to change them. Records are kept in memory until you stop the server.

## Files

```
index.html, learn.html, practice.html   student kit
exam/index.html                         lab exam + faculty panel (#faculty)
faculty/index.html                      short link to the faculty panel
api/auth.js                             password check
api/db.js                               exam records (Upstash Redis)
lib/store.js                            shared server helpers
tools/local-server.js                   local test server
```
