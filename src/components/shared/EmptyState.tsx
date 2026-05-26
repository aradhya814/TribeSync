import type { ComponentType, ReactNode } from 'react'

type EmptyStateProps = {
  icon: ComponentType<{ className?: string }>
  heading: string
  description: string
  cta?: ReactNode
}

export function EmptyState({ icon: Icon, heading, description, cta }: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-surface p-8 text-center">
      <Icon className="mb-4 size-8 text-tribe-primary" />
      <h2 className="heading-3">{heading}</h2>
      <p className="body-text mt-2 max-w-md">{description}</p>
      {cta ? <div className="mt-5">{cta}</div> : null}
    </div>
  )
}
