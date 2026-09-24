import { Navigate, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConsentForm } from '@/features/consent/ConsentForm'
import { useHasConsent, useViewerMutation } from '@/features/couple/hooks'
import { repo, type ConsentPurpose } from '@/lib/data'

export function Consent() {
  const navigate = useNavigate()
  const { data: hasConsent, isPending } = useHasConsent('store_reflections')
  const save = useViewerMutation(async (viewerId, choices: Record<ConsentPurpose, boolean>) => {
    for (const [purpose, given] of Object.entries(choices) as [ConsentPurpose, boolean][]) {
      await repo.setConsent(viewerId, purpose, given)
    }
  })

  if (isPending) return null
  if (hasConsent && !save.isPending) return <Navigate to="/" replace />

  return (
    <Card>
      <CardHeader>
        <CardTitle>Before you start</CardTitle>
        <CardDescription>
          Your reflections are private. Your partner only sees what you choose to share, and you can take a
          share back at any time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ConsentForm
          submitting={save.isPending}
          onSubmit={(choices) => save.mutate(choices, { onSuccess: () => navigate('/', { replace: true }) })}
        />
      </CardContent>
    </Card>
  )
}
