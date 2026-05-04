'use client'

import { useFormStatus } from 'react-dom'
import { ArrowRight, Loader2 } from 'lucide-react'

type Props = {
  label: string
  pendingLabel: string
}

export default function ConfirmButton({ label, pendingLabel }: Props) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-6 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.18em] disabled:opacity-70 disabled:cursor-wait"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  )
}
