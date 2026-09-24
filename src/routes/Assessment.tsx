import { useState } from 'react'
import { ButtonLink } from '@/components/ButtonLink'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ECR_RS_ITEMS, SCALE } from '@/features/assessment/ecr-rs'
import { useViewerMutation } from '@/features/couple/hooks'
import { repo } from '@/lib/data'

export function Assessment() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => ECR_RS_ITEMS.map(() => null))
  const save = useViewerMutation((viewerId, values: number[]) => repo.saveAssessment(viewerId, values))

  if (save.isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thank you</CardTitle>
          <CardDescription>
            This helps the app ask better questions over time. You won't see a score or a type. Your picture builds
            gradually through your check-ins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonLink to="/">
            Go to home
          </ButtonLink>
        </CardContent>
      </Card>
    )
  }

  const current = answers[step]
  const isLast = step === ECR_RS_ITEMS.length - 1

  return (
    <Card>
      <CardHeader>
        <CardDescription aria-live="polite">
          {step + 1} of {ECR_RS_ITEMS.length}
        </CardDescription>
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Questionnaire progress"
          aria-valuemin={1}
          aria-valuemax={ECR_RS_ITEMS.length}
          aria-valuenow={step + 1}
        >
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / ECR_RS_ITEMS.length) * 100}%` }} />
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (current === null) return
            if (isLast) save.mutate(answers as number[])
            else setStep(step + 1)
          }}
        >
          <fieldset className="grid gap-4">
            <legend className="mb-4 text-lg font-medium">{ECR_RS_ITEMS[step]}</legend>
            <div className="grid gap-2 sm:grid-cols-7 sm:gap-1">
              {SCALE.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-md border p-2 text-sm has-checked:border-primary has-checked:bg-muted sm:flex-col sm:gap-1 sm:text-center sm:text-xs"
                >
                  <input
                    type="radio"
                    name={`item-${step}`}
                    value={option.value}
                    checked={current === option.value}
                    onChange={() => setAnswers((a) => a.map((v, i) => (i === step ? option.value : v)))}
                    className="accent-primary"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-between">
            <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Button type="submit" disabled={current === null || save.isPending}>
              {isLast ? 'Finish' : 'Next'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
