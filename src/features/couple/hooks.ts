import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/session'
import { repo } from '@/lib/data'

/** The signed-in profile's id. Only use under RequireAuth. */
export function useViewerId(): string {
  const { session } = useSession()
  if (!session) throw new Error('useViewerId used without a signed-in user')
  return session.user.id
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

export function useEndNotice() {
  const viewerId = useViewerId()
  return useQuery({ queryKey: ['endNotice', viewerId], queryFn: () => repo.hasUnseenEndNotice(viewerId) })
}

/**
 * A repository write for the viewer. Any write can change what every query shows
 * (pairing cancels requests, ends notices, …), so refetch everything afterwards.
 */
export function useViewerMutation<TArgs, TData = unknown>(
  fn: (viewerId: string, args: TArgs) => Promise<TData>,
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

export function useAssessmentDone() {
  const viewerId = useViewerId()
  return useQuery({ queryKey: ['assessmentDone', viewerId], queryFn: () => repo.hasCompletedAssessment(viewerId) })
}

export function useCheckinStatus() {
  const viewerId = useViewerId()
  return useQuery({ queryKey: ['checkinStatus', viewerId], queryFn: () => repo.getCheckinStatus(viewerId) })
}

export function useCheckins() {
  const viewerId = useViewerId()
  return useQuery({ queryKey: ['checkins', viewerId], queryFn: () => repo.listCheckins(viewerId) })
}

export function useCheckin(checkinId: string) {
  const viewerId = useViewerId()
  return useQuery({
    queryKey: ['checkin', viewerId, checkinId],
    queryFn: () => repo.getCheckin(viewerId, checkinId),
    retry: false,
  })
}

export function useMyReflections(checkinId: string) {
  const viewerId = useViewerId()
  return useQuery({
    queryKey: ['reflections', viewerId, checkinId],
    queryFn: () => repo.listMyReflections(viewerId, checkinId),
  })
}

export function useShares(checkinId: string) {
  const viewerId = useViewerId()
  return useQuery({ queryKey: ['shares', viewerId, checkinId], queryFn: () => repo.listShares(viewerId, checkinId) })
}

export function usePrivateNotes(checkinId: string) {
  const viewerId = useViewerId()
  return useQuery({
    queryKey: ['privateNotes', viewerId, checkinId],
    queryFn: () => repo.listPrivateNotes(viewerId, checkinId),
  })
}
