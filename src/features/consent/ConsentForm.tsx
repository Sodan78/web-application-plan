import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { ConsentPurpose } from '@/lib/data'
import { CONSENT_ITEMS } from './copy'

type Props = {
  submitting?: boolean
  onSubmit: (choices: Record<ConsentPurpose, boolean>) => void
}

export function ConsentForm({ submitting = false, onSubmit }: Props) {
  const [choices, setChoices] = useState<Record<ConsentPurpose, boolean>>({
    store_reflections: false,
    ai_insights: false,
    therapist_access: false,
  })

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(choices)
      }}
    >
      {CONSENT_ITEMS.map((item) => (
        <div key={item.purpose} className="flex gap-3">
          <Checkbox
            id={`consent-${item.purpose}`}
            checked={choices[item.purpose]}
            onCheckedChange={(checked) => setChoices((c) => ({ ...c, [item.purpose]: checked === true }))}
            // Base UI puts `id` on a hidden input, so name the visible control explicitly.
            aria-labelledby={`consent-${item.purpose}-label`}
            aria-describedby={`consent-${item.purpose}-desc`}
            className="mt-0.5"
          />
          <div className="grid gap-1">
            <label id={`consent-${item.purpose}-label`} htmlFor={`consent-${item.purpose}`} className="font-medium leading-none">
              {item.title} <span className="font-normal text-muted-foreground">({item.note})</span>
            </label>
            <p id={`consent-${item.purpose}-desc`} className="text-sm text-muted-foreground">
              {item.description}
              {!item.available && <em> Not available yet.</em>}
            </p>
          </div>
        </div>
      ))}
      <Button type="submit" disabled={!choices.store_reflections || submitting}>
        Continue
      </Button>
    </form>
  )
}
