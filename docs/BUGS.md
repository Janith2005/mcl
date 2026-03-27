# MCL / Influence Pirates — Frontend Bug Report

> Generated: 2026-03-27
> Status: Pre-MVP. UI is complete but almost all interactivity is stubbed out with mock data and missing onClick handlers.

---

## Summary

| Category | Count |
|---|---|
| Buttons with no onClick handler | 37+ |
| Pages using hardcoded mock data (no API calls) | 7 / 7 |
| Fake implementations (UI-only, no real logic) | 1 |
| Missing pages | 1 (Support) |
| Missing routes | 1 (/support) |

---

## Page-by-Page Issues

---

### 1. Dashboard (`pages/Dashboard.tsx`)

**Mock data — no API calls**
- Lines 17–23: `PIPELINE_STAGES` and `FEED_ITEMS` are hardcoded static arrays
- Comment on line 13: `/* Static data — replace with API calls */`

**Non-functional buttons**
- Lines 375–388: Four Quick Action buttons ("Discover Topics", "Generate Hook", "Draft Script", "View Analytics") have no `onClick` handlers

**Fix:**
- Replace static arrays with `useQuery` hooks calling `/api/pipeline/stages` and `/api/feed`
- Add `useNavigate` calls on Quick Action buttons to route to the correct pages

---

### 2. Hooks (`pages/Hooks.tsx`)

**Mock data — no API calls**
- Lines 25–62: `mockHooks` and `swipeLibrary` are static arrays

**Non-functional buttons**
- Line 159: MoreVertical (kebab menu) on hook cards — no onClick
- Lines 234–243: "Add to Script" button — no onClick
- Lines 245–256: "Refine AI" button — no onClick
- Lines 314–322: "Explore All Swipes" button — no onClick
- Lines 336–346: "Upgrade Now" upsell banner button — no onClick

**Fix:**
- Fetch hooks from `/api/hooks`
- "Add to Script": POST to `/api/scripts/{id}/hooks`
- "Refine AI": POST to `/api/hooks/{id}/refine`
- "Explore All Swipes": navigate to swipes library route

---

### 3. Scripts (`pages/Scripts.tsx`)

**Mock data — no API calls**
- Lines 29–102: `beatSections`, `scriptContent`, `scriptCapabilities` are all static

**Non-functional buttons**
- Line 170: "PDF Export" — no onClick
- Line 182: "Version History" — no onClick
- Line 194: "Share" — no onClick
- Lines 305–314: Text editor toolbar (Bold, Italic, Link, List, Caption) — no onClick on any button
- Lines 419–429: "AI Rewrite" floating button — no onClick
- Lines 430–442: "Tone Check" floating button — no onClick

**Fix:**
- Fetch script from `/api/scripts/{id}`
- "PDF Export": GET `/api/scripts/{id}/export?format=pdf`
- "AI Rewrite": POST to `/api/scripts/{id}/rewrite`
- "Tone Check": POST to `/api/scripts/{id}/tone-check`
- "Version History": GET `/api/scripts/{id}/versions`
- Text editor: wire up to a rich-text library (e.g. TipTap or Quill)

---

### 4. Analytics (`pages/Analytics.tsx`)

**Mock data — no API calls**
- Lines 28–99: `topPerformers`, `hookPatternData`, `pipelineStages`, `tacticalLog` are all static

**Non-functional buttons**
- Lines 161–175: Time range selector changes local state but never refetches data
- Lines 178–187: "Export Report" button — no onClick
- Lines 407–413: "View Full Archive" link — no onClick

**Fix:**
- Fetch analytics from `/api/analytics?range={timeRange}` — trigger refetch when time range changes
- "Export Report": GET `/api/analytics/export`

---

### 5. Brain (`pages/Brain.tsx`)

**Mock data — no API calls**
- Lines 247–284: "Recently Learned Insights" are static hardcoded entries

**Fake implementation**
- Lines 49–60: "Initiate Deep Sync" button only fakes a loading spinner:
  ```js
  setTimeout(() => setSyncing(false), 2000)
  ```
  No API call is made. Nothing actually syncs.

**Non-functional buttons**
- Line 69: "Export Schema" — no onClick
- Lines 207–217: "Add New Guardrail" — no onClick

**Fix:**
- "Deep Sync": POST to `/api/brain/sync`, await real response
- "Export Schema": GET `/api/brain/export`
- "Add Guardrail": POST to `/api/brain/guardrails`
- Fetch insights from `/api/brain/insights`

---

### 6. Settings (`pages/Settings.tsx`)

**Mock data — no API calls**
- Lines 27–49: `crewMembers`, `platforms`, `apiKeys` are all static hardcoded

**Non-functional buttons / forms**
- Lines 325–336: File upload drag-and-drop area — no `onChange`, `onDrop`, or `onClick` handler. Upload is completely broken.
- Lines 340–353: Uploaded files list shows two fake hardcoded files (Manifesto_2024.pdf, TikTok_Style.md)
- Lines 265–274: "INVITE" button on Crew Members — no onClick
- Line 134: "Invite Team" button at top — no onClick
- Lines 370–410: "Configure" buttons on API Keys — no onClick
- Lines 488–508: "Discard Changes" button — no onClick
- Lines 499–508: "Save Laboratory Config" button — no onClick (settings are never persisted)

**Fix:**
- File upload: add `<input type="file">` with handler that POSTs to `/api/settings/documents`
- "Save": PUT to `/api/settings`
- "Invite": POST to `/api/team/invite`
- "Configure" API key: open modal then POST to `/api/settings/api-keys`

---

### 7. Topics (`pages/Topics.tsx`)

**Mock data — no API calls**
- Lines 21–60: `MOCK_TOPICS` is a static array

**Non-functional buttons**
- Lines 262–271: "+" (add topic) in Discovered column — no onClick
- Lines 273–275: More options (⋮) in Discovered column — no onClick
- Lines 303–305: More options (⋮) in Scored column — no onClick

**Fix:**
- Fetch topics from `/api/topics`
- "+": POST to `/api/topics`
- Kebab menu: DELETE or PATCH `/api/topics/{id}`

---

### 8. Angles (`pages/Angles.tsx`)

**Mock data — no API calls**
- Lines 19–44: `MOCK_ANGLES` is a static array

**Non-functional buttons / tabs**
- Lines 99–102: "Save Topic" button — no onClick
- Lines 304–310: "Edit Draft" links — no navigation
- Lines 317–333: "Drafts" tab — shows placeholder text, not implemented
- Lines 335–351: "Published" tab — shows placeholder text, not implemented

**Fix:**
- Fetch angles from `/api/angles`
- "Save Topic": PATCH `/api/angles/{id}`
- "Edit Draft": `navigate(/scripts/{id})`
- Drafts/Published tabs: filter by `status` field from API

---

### 9. Chat / Chatbot

**Issue:** After typing a message and clicking Send, nothing happens. No request is sent to the backend.

**Fix:**
- Wire Send button onClick to POST `/api/chat/message` with the input text
- Display streamed or returned response in the chat window
- "Ask Strategy" button: POST to `/api/chat/strategy`

---

### 10. Sidebar & Navigation (`components/layout/Sidebar.tsx`)

**Missing page / broken route**
- Line 28: Sidebar links to `/support` but no `Support.tsx` page exists and no route is defined in `App.tsx`
- Clicking Support takes user back to Dashboard (catch-all redirect)

**Non-functional button**
- Lines 89–98: "New Content" CTA button in sidebar — no onClick handler

**Fix:**
- Create `pages/Support.tsx` with support info / links
- Add route in `App.tsx`: `<Route path="/support" element={<Support />} />`
- "New Content": open a modal or navigate to `/topics/new`

---

### 11. Channels / Integrations Page

**Issue:** Clicking "Connect" on YouTube and other platform integrations does nothing.

**Fix:**
- OAuth flow: GET `/api/integrations/{platform}/connect` → redirect to platform OAuth → handle callback at `/api/integrations/{platform}/callback`

---

### 12. API Keys visible on Dashboard

**Issue:** Real API keys are being displayed in plain text on the dashboard.

**Fix:**
- Mask keys: show only last 4 characters (e.g. `••••••••a1b2`)
- Never return full keys from the API after initial creation

---

## Root Cause

The frontend is a complete, polished UI shell built in Phase 1. The actual API integration (Phase 2+) has not been implemented yet. Every page uses local mock data arrays instead of fetching from the FastAPI backend, and button `onClick` handlers are either missing entirely or are placeholder no-ops.

---

## How to Fix — Priority Order

| Priority | Fix |
|---|---|
| 1 | Create a shared API service layer (`src/api/services/`) with typed functions for each resource |
| 2 | Replace all mock data arrays with `useQuery` (TanStack Query) calls to the real API |
| 3 | Wire all mutating buttons (save, invite, create, delete) to `useMutation` calls |
| 4 | Implement file upload handler in Settings |
| 5 | Fix chatbot Send button to POST to `/api/chat/message` |
| 6 | Create Support page and fix sidebar route |
| 7 | Mask API keys on display |
| 8 | Add real OAuth flow for channel integrations |
| 9 | Fix Brain "Deep Sync" to make a real API call |
| 10 | Implement text editor toolbar in Scripts |
