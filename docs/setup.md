# Local setup

## Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Node.js | 22.x (≥ 22.13 recommended) | npm 10+ |
| Python | 3.12 | |
| PostgreSQL | 16 or 17 | Any install works; a no-admin portable option is below |
| Git | any | |

Docker is not required.

## 1. Database

**Option A: existing PostgreSQL.** Create a user and databases:

```sql
CREATE ROLE resume_app LOGIN PASSWORD 'choose-a-password';
CREATE DATABASE resume_analyzer OWNER resume_app;
CREATE DATABASE resume_analyzer_test OWNER resume_app;  -- backend tests (wiped on every run)
CREATE DATABASE resume_analyzer_e2e OWNER resume_app;   -- Playwright tests (wiped on every run)
```

**Option B: portable PostgreSQL on Windows (no installer, no admin).** Downloads the official EDB
binaries into the git-ignored `.devtools/` folder and listens on `localhost` only:

```powershell
.\scripts\dev-db.ps1 install   # prompts for two passwords, creates role + databases
.\scripts\dev-db.ps1 start     # after a reboot
.\scripts\dev-db.ps1 stop
```

## 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
Copy-Item .env.example .env           # then edit DATABASE_URL and SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(48))"   # paste as SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs>.

Optional demo data (fictional, every item prefixed with `[Demo]`):

```powershell
python -m scripts.seed_demo     # demo@example.com / DemoPassword1
```

## 3. Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local     # BACKEND_URL=http://127.0.0.1:8000
npm run dev
```

Open <http://localhost:3000>.

Use `127.0.0.1` rather than `localhost` for `BACKEND_URL`: Node may resolve `localhost` to IPv6 `::1`,
while uvicorn listens on IPv4 by default.

## 4. AI provider (optional)

Without configuration the app uses the **rule-based demo provider**. Its output is always labeled
"Demo · rule-based (not AI)" and nothing leaves the server.

To use a real model, set in `backend/.env`:

```env
AI_PROVIDER=openai
AI_API_KEY=sk-...                     # never commit this
AI_MODEL=gpt-5-mini                   # any model supporting JSON-schema structured outputs
AI_BASE_URL=https://api.openai.com/v1 # or another OpenAI-compatible endpoint
```

Restart the API. Each user must then enable **Settings → AI processing** before redacted resume
content is sent. Usage is limited by `AI_RATE_LIMIT_PER_MINUTE` and `AI_RATE_LIMIT_PER_DAY`.

## 5. Password reset email

Without `SMTP_HOST`, development prints the reset link to the API console (development only). Set the
`SMTP_*` variables to send real email.

## 6. Running checks

```powershell
# Backend (uses resume_analyzer_test; override with TEST_DATABASE_URL)
cd backend
pytest
ruff check app tests scripts
ruff format --check app tests scripts
mypy app

# Frontend
cd frontend
npm run typecheck
npm run lint
npm test                  # Vitest + Testing Library
npx playwright install chromium   # first time only
npm run test:e2e          # builds the app, starts an isolated API on :8100 and the web app on :3100
```

The E2E run resets the `resume_analyzer_e2e` schema (override with `E2E_DATABASE_URL`) and always uses
the mock AI provider, so it never makes paid API calls.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "The server is unavailable right now" on every request | API not running, or `BACKEND_URL` uses `localhost`; use `127.0.0.1` |
| `SECRET_KEY` validation error at startup | Set a value of at least 32 characters in `backend/.env` |
| `AI_API_KEY is required when AI_PROVIDER=openai` | Add the key or switch back to `AI_PROVIDER=mock` |
| Scanned PDF rejected | Expected: OCR is not supported. Export a text-based PDF or upload DOCX |
| Odd module errors after running dev and E2E together | Stop both, delete `frontend/.next`, restart (E2E uses `.next-e2e` to avoid this) |
