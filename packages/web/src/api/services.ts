import { apiGet, apiPost, apiPut, apiDelete } from './client'
import { wsPath } from '@/lib/workspace'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PipelineStage {
  label: string
  count: number
  color: string
}

export interface FeedItem {
  id: string
  type: string
  title: string
  created_at: string
}

export interface Topic {
  id: string
  title: string
  description?: string
  category: string
  score: number
  scoring?: {
    total?: number
    virality?: number
    relevance?: number
    competition?: number
  }
  source?: string | Record<string, string>
  platform?: string
  pillars: string[]
  engagement?: string
  created_at: string
  status: 'new' | 'discovered' | 'scored' | 'developing' | 'hook' | 'scripted' | 'published' | 'analyzed' | 'passed'
}

export interface Angle {
  id: string
  badge: string
  badge_color: string
  badge_bg: string
  title: string
  description: string
  strength_level: 'high' | 'medium' | 'low'
  strength_percent: number
  strength_label: string
  status?: string
  topic_id?: string | null
}

export interface Hook {
  id: string
  text: string
  engagement_potential: number
  retention_risk: 'Low' | 'Medium' | 'High'
  pattern: string
  badge: string
  badge_color: string
}

export interface SwipeHook {
  id: string
  text: string
  success_rate: number
}

export interface ScriptSummary {
  id: string
  title: string
  created_at: string
  status: string
}

export interface ScriptSection {
  id: string
  label: string
  title: string
  description: string
  content: string
  word_count: number
  total_words: number
  accent_color: string
}

export interface Script {
  id: string
  title: string
  sections: ScriptSection[]
}

export interface TopPerformer {
  id: string
  title: string
  published_at: string
  views: string
  views_raw: number
  trend: 'up' | 'down'
  trend_label: string
  category_label: string
  category_color: string
  accent_color: string
}

export interface HookPatternData {
  label: string
  avg_view: number
  click_through: number
  color: string
}

export interface PipelineHealthStage {
  label: string
  count: number
  total: number
  percent: number
  pill_label: string
  color: string
}

export interface TacticalLogEntry {
  title: string
  subtitle: string
  views: string
  engagement: string
  feedback: string
  avatar: string
}

export interface AnalyticsData {
  top_performers: TopPerformer[]
  hook_pattern_data: HookPatternData[]
  pipeline_stages: PipelineHealthStage[]
  tactical_log: TacticalLogEntry[]
}

export interface Guardrail {
  id: string
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

export interface BrainInsight {
  num: string
  title: string
  desc: string
}

export interface BrainData {
  demographics: string
  pain_points: string
  desires: string
  guardrails: Guardrail[]
  insights: BrainInsight[]
  usage_mins: number
  usage_limit: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface Job {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: Record<string, unknown>
  created_at: string
}

export const getJob = (jobId: string) =>
  apiGet<Job>(wsPath(`/jobs/${jobId}`))

export const listJobs = () =>
  apiGet<Job[]>(wsPath('/jobs'))

export const triggerDiscover = (mode: string, keywords: string[]) =>
  apiPost<{ job_id: string; status: string }>(wsPath('/pipeline/discover'), { mode, keywords })

export const triggerAngle = (topic_ids: string[], format = 'longform') =>
  apiPost<{ job_id: string; status: string }>(wsPath('/pipeline/angle'), { topic_ids, format })

export const triggerScript = (angle_id: string, hook_ids: string[] = []) =>
  apiPost<{ job_id: string; status: string }>(wsPath('/pipeline/script'), { angle_id, hook_ids })

export const triggerAnalyze = () =>
  apiPost<{ job_id: string; status: string }>(wsPath('/pipeline/analyze'), {})

export const triggerRescore = () =>
  apiPost<{ job_id: string; status: string }>(wsPath('/pipeline/rescore'), {})

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboardStages = () =>
  apiGet<PipelineStage[]>(wsPath('/dashboard/stages'))

export const getDashboardFeed = () =>
  apiGet<FeedItem[]>(wsPath('/dashboard/feed'))

// ─── Topics ──────────────────────────────────────────────────────────────────

export const getTopics = () =>
  apiGet<Topic[]>(wsPath('/topics'))

export const createTopic = (data: { title: string; category: string }) =>
  apiPost<Topic>(wsPath('/topics'), {
    external_id: `manual-${Date.now()}`,
    title: data.title,
    category: data.category,
  })

export const deleteTopic = (id: string) =>
  apiDelete(wsPath(`/topics/${id}`))

export const updateTopic = (id: string, data: Partial<Topic>) =>
  apiPut<Topic>(wsPath(`/topics/${id}`), data)

export const generateTopics = (data: { niche?: string; platform?: string; keywords?: string[]; count?: number }) =>
  apiPost<Topic[]>(wsPath('/topics/generate'), data)

// ─── Angles ──────────────────────────────────────────────────────────────────

export const getAngles = (topicId?: string) =>
  apiGet<Angle[]>(
    wsPath(`/angles${topicId ? `?topic_id=${encodeURIComponent(topicId)}` : ''}`),
  )

export const saveAngle = (id: string, data: Partial<Angle>) =>
  apiPut<Angle>(wsPath(`/angles/${id}`), data)

export const generateAngles = (data: { common_belief: string; surprising_truth: string; topic?: string; format?: string }) =>
  apiPost<Angle[]>(wsPath('/angles/generate'), data)

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const getHooks = () =>
  apiGet<Hook[]>(wsPath('/hooks'))

export const getSwipeHooks = () =>
  apiGet<SwipeHook[]>(wsPath('/swipe-hooks'))

export const refineHook = (id: string) =>
  apiPost(wsPath(`/hooks/${id}/refine`), {})

export const addHookToScript = (hookId: string, scriptId: string) =>
  apiPost(wsPath(`/scripts/${scriptId}/hooks`), { hook_id: hookId })

// ─── Scripts ─────────────────────────────────────────────────────────────────

export const getScripts = () =>
  apiGet<ScriptSummary[]>(wsPath('/scripts'))

export const getScript = (id: string) =>
  apiGet<Script>(wsPath(`/scripts/${id}`))

export const updateSection = (id: string, section_id: string, content: string) =>
  apiPut<{ section_id: string; content: string }>(wsPath(`/scripts/${id}/sections/${section_id}`), { content })

export const rewriteScript = (id: string, section_id: string) =>
  apiPost<{ content: string }>(wsPath(`/scripts/${id}/rewrite`), { section_id })

export const toneCheck = (id: string) =>
  apiPost<{ result: string }>(wsPath(`/scripts/${id}/tone-check`), {})

export const exportScriptPdf = async (id: string) => {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const res = await fetch(`${API_BASE}${wsPath(`/scripts/${id}/export?format=pdf`)}`)
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `script-${id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export const getAnalytics = (range: string) =>
  apiGet<AnalyticsData>(wsPath(`/analytics?range=${encodeURIComponent(range)}`))

export const exportAnalytics = async () => {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const res = await fetch(`${API_BASE}${wsPath('/analytics/export')}`)
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'analytics-report.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Brain ───────────────────────────────────────────────────────────────────

export const getBrain = () =>
  apiGet<BrainData>(wsPath('/brain'))

export const syncBrain = () =>
  apiPost<{ status: string }>(wsPath('/brain/sync'), {})

export const exportBrainSchema = async () => {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const res = await fetch(`${API_BASE}${wsPath('/brain/export')}`)
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'brain-schema.json'
  a.click()
  URL.revokeObjectURL(url)
}

export const addGuardrail = (data: { title: string; description: string }) =>
  apiPost<Guardrail>(wsPath('/brain/guardrails'), data)

// ─── Settings ────────────────────────────────────────────────────────────────

export const saveSettings = (data: { workspace_name: string; default_niche: string }) =>
  apiPut(wsPath(''), data)

export const inviteTeamMember = (email: string) =>
  apiPost(wsPath('/invite'), { email })

export const configureApiKey = (name: string, key: string) =>
  apiPost('/api/v1/settings/api-keys', { name, key })

export const revokeApiKey = (keyId: string) =>
  apiDelete(`/api/v1/auth/api-key/${keyId}`)

export const listDocuments = () =>
  apiGet<{ id: string; name: string; size: number; created_at: string }[]>(wsPath('/documents'))

export const deleteDocument = (id: string) =>
  apiDelete(wsPath(`/documents/${id}`))

export const uploadDocument = async (file: File) => {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}${wsPath('/documents')}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export const sendChatMessage = (content: string) =>
  apiPost<ChatMessage>(wsPath('/chat/message'), { content })

export const askStrategy = (context?: string) =>
  apiPost<ChatMessage>(wsPath('/chat/strategy'), { context: context ?? '' })

// ─── Recon ───────────────────────────────────────────────────────────────────

export const triggerScrape = (competitor_handles: string[], platform = 'youtube') =>
  apiPost<{ job_id: string; status: string }>(wsPath('/recon/scrape'), { competitor_handles, platform, max_items: 20 })

export const triggerRipper = (video_urls: string[], synthesis_mode = 'detailed') =>
  apiPost<{ job_id: string; status: string }>(wsPath('/recon/ripper'), { video_urls, synthesis_mode })

export const getReconReports = () =>
  apiGet<{ id: string; config: Record<string, unknown>; created_at: string; status: string; synthesis?: Record<string, unknown> }[]>(wsPath('/recon/reports'))

export const getReconReport = (id: string) =>
  apiGet<{ id: string; config: Record<string, unknown>; created_at: string; status: string; skeletons?: unknown[]; synthesis?: Record<string, unknown> }>(wsPath(`/recon/reports/${id}`))
