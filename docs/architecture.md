# Architecture

```
Browser ──► Next.js (App Router, Mantine UI)  ──/api/* rewrite──►  FastAPI  ──►  PostgreSQL
            same origin, httpOnly cookie                            │
                                                                    ├──► Local file storage (uploads)
                                                                    └──► AI provider (optional, redacted input)
```

## Request flow

1. The browser only talks to the Next.js origin. `next.config.ts` rewrites `/api/*` to the FastAPI
   service (`BACKEND_URL`). The session cookie is therefore first-party in development and production,
   and the backend never needs third-party cookies.
2. FastAPI authenticates every request (`app/api/deps.py`): Bearer token if present (Swagger/API
   clients), otherwise the `ra_session` httpOnly cookie. Cookie-authenticated writes must also send an
   `X-Requested-With` header (CSRF defence in depth on top of `SameSite=Lax`).
3. Routers stay thin: validate input with Pydantic, call a service, serialize with a response schema.

## Backend layers (`backend/app`)

| Layer | Responsibility |
|---|---|
| `api/` | Routers per resource, dependencies (auth, pagination), cookie helpers |
| `schemas/` | Pydantic request/response models, structured resume data, AI output schemas |
| `services/` | Business logic: upload, parsing, matching, AI orchestration, export, dashboard |
| `services/parsing/` | Text extraction (PyMuPDF, python-docx), resume and job parsers, skills taxonomy |
| `services/matching/` | Deterministic scoring engine (see [scoring.md](scoring.md)) |
| `services/ai/` | Provider interface, OpenAI-compatible provider, rule-based mock, prompts, redaction, guardrails |
| `repositories/` | Ownership-scoped queries; a resource owned by someone else is reported as 404 |
| `models/` | SQLAlchemy 2.0 ORM models |
| `core/` | Settings, security (Argon2, JWT), error types and handlers, rate limiter |
| `db/` | Engine/session, declarative base with naming conventions |

## Data model

```
users ─┬─< resumes ──< resume_versions ─┬─< analyses >── job_descriptions >─┐
       │                                ├─< ai_feedback                     │
       │                                └─< interview_preps >───────────────┤
       ├─< job_descriptions ────────────────────────────────────────────────┘
       └─< password_reset_tokens
```

- **resumes** hold the immutable upload: original filename, stored file name (random), SHA-256 (unique
  per user to reject duplicate uploads), extracted text.
- **resume_versions** hold structured content as JSONB validated by `schemas/resume_data.py`.
  Version 1 is the parsed original; edits and AI-assisted revisions are saved as new versions.
- **analyses** snapshot a deterministic `match_result` plus optional `ai_insights`. An analysis is marked
  *stale* when its resume version or job was updated after it was created.
- `user_id` is stored on analyses, feedback and interview preps (although derivable through joins) so
  that ownership checks and dashboard aggregations hit one indexed column.
- All foreign keys cascade on delete, so deleting a resume, job or account removes derived data.

## AI integration

`services/ai/base.py` defines an `AIProvider` with three operations: match insights, resume feedback,
interview prep. Business services only depend on this interface.

| Provider | When | Notes |
|---|---|---|
| `OpenAIProvider` | `AI_PROVIDER=openai` | Chat Completions over HTTP with strict JSON-schema structured output; works with any OpenAI-compatible API via `AI_BASE_URL`. Timeouts, retry on 408/429/5xx, safe error messages. |
| `MockAIProvider` | default / tests | Rule-based templates over the deterministic analysis. Always labeled `is_mock` and shown as "Demo · rule-based (not AI)". |

Safety pipeline for every AI call:

1. **Consent**: external providers require `users.ai_processing_consent`; otherwise feedback and
   interview prep return 403 `ai_consent_required`, and analyses skip insights.
2. **Rate limit**: per-user per-minute and per-day limits (`AI_RATE_LIMIT_*`).
3. **Redaction** (`redaction.py`): contact block removed; name, emails, phone numbers and URLs masked.
4. **Prompting** (`prompts.py`): resume and job text are delimited data; grounding rules forbid inventing facts.
5. **Validation**: responses must parse into the Pydantic output schema or the call fails cleanly.
6. **Grounding** (`guardrails.py`): quoted bullets must exist in the resume (fuzzy match) or are dropped;
   suggestions introducing numbers or skills absent from the resume are flagged `requires_verification`.
7. **Save-time check**: versions containing placeholders such as `[add metric]` are rejected (422).

## Frontend (`frontend/`)

| Folder | Contents |
|---|---|
| `app/(marketing)` | Landing, features (incl. scoring), privacy; server-rendered |
| `app/(auth)` | Split-screen login, register, forgot/reset password (shared `AuthCard`) |
| `app/(app)` | Authenticated pages inside `AppLayout`; each page is a thin composition of feature components |
| `components/ui` | Design-system primitives used everywhere: `SectionCard`, `DataTable` (typed columns), `StatCard`, `PageHeader`, `EmptyState`, `QueryBoundary`, `IconAction`, `PriorityList`, `BulletList`, `MetricTile`, `SearchInput`, `ListPagination`, `FormAlert`, `AISourceBadge` |
| `components/domain` | Visuals shared across features: `ScoreRing`/`ScoreBadge`, `ScoreBreakdown`, skill badges, `VersionSourceBadge` |
| `components/layout` | App shell (grouped sidebar from `navigation.ts`, `UserMenu`), public header, logo, theme toggle |
| `components/marketing` | `Section`, `FeatureCard`, `ProductPreview` (labeled sample data) |
| `features/*` | Per-domain TanStack Query hooks (`api.ts`), Zod schemas, and components such as `ResumeWorkspace`, `FeedbackReport`, `JobChecklist`, `AnalysisHistoryTable`, pickers (`ResumeVersionPicker`, `JobSelect`) |
| `hooks/` | `useListParams` (debounced search + paging), `useSelection` (bounded multi-select) |
| `lib/` | API client (`ApiError`, CSRF header, 401 handler), theme tokens and CSS variables, constants, formatting, notifications and `confirmAction` |
| `types/api.ts` | TypeScript mirror of the API contract |

### Design system

- **Tokens** live in `lib/theme.ts`: an indigo brand scale, a tuned dark palette, typography scale,
  radii, shadows and component defaults. `cssVariablesResolver` adds app tokens (`--app-bg`,
  `--app-surface`, `--app-border`, `--app-brand-soft`…) with separate light and dark values.
- **Consistency by construction**: lists render through `DataTable`, content through `SectionCard`,
  async states through `QueryBoundary`, destructive actions through `confirmAction`, and priorities
  and version sources through shared metadata in `lib/constants.ts`.
- **Server/client boundary**: primitives avoid Mantine dot-notation compounds where they may render
  in server components, and plain data (e.g. `PUBLIC_LINKS`) lives in non-client modules.

## Scaling notes

- The rate limiter is in-process; use Redis when running several API instances.
- Uploads are on local disk (`services/storage.py`); use object storage (S3/GCS) for multi-instance or
  ephemeral-disk hosting.
- AI calls run synchronously in the request (insights for several jobs run in a small thread pool). A
  task queue would be the next step for long-running batches.
