import { useQuery } from '@tanstack/react-query'
import { featuresApi } from '@/lib/endpoints'

/**
 * The caller's resolved feature flags (GET /my-features/), used to show/hide
 * gated UI. `isOff(key)` is true ONLY when the feature is explicitly disabled —
 * while loading (or against an older backend) nothing is hidden, and the
 * server's 402s remain the real enforcement.
 */
export function useMyFeatures() {
  const query = useQuery({
    queryKey: ['my-features'],
    queryFn: featuresApi.mine,
    staleTime: 60_000,
    retry: false,
  })

  const features = query.data?.features
  const isOff = (key: string) => features?.[key]?.enabled === false

  return { features, isOff, isLoading: query.isLoading }
}
