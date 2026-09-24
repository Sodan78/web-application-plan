import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/session'
import { repo } from '@/lib/data'

/** The signed-in profile's id. Only use under RequireAuth. */
export function useViewerId(): string {
  const { profile } = useSession()
  if (!profile) throw new Error('useViewerId used without a signed-in profile')
  return profile.id
}

export function useConsents() {
  const viewerId = useViewerId()
  return useQuery({ queryKey: ['consents', viewerId], queryFn: () => repo.getConsents(viewerId) })
}

export function useHasConsent(purpose: 'store_reflections' | 'ai_insights' | 'therapist_access') {
  const consents = useConsents()
  return { ...consents, data: consents.data?.some((c) => c.purpose === purpose) }
}

export function useCouple() {
  const viewerId = useViewerId()
  return useQuery({ queryKey: ['couple', viewerId], queryFn: () => repo.getActiveCouple(viewerId) })
}

export function usePairRequests() {
  const viewerId = useViewerId()
  return useQuery({ queryKey: ['pairRequests', viewerId], queryFn: () => repo.listPairRequests(viewerId) })
}

export function usePairCandidates(enabled: boolean) {
  const viewerId = useViewerId()
  return useQuery({
    queryKey: ['pairCandidates', viewerId],
    queryFn: () => repo.listPairCandidates(viewerId),
    enabled,
  })
}

export function useEndNotice() {
  const viewerId = useViewerId()
  return useQuery({ queryKey: ['endNotice', viewerId], queryFn: () => repo.hasUnseenEndNotice(viewerId) })
}

/**
 * A repository write for the viewer. Any write can change what every query shows
 * (pairing cancels requests, ends notices, …), so refetch everything afterwards.
 */
export function useViewerMutation<TArgs>(
  fn: (viewerId: string, args: TArgs) => Promise<unknown>,
  options: { success?: (args: TArgs) => string | undefined } = {},
) {
  const viewerId = useViewerId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: TArgs) => fn(viewerId, args),
    onSuccess: async (_data, args) => {
      await queryClient.invalidateQueries()
      const message = options.success?.(args)
      if (message) toast.success(message)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Something went wrong'),
  })
}
