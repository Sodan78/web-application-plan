import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** A card with an icon, a title and an optional action. `highlight` marks the next thing to do. */
export function ActionCard({
  icon: Icon,
  title,
  description,
  children,
  highlight = false,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  highlight?: boolean
}) {
  return (
    <Card
      className={cn(
        highlight &&
          'bg-linear-to-br from-[oklch(0.95_0.045_45)] via-card to-[oklch(0.95_0.035_355)] ring-primary/15',
      )}
    >
      <CardHeader className="flex items-start gap-4">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            highlight ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="grid gap-1.5">
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      {children && <CardContent className="flex flex-wrap gap-2 sm:pl-19">{children}</CardContent>}
    </Card>
  )
}
