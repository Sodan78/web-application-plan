import type {
  ActiveCouple,
  CheckinStatus,
  CheckinView,
  Consent,
  ConsentPurpose,
  Id,
  PairRequestView,
  Profile,
  PromptKey,
  Reflection,
  Share,
  Weekday,
} from './types'

/** A rule in the database said no (SQLSTATE CU403). The message is safe to show. */
export class AccessError extends Error {}

/** Version of the consent text users agree to. Bump when the wording changes. */
export const CONSENT_VERSION = 2

/**
 * Calls one database function as `viewerId`. In the app the signed-in session decides who
 * the viewer is; in tests the transport switches user per call.
 */
export type Transport = (viewerId: Id, fn: string, args?: Record<string, unknown>) => Promise<unknown>

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * The only way the app reads or writes data. Each function maps to one database function in
 * supabase/migrations, where every privacy rule is enforced (SPEC P3, ADR 0007).
 */
export function createRepository(call: Transport) {
  const get = <T>(viewerId: Id, fn: string, args?: Record<string, unknown>) =>
    call(viewerId, fn, args) as Promise<T>
  const run = async (viewerId: Id, fn: string, args?: Record<string, unknown>) => {
    await call(viewerId, fn, args)
  }

  return {
    getMyProfile: (viewerId: Id) => get<Profile>(viewerId, 'get_my_profile'),

    // Consents (FR-2)
    getConsents: (viewerId: Id) => get<Consent[]>(viewerId, 'get_consents'),
    setConsent: (viewerId: Id, purpose: ConsentPurpose, given: boolean) =>
      run(viewerId, 'set_consent', { p_purpose: purpose, p_given: given, p_version: CONSENT_VERSION }),

    // Pairing (FR-3, FR-4)
    requestPair: (viewerId: Id, email: string) => run(viewerId, 'request_pair', { p_email: email }),
    listPairRequests: (viewerId: Id) => get<PairRequestView[]>(viewerId, 'list_pair_requests'),
    respondToPair: (viewerId: Id, requestId: Id, accept: boolean) =>
      run(viewerId, 'respond_to_pair', { p_request: requestId, p_accept: accept }),
    cancelPairRequest: (viewerId: Id, requestId: Id) =>
      run(viewerId, 'cancel_pair_request', { p_request: requestId }),

    // Couples (FR-25)
    getActiveCouple: (viewerId: Id) => get<ActiveCouple | null>(viewerId, 'get_active_couple'),
    endCouple: (viewerId: Id) => run(viewerId, 'end_couple'),
    hasUnseenEndNotice: (viewerId: Id) => get<boolean>(viewerId, 'has_unseen_end_notice'),
    dismissEndNotice: (viewerId: Id) => run(viewerId, 'dismiss_end_notice'),

    // Assessment (FR-5..7): answers and scores never come back.
    hasCompletedAssessment: (viewerId: Id) => get<boolean>(viewerId, 'has_completed_assessment'),
    saveAssessment: (viewerId: Id, answers: number[]) => run(viewerId, 'save_assessment', { p_answers: answers }),

    // Check-ins (FR-8..13)
    setCheckinWeekday: (viewerId: Id, weekday: Weekday) =>
      run(viewerId, 'set_checkin_weekday', { p_weekday: weekday }),
    getCheckinStatus: (viewerId: Id, tz = timeZone()) =>
      get<CheckinStatus | null>(viewerId, 'get_checkin_status', { p_tz: tz }),
    startCheckin: (viewerId: Id) => get<CheckinView>(viewerId, 'start_checkin'),
    getCheckin: (viewerId: Id, checkinId: Id) => get<CheckinView>(viewerId, 'get_checkin', { p_checkin: checkinId }),
    listCheckins: (viewerId: Id) => get<CheckinView[]>(viewerId, 'list_checkins'),

    saveReflection: (viewerId: Id, checkinId: Id, prompt: PromptKey, body: string) =>
      run(viewerId, 'save_reflection', { p_checkin: checkinId, p_prompt: prompt, p_body: body }),
    listMyReflections: (viewerId: Id, checkinId: Id) =>
      get<Reflection[]>(viewerId, 'list_my_reflections', { p_checkin: checkinId }),
    finishCheckin: (viewerId: Id, checkinId: Id, shares: { prompt: PromptKey; body: string }[]) =>
      run(viewerId, 'finish_checkin', { p_checkin: checkinId, p_shares: shares }),
    withdrawShare: (viewerId: Id, shareId: Id) => run(viewerId, 'withdraw_share', { p_share: shareId }),
    listShares: (viewerId: Id, checkinId: Id) => get<Share[]>(viewerId, 'list_shares', { p_checkin: checkinId }),
  }
}

export type Repository = ReturnType<typeof createRepository>
