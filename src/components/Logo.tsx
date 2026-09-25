import { cn } from '@/lib/utils'

/** Two overlapping circles: two people, one shared space. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 28" aria-hidden="true" className={cn('h-7 w-10', className)}>
      <circle cx="14" cy="14" r="11" fill="var(--primary)" opacity="0.9" />
      <circle cx="26" cy="14" r="11" fill="var(--chart-2)" opacity="0.75" style={{ mixBlendMode: 'multiply' }} />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="font-heading text-xl font-medium tracking-tight">Couples Unite</span>
    </span>
  )
}
