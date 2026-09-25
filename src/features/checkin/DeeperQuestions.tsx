import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useMyReflections, usePrivateNotes, useViewerMutation } from '@/features/couple/hooks'
import { repo } from '@/lib/data'
import { pickDeeperQuestions, type DeeperQuestion } from './deeper-questions'

/** Private follow-up questions from the viewer's own reflections (FR-39..42). */
export function DeeperQuestions({ checkinId }: { checkinId: string }) {
  const reflections = useMyReflections(checkinId)
  const notes = usePrivateNotes(checkinId)

  if (reflections.isPending || notes.isPending) return null
  const questions = pickDeeperQuestions(reflections.data ?? [])
  if (questions.length === 0) return null

  return (
    <Card className="bg-linear-to-br from-[oklch(0.96_0.03_300)] via-card to-card">
      <CardHeader className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Lock aria-hidden="true" className="size-5" />
        </span>
        <div className="grid gap-1.5">
          <CardTitle className="text-xl">For you, privately</CardTitle>
          <CardDescription>
            A few questions from what you wrote. These are just for you. They could be good to bring to your therapist.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {questions.map((q) => (
          <QuestionField
            key={q.key}
            checkinId={checkinId}
            question={q}
            initial={notes.data?.find((n) => n.questionKey === q.key)?.body ?? ''}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function QuestionField({ checkinId, question, initial }: { checkinId: string; question: DeeperQuestion; initial: string }) {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(false)
  const save = useViewerMutation((viewerId, body: string) =>
    repo.savePrivateNote(viewerId, checkinId, question.key, body),
  )
  const id = `deeper-${question.key}`

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-medium">
          {question.text}
        </label>
        <span className="shrink-0 text-xs text-muted-foreground" aria-live="polite">
          {saved ? 'Saved' : ''}
        </span>
      </div>
      <Textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setSaved(false)
        }}
        onBlur={() => {
          if (value.trim() !== initial.trim()) save.mutate(value, { onSuccess: () => setSaved(true) })
        }}
      />
    </div>
  )
}
