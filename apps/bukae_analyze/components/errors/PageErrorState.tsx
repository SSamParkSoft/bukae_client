'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle } from 'lucide-react'

type ErrorStateAction = {
  label: string
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'secondary'
}

type Props = {
  title: string
  description?: string | null
  icon?: LucideIcon
  actions?: ErrorStateAction[]
  className?: string
}

function getActionClassName(variant: ErrorStateAction['variant'] = 'primary'): string {
  const baseClassName =
    'inline-flex h-11 min-w-[112px] items-center justify-center rounded-[8px] px-5 font-14-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight'

  if (variant === 'secondary') {
    return `${baseClassName} border border-white/15 bg-white/5 text-white hover:bg-white/10`
  }

  return `${baseClassName} bg-highlight text-brand hover:bg-highlight/85`
}

export function PageErrorState({
  title,
  description,
  icon: Icon = AlertTriangle,
  actions = [],
  className = '',
}: Props) {
  return (
    <section className={`flex min-h-[360px] min-w-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      <div className="mb-6 flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-highlight">
        <Icon className="size-7" aria-hidden />
      </div>
      <div className="flex max-w-[560px] flex-col items-center gap-3">
        <h2 className="font-24-md text-white">{title}</h2>
        {description ? (
          <p className="font-14-rg whitespace-pre-line text-white/60">
            {description}
          </p>
        ) : null}
      </div>
      {actions.length > 0 ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {actions.map((action) => {
            const className = getActionClassName(action.variant)

            if (action.href) {
              return (
                <Link key={action.label} href={action.href} className={className}>
                  {action.label}
                </Link>
              )
            }

            return (
              <button
                key={action.label}
                type="button"
                className={className}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
