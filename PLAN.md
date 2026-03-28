# Influence Pirates — Full Implementation Plan
> Generated: 2026-03-28 | Target: Fully functional MVP

---

## Current State Summary

| Layer | Done | Gap |
|-------|------|-----|
| UI Design | 100% | — |
| Frontend pages + queries | 95% | — |
| Frontend mutations | 90% | Job polling UI missing |
| API routes | 85% | Recon, webhooks stubbed |
| Worker job handlers | 0% | **Files don't exist yet** |
| Pipeline→Supabase bridge | 0% | BrainLoader/Storage not implemented |
| PDF export | 20% | Returns plain text, not PDF |
| Script section CRUD | 0% | No section-level endpoint |
| File upload (Settings) | 0% | No storage integration |
| API key masking (UI) | 0% | Shows raw key after creation |
| Monetization / Stripe | 0% | No gating logic |

**Critical blocker:** The worker imports `app.jobs.discover`, `app.jobs.angle`,
`app.jobs.script`, `app.jobs.analyze`, `app.jobs.rescore` — **none of these files
exist**. The entire async pipeline (Discover → Angle → Script → Analyze → Rescore)
cannot run at all until Phase 1 is done.

---

## PHASE 1 — Worker Job Handlers (Critical)
> The pipeline must actually execute. Nothing works without this.

### 1.1 Create `packages/worker/worker/jobs/` package

**Files to create:**

#### `packages/worker/worker/jobs/__init__.py`
Empty init.

#### `packages/worker/worker/jobs/brain_loader.py`
Supabase implementation of the `BrainLoader` protocol from `mcl_pipeline/config.py`.
- `load(workspace_id)` → query `brain` table → deserialize to `AgentBrain`
- `save(workspace_id, brain)` → upsert brain JSONB back to Supabase
- Cache brain in Redis with 5-min TTL (key: `brain:{workspace_id}`)

#### `packages/worker/worker/jobs/discover.py`
ARQ task: `run_discovery(ctx, workspace_id, job_id, mode, keywords)`
1. Update job status → `running`
2. Load brain from Supabase via `BrainLoader`
3. Based on `mode`:
   - `keywords`: call `YouTubeDiscoverChannel.discover_topics(brain, keywords)`
   - `competitors`: iterate `brain.competitors`, call `YouTubeDiscoverChannel.scrape_competitor()`
   - `both`: run both
4. Score each topic via `score_topic()` from `mcl_pipeline.scoring.engine`
5. Bulk-insert new topics into `topics` table (upsert on `external_id` to avoid duplicates)
6. Update job → `completed`, store `result_count` in job metadata
7. On error → update job → `failed`, store error message

#### `packages/worker/worker/jobs/angle.py`
ARQ task: `run_angle_generation(ctx, workspace_id, job_id, topic_ids, format)`
1. Update job → `running`
2. Load brain from Supabase
3. For each `topic_id`:
   - Fetch topic from `topics` table
   - Build `AgentBrain` and `Topic` pydantic models
   - Call `get_angle_system_prompt(brain, topic)` from `mcl_pipeline.prompts.angle`
   - Send to LLM (Azure OpenAI via `llm.chat()`)
   - Parse JSON response → create up to 4 `Angle` objects
   - Insert into `angles` table
4. Update job → `completed`

**LLM call format for angles:**
```
system: get_angle_system_prompt(brain, topic)
user: "Generate 4 angles for this topic using the Contrast Formula. Return JSON array."
```
Parse response as JSON array of angle objects.

#### `packages/worker/worker/jobs/script.py`
ARQ task: `run_script_generation(ctx, workspace_id, job_id, angle_id, hook_ids)`
1. Update job → `running`
2. Load brain, fetch angle + hooks from Supabase
3. Call `get_script_system_prompt(brain, angle, hooks)` from `mcl_pipeline.prompts.script`
4. LLM call → get full script JSON
5. Parse script into `script_structure` (JSONB), `filming_cards` (array), etc.
6. Insert into `scripts` table with `status=draft`
7. Update job → `completed`

#### `packages/worker/worker/jobs/analyze.py`
ARQ task: `run_analytics(ctx, workspace_id, job_id, content_ids)`
1. Update job → `running`
2. Load brain + analytics entries from Supabase
3. Call `get_analyze_system_prompt(brain, entries)` from `mcl_pipeline.prompts.analyze`
4. LLM call → get insights JSON
5. Store insights in `brain.insights` JSONB and update brain record
6. Call `get_update_brain_system_prompt(brain, insight)` → evolve learning weights
7. Update brain record with new weights
8. Update job → `completed`

#### `packages/worker/worker/jobs/rescore.py`
ARQ task: `run_rescore(ctx, workspace_id, job_id)`
1. Update job → `running`
2. Load brain from Supabase
3. Fetch all topics with `status != 'passed'`
4. Re-score each using `score_topic(title, description, brain)`
5. Batch-update `scoring` JSONB column in `topics` table
6. Update job → `completed`

### 1.2 Fix worker import paths

The worker's `main.py` imports from `app.jobs.*` but the package is `worker.jobs.*`.
Either:
- Change imports in `worker/main.py` to `from worker.jobs.discover import run_discovery`, etc.
- OR create `packages/worker/app/` as an alias package

**Decision: change imports in `worker/main.py` to use `worker.jobs.*`**

---

## PHASE 2 — Pipeline→Supabase Storage Bridge
> Pipeline channels need to read/write Supabase, not local files.

### 2.1 `packages/worker/worker/jobs/supabase_storage.py`
Implement `StorageBackend` protocol for Supabase:
- `save_topics(workspace_id, topics)` → upsert `topics` table
- `load_topics(workspace_id, **filters)` → query with filter params
- `save_angles(workspace_id, angles)` → upsert `angles` table
- `save_hooks(workspace_id, hooks)` → upsert `hooks` table
- `save_analytics(workspace_id, entries)` → upsert `analytics` table

### 2.2 `packages/worker/worker/jobs/redis_cache.py`
Implement `CacheBackend` protocol for Redis:
- `get(key)` → `redis.get(key)`
- `set(key, value, ttl)` → `redis.set(key, value, ex=ttl)`
- `exists(key)` → `redis.exists(key)`
- Used for transcript caching from `recon/skeleton_ripper/cache.py`

### 2.3 Wire PipelineConfig in each job
Each job constructs:
```python
config = PipelineConfig(
    data_dir=Path("/tmp/mcl"),
    brain_loader=SupabaseBrainLoader(ctx["supabase"], workspace_id),
    cache_backend=RedisCache(ctx["redis"]),
    storage=SupabaseStorage(ctx["supabase"], workspace_id),
)
```

---

## PHASE 3 — PDF Export (Real PDF)
> Scripts export must produce actual PDFs, not plain text.

### 3.1 `packages/pipeline/mcl_pipeline/pdf/generator.py`
Use `reportlab` (already listed as a dependency) to generate script PDFs:
- Title page with creator name + platform
- Beat sheet sections with proper formatting
- Filming cards in a grid layout
- Hooks highlighted in boxes
- Page numbers + footer with workspace branding

### 3.2 Update `packages/api/app/routes/scripts.py`
- Import `generate_script_pdf` from `mcl_pipeline.pdf.generator`
- In `/scripts/{id}/export`: call generator → return `StreamingResponse` with `application/pdf`
- Content-Disposition: `attachment; filename="script-{title}.pdf"`

---

## PHASE 4 — Frontend: Job Status Polling
> Users need feedback when background pipeline jobs run.

### 4.1 Add `useJobPoller` hook — `packages/web/src/hooks/useJobPoller.ts`
```typescript
// Polls GET /api/v1/workspaces/{wsId}/jobs/{jobId} every 2s
// Stops when status === 'completed' | 'failed'
// Returns { status, resultCount, error }
```

### 4.2 Update pipeline trigger buttons in Dashboard
When user clicks "Run Discovery" / "Generate Angles" / etc.:
1. Call `POST /pipeline/discover` → get `job_id`
2. Show progress indicator (spinner + "Discovering topics…")
3. Poll via `useJobPoller(job_id)` until done
4. On complete → invalidate React Query cache for topics/angles/etc.
5. On error → show toast error

### 4.3 Add `services.ts` functions for jobs
```typescript
export const getJob = (wsId, jobId) => apiGet(`/api/v1/workspaces/${wsId}/jobs/${jobId}`)
export const listJobs = (wsId) => apiGet(`/api/v1/workspaces/${wsId}/jobs`)
```

---

## PHASE 5 — Script Section Endpoints
> Scripts need section-level editing support.

### 5.1 Add to `packages/api/app/routes/scripts.py`

```
POST   /scripts/{id}/sections       → add section to script_structure
PUT    /scripts/{id}/sections/{sid} → update a section's content
DELETE /scripts/{id}/sections/{sid} → remove a section
```

`script_structure` is already a JSONB column — sections are stored as a dict of
`{ section_id: { title, content, type, order } }`.

### 5.2 Update `packages/web/src/pages/Scripts.tsx`
Wire section edit → call `PUT /scripts/{id}/sections/{sid}` on blur/save.

---

## PHASE 6 — Settings: File Upload & API Key Masking

### 6.1 File Upload — `packages/api/app/routes/settings.py` (new file)
```
POST /api/v1/workspaces/{wsId}/documents
  → Accept multipart/form-data
  → Upload to Supabase Storage bucket: `workspace-documents`
  → Store metadata in `documents` table (filename, size, url, workspace_id)

GET /api/v1/workspaces/{wsId}/documents
  → List uploaded documents

DELETE /api/v1/workspaces/{wsId}/documents/{docId}
  → Remove from storage + table
```

### 6.2 Update frontend Settings upload handler
Replace stub `uploadDocument(file)` with:
```typescript
const formData = new FormData()
formData.append('file', file)
await fetch(`${wsPath}/documents`, { method: 'POST', body: formData, headers: authHeaders })
```

### 6.3 API Key Masking in UI
In `packages/web/src/pages/Settings.tsx`:
- After `configureApiKey()` returns, store only the prefix (`key.slice(0,12) + '••••••••'`)
- Never store or display the full key after creation
- Show the masked prefix in the API keys list
- Add "Revoke" button → call `DELETE /api/v1/auth/api-key/{keyId}`

---

## PHASE 7 — Auth & Workspace Hardening

### 7.1 Workspace creation on signup
In `packages/api/app/routes/auth.py` → `POST /signup`:
After Supabase creates the user, auto-create a workspace:
```python
workspace = supabase.table("workspaces").insert({
    "name": f"{req.full_name}'s Workspace",
    "owner_id": user_id,
    "plan": "free",
}).execute()
supabase.table("workspace_members").insert({
    "workspace_id": workspace.data[0]["id"],
    "user_id": user_id,
    "role": "owner",
}).execute()
```

### 7.2 Onboarding → Brain initialization
In `packages/api/app/routes/brain.py` → `POST /brain/sync`:
If brain doesn't exist yet, create default brain record from onboarding data.

### 7.3 Login page redirect
In `packages/web/src/pages/Login.tsx`:
After successful login, check `hasWorkspace`:
- `true` → redirect to `/dashboard`
- `false` → redirect to `/onboarding`

---

## PHASE 8 — Error Handling & Loading States

### 8.1 API error boundaries
In `packages/web/src/App.tsx`:
- Wrap routes in `<ErrorBoundary>` component
- Show friendly error page with retry button

### 8.2 Loading skeleton screens
Add `<Skeleton>` placeholders for:
- Dashboard pipeline funnel (3 stat cards)
- Topics kanban board columns
- Angles cards

### 8.3 Toast notifications
Already have `sonner` installed. Add toasts for:
- All mutations on success/error
- Job completion notifications

### 8.4 Backend structured errors
In all route handlers, replace bare `raise HTTPException` with consistent:
```python
raise HTTPException(status_code=422, detail={"code": "VALIDATION_ERROR", "message": "..."})
```

---

## PHASE 9 — Recon Routes (Scraper Integration)

### 9.1 `packages/api/app/routes/recon.py`
Currently stubbed. Implement:
```
POST /recon/competitors   → trigger competitor scrape (enqueue ARQ job)
GET  /recon/skeletons     → list cached video metadata (from recon_skeletons table)
GET  /recon/skeletons/{id} → get single skeleton with transcript
```

### 9.2 Add `run_recon` job to worker
New ARQ task that:
1. Calls `YouTubeDiscoverChannel.scrape_competitor()` for each competitor in brain
2. Stores results in `recon_skeletons` table
3. Used as input to discovery scoring

---

## PHASE 10 — Launch Readiness

### 10.1 Environment / Config audit
- Verify all `.env` vars are documented in `.env.example`
- Confirm Supabase RLS policies cover all table access patterns
- Add `VITE_DEV_SKIP_AUTH=false` for production build

### 10.2 Health checks
`GET /health` → return:
```json
{
  "status": "ok",
  "supabase": "connected",
  "redis": "connected",
  "llm": "reachable"
}
```

### 10.3 Rate limiting
Add rate limiting middleware to expensive endpoints:
- `POST /topics/generate` → max 10/min/workspace
- `POST /angles/generate` → max 20/min/workspace
- `POST /chat/message` → max 30/min/workspace

### 10.4 Stripe Integration (Optional for MVP)
- Webhook handler for `checkout.session.completed`
- Update workspace `plan` field on payment
- Gate `POST /topics/generate` (AI features) behind `plan != 'free'`

---

## Implementation Order & Priority

```
Week 1 (Critical Path):
  Phase 1 → Worker job handlers           [UNBLOCKS ENTIRE PIPELINE]
  Phase 2 → Supabase storage bridge       [NEEDED BY PHASE 1]

Week 2 (Core Features):
  Phase 3 → Real PDF export
  Phase 4 → Job status polling UI
  Phase 5 → Script section endpoints

Week 3 (Polish):
  Phase 6 → File upload + API key masking
  Phase 7 → Auth hardening
  Phase 8 → Error handling + loading states

Week 4 (Launch Prep):
  Phase 9 → Recon routes
  Phase 10 → Health checks, rate limiting, env audit
```

---

## Files to Create (New)

```
packages/worker/worker/jobs/__init__.py
packages/worker/worker/jobs/brain_loader.py
packages/worker/worker/jobs/redis_cache.py
packages/worker/worker/jobs/supabase_storage.py
packages/worker/worker/jobs/discover.py
packages/worker/worker/jobs/angle.py
packages/worker/worker/jobs/script.py
packages/worker/worker/jobs/analyze.py
packages/worker/worker/jobs/rescore.py
packages/pipeline/mcl_pipeline/pdf/generator.py
packages/api/app/routes/settings.py
packages/web/src/hooks/useJobPoller.ts
```

## Files to Modify (Existing)

```
packages/worker/worker/main.py                 → fix import paths
packages/api/app/routes/scripts.py             → real PDF, section endpoints
packages/api/app/routes/auth.py                → auto-create workspace on signup
packages/api/app/routes/brain.py               → brain init on sync
packages/api/app/routes/recon.py               → implement scraper trigger
packages/api/app/main.py                       → register settings router
packages/web/src/pages/Dashboard.tsx           → job polling UI
packages/web/src/pages/Scripts.tsx             → section editing
packages/web/src/pages/Settings.tsx            → file upload + key masking
packages/web/src/pages/Login.tsx               → post-login redirect logic
packages/web/src/api/services.ts               → add job polling functions
```
