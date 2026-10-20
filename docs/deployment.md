# Deployment

The app deploys as two services plus a managed PostgreSQL database. No Docker is required. Any hosts
with the same capabilities work; the examples use common free-tier-friendly options.

```
Vercel (Next.js)  ──/api/* rewrite──►  Render / Railway / Fly (FastAPI)  ──►  Managed PostgreSQL
```

Because the frontend proxies `/api/*`, users only ever see the frontend domain and the session cookie
is first-party. The API domain does not need to be public-facing, but it must be reachable from the
frontend host.

## Quick path: Netlify + Render + Neon (all free tiers)

The repository includes `netlify.toml` (frontend) and `render.yaml` (API Blueprint).

1. **Neon**: create a project and copy the pooled connection string
   (`postgresql://…neon.tech/…?sslmode=require`). The API converts it to the psycopg driver itself.
2. **Render**: New → Blueprint → select this repository. When prompted, set `DATABASE_URL` to the Neon
   string and leave `FRONTEND_ORIGINS` / `FRONTEND_BASE_URL` as a placeholder for now. `SECRET_KEY` is
   generated. Wait for `/health` to return `{"status":"ok"}` and copy the service URL.
3. **Netlify**: Add new project → Import from GitHub → this repository (settings come from
   `netlify.toml`). Add the environment variable `BACKEND_URL=https://<your-api>.onrender.com`, then
   deploy.
4. **Back on Render**: set `FRONTEND_ORIGINS` and `FRONTEND_BASE_URL` to the Netlify URL
   (e.g. `https://<site>.netlify.app`). Render redeploys automatically.

Free-tier caveats: the Render instance sleeps after inactivity (the first request can take about a
minute), and its disk is ephemeral, so uploaded original files disappear on restart while parsed text,
versions and analyses remain in Neon.

## 1. Database

Create a PostgreSQL 16+ database (Neon, Supabase, Render, RDS…). Use a dedicated user and require TLS:

```
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

## 2. Backend (FastAPI)

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Pre-deploy / release command | `alembic upgrade head` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers` |
| Health check | `/health` |
| Python | 3.12 |

Environment variables (see `backend/.env.example`):

```env
ENVIRONMENT=production
DATABASE_URL=...
SECRET_KEY=<48+ random characters>     # startup fails if a placeholder is used
COOKIE_SECURE=true                     # startup fails in production if false
FRONTEND_ORIGINS=https://your-app.vercel.app
FRONTEND_BASE_URL=https://your-app.vercel.app
UPLOAD_DIR=/var/data/uploads           # a persistent disk/volume
AI_PROVIDER=mock | openai
AI_API_KEY=...                         # only with AI_PROVIDER=openai, stored as a secret
SMTP_HOST=... SMTP_USERNAME=... SMTP_PASSWORD=... SMTP_FROM=...
```

**File storage:** uploads are written to `UPLOAD_DIR`. Attach a persistent disk (Render Disk, Railway
Volume, Fly Volume). On hosts with ephemeral filesystems, implement `app/services/storage.py` against
S3-compatible object storage. Its four functions (`save`, `path_for`, `delete`, `delete_user_files`)
are the only storage touchpoints.

**Scaling:** the rate limiter is in-memory. Run a single instance, or move `core/rate_limit.py` to
Redis before scaling horizontally.

## 3. Frontend (Next.js on Vercel)

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework preset | Next.js |
| Build command | `npm run build` |
| Environment | `BACKEND_URL=https://your-api.onrender.com` (no trailing slash) |

`BACKEND_URL` is read at build time to generate the `/api/*` rewrite, so redeploy after changing it.

## 4. Post-deploy checklist

- [ ] `GET https://your-api/health` returns `{"status":"ok"}`
- [ ] Register, upload a resume, save a job and run an analysis on the deployed site
- [ ] The `ra_session` cookie is `HttpOnly`, `Secure` and `SameSite=Lax`
- [ ] `/docs` is acceptable to expose publicly (or restrict it at the proxy)
- [ ] Password reset emails arrive (SMTP configured)
- [ ] With `AI_PROVIDER=openai`, AI features ask for consent and results show the "AI-generated" badge
- [ ] Backups are enabled on the database and upload volume
- [ ] Logs contain no resume text, tokens or passwords (the app only logs error types and status codes)

## 5. Data deletion

- Users delete individual resources from the UI, or everything via **Settings → Delete account**.
  Database rows cascade, and the user's upload directory is removed.
- Data sent to an external AI provider is subject to that provider's retention policy; document it in
  your own privacy notice and prefer providers or settings with zero data retention.
