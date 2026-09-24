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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useSession } from '@/features/auth/session'
import { CONSENT_ITEMS } from '@/features/consent/copy'
import { EndCoupleDialog } from '@/features/couple/EndCoupleDialog'
import { useConsents, useCouple, useViewerMutation } from '@/features/couple/hooks'
import { repo, type ConsentPurpose } from '@/lib/data'

export function Settings() {
  const { profile } = useSession()
  const consents = useConsents()
  const couple = useCouple()
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)
  const setConsent = useViewerMutation((viewerId, args: { purpose: ConsentPurpose; given: boolean }) =>
    repo.setConsent(viewerId, args.purpose, args.given),
  )

  const given = (purpose: ConsentPurpose) => consents.data?.some((c) => c.purpose === purpose) ?? false

  return (
    <>
      <h1 className="text-lg font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">Name: {profile?.displayName}</CardContent>
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

      {couple.data && (
        <Card>
          <CardHeader>
            <CardTitle>Your couple</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>
              Linked with {couple.data.partner.displayName} since{' '}
              {new Date(couple.data.since).toLocaleDateString()}.
            </p>
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
