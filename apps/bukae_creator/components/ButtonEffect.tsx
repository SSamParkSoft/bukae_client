'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

export type ButtonEffectState = 'off' | 'hover' | 'select'

interface ButtonEffectProps {
  state?: ButtonEffectState
  onClick?: () => void
  children: ReactNode
  className?: string
  size?: 'default' | 'small' | 'icon'
  disabled?: boolean
}

export default function ButtonEffect({
  state = 'off',
  onClick,
  children,
  className,
  size = 'default',
  disabled = false,
}: ButtonEffectProps) {
  const getVariant = (): 'effect' | 'effect-hover' | 'effect-selected' => {
    switch (state) {
      case 'select':
        return 'effect-selected'
      case 'hover':
        return 'effect-hover'
      default:
        return 'effect'
    }
  }

  const getSize = () => {
    if (size === 'icon') return 'small'
    if (size === 'small') return 'sm'
    return 'default'
  }

  return (
    <Button
      variant={getVariant()}
      size={getSize()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        size === 'icon' && 'w-12 h-9 p-0',
        size === 'small' && 'h-[38px] px-3',
        'font-bold text-sm leading-[22.4px]',
        className
      )}
    >
      {children}
    </Button>
  )
}
