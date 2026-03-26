import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/api/client'

interface FeatureFlags {
  advanced_analytics: boolean
  custom_hooks: boolean
  team_seats: boolean
  api_access: boolean
  competitor_intel: boolean
  pdf_export: boolean
  ai_coaching: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  advanced_analytics: false,
  custom_hooks: false,
  team_seats: false,
  api_access: true,
  competitor_intel: false,
  pdf_export: true,
  ai_coaching: true,
}

export function useFeatureFlags(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['features', workspaceId],
    queryFn: () => apiGet<FeatureFlags>(`/api/v1/workspaces/${workspaceId}/features`),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: DEFAULT_FLAGS,
  })
}

export function useFeatureFlag(workspaceId: string | undefined, flag: keyof FeatureFlags): boolean {
  const { data } = useFeatureFlags(workspaceId)
  return data?.[flag] ?? DEFAULT_FLAGS[flag]
}
