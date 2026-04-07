import { useState, useEffect, useRef, useCallback } from 'react'
import { wsPath } from '@/lib/workspace'
import { api } from '@/api/client'

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface JobState {
  jobId: string | null
  status: JobStatus | null
  result: Record<string, unknown> | null
  error: string | null
  isActive: boolean
}

const POLL_INTERVAL = 2000 // 2 seconds

/**
 * Polls GET /jobs/{jobId} every 2 seconds until the job completes or fails.
 * Returns current job state and a start function to kick off a new job.
 */
export function useJobPoller() {
  const [state, setState] = useState<JobState>({
    jobId: null,
    status: null,
    result: null,
    error: null,
    isActive: false,
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startPolling = useCallback((jobId: string) => {
    stopPolling()
    setState({ jobId, status: 'pending', result: null, error: null, isActive: true })

    intervalRef.current = setInterval(async () => {
      try {
        const job = await api<{ id: string; status: string; result: Record<string, unknown> }>(
          wsPath(`/jobs/${jobId}`)
        )
        const status = job.status as JobStatus

        setState(prev => ({ ...prev, status, result: job.result ?? null }))

        if (status === 'completed' || status === 'failed') {
          stopPolling()
          setState(prev => ({
            ...prev,
            status,
            isActive: false,
            error: status === 'failed' ? String(job.result?.error ?? 'Job failed') : null,
          }))
        }
      } catch {
        stopPolling()
        setState(prev => ({
          ...prev,
          status: 'failed',
          isActive: false,
          error: 'Failed to fetch job status',
        }))
      }
    }, POLL_INTERVAL)
  }, [stopPolling])

  const reset = useCallback(() => {
    stopPolling()
    setState({ jobId: null, status: null, result: null, error: null, isActive: false })
  }, [stopPolling])

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling])

  return { ...state, startPolling, reset }
}
