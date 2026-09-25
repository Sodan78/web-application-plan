import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ButtonLink } from '@/components/ButtonLink'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useSession } from '@/features/auth/session'
import { LOCALE, WEEKDAYS } from '@/features/checkin/copy'
import { CONSENT_ITEMS } from '@/features/consent/copy'
import { EndCoupleDialog } from '@/features/couple/EndCoupleDialog'
import { useAssessmentDone, useCheckinStatus, useConsents, useCouple, useViewerMutation } from '@/features/couple/hooks'
import { repo, type ConsentPurpose, type Weekday } from '@/lib/data'

export function Settings() {
  const { profile } = useSession()
  const consents = useConsents()
  const couple = useCouple()
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)
  const assessmentDone = useAssessmentDone()
  const status = useCheckinStatus()
  const [weekdaySaved, setWeekdaySaved] = useState(false)
  const setWeekday = useViewerMutation((viewerId, weekday: Weekday) => repo.setCheckinWeekday(viewerId, weekday))
  const setConsent = useViewerMutation((viewerId, args: { purpose: ConsentPurpose; given: boolean }) =>
    repo.setConsent(viewerId, args.purpose, args.given),
  )

  const given = (purpose: ConsentPurpose) => consents.data?.some((c) => c.purpose === purpose) ?? false

  return (
    <>
      <h1 className="text-3xl">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p>Name: {profile?.displayName}</p>
          <p className="text-muted-foreground">Email: {profile?.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy choices</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          {CONSENT_ITEMS.map((item) => (
            <div key={item.purpose} className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <label id={`setting-${item.purpose}-label`} htmlFor={`setting-${item.purpose}`} className="font-medium">
                  {item.title}
                </label>
                <p id={`setting-${item.purpose}-desc`} className="text-sm text-muted-foreground">
                  {item.description}
                  {!item.available && <em> Not available yet.</em>}
                </p>
              </div>
              <Switch
                id={`setting-${item.purpose}`}
                aria-labelledby={`setting-${item.purpose}-label`}
                aria-describedby={`setting-${item.purpose}-desc`}
                checked={given(item.purpose)}
                disabled={setConsent.isPending}
                onCheckedChange={(checked) => {
                  if (!checked && item.purpose === 'store_reflections') setConfirmingWithdraw(true)
                  else setConsent.mutate({ purpose: item.purpose, given: checked })
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {assessmentDone.data && (
        <Card>
          <CardHeader>
            <CardTitle>Questionnaire</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p className="text-muted-foreground">You can answer it again at any time. You won't see a result either way.</p>
            <div>
              <ButtonLink variant="outline" to="/assessment">
                Retake questionnaire
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      )}

      {couple.data && (
        <Card>
          <CardHeader>
            <CardTitle>Your couple</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>
              Linked with {couple.data.partner.displayName} since{' '}
              {new Date(couple.data.since).toLocaleDateString(LOCALE)}.
            </p>
            <div className="grid gap-2">
              <label htmlFor="checkin-weekday" className="font-medium">
                Weekly check-in day
              </label>
              <div className="flex items-center gap-3">
                <select
                  id="checkin-weekday"
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={status.data?.weekday ?? 0}
                  onChange={(e) =>
                    setWeekday.mutate(Number(e.target.value) as Weekday, { onSuccess: () => setWeekdaySaved(true) })
                  }
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  {weekdaySaved ? 'Saved' : ''}
                </span>
              </div>
            </div>
            <div>
              <EndCoupleDialog partnerName={couple.data.partner.displayName} />
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmingWithdraw} onOpenChange={setConfirmingWithdraw}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn this off?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't be able to write check-ins until you turn it back on. What you've already written is kept
              until you delete it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep on</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmingWithdraw(false)
                setConsent.mutate({ purpose: 'store_reflections', given: false })
              }}
            >
              Turn off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
