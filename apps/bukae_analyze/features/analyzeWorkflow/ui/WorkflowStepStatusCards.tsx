'use client'

import { motion } from 'framer-motion'

export type WorkflowStepStatusCard = {
  title: string
  description: string
  tone?: 'info' | 'error'
}

type Props = (
  | {
    variant: 'single'
    card: WorkflowStepStatusCard
    cards?: never
  }
  | {
    variant: 'stack'
    card?: never
    cards: WorkflowStepStatusCard[]
  }
)

function WorkflowStepStatusCardItem({
  card,
  index = 0,
}: {
  card: WorkflowStepStatusCard
  index?: number
}) {
  const tone = card.tone ?? 'info'
  const className = tone === 'error'
    ? 'rounded-lg border border-red-300/30 bg-red-500/10 px-4 py-3 text-red-100 shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-md'
    : 'rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-white shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-md'
  const descriptionClassName = tone === 'error'
    ? 'mt-1 font-12-rg text-red-100/80'
    : 'mt-1 font-12-rg text-white/60'

  return (
    <motion.div
      key={card.title}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, delay: index * 0.06, ease: 'easeOut' }}
      className={className}
    >
      <p className="font-14-md">{card.title}</p>
      <p className={descriptionClassName}>{card.description}</p>
    </motion.div>
  )
}

function WorkflowStepStatusCardList({
  cards,
}: {
  cards: WorkflowStepStatusCard[]
}) {
  return cards.map((card, index) => (
    <WorkflowStepStatusCardItem
      key={card.title}
      card={card}
      index={index}
    />
  ))
}

export function WorkflowStepStatusCards(props: Props) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex w-[232px] flex-col gap-2"
    >
      {props.variant === 'single' ? (
        <WorkflowStepStatusCardItem card={props.card} />
      ) : (
        <WorkflowStepStatusCardList cards={props.cards} />
      )}
    </motion.div>
  )
}
