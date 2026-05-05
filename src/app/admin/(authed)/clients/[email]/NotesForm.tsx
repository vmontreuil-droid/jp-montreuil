'use client'

import { useState, useTransition } from 'react'
import { Loader2, Save, Check } from 'lucide-react'
import { saveClientNotes } from './actions'

type Props = {
  email: string
  defaultNotes: string
}

export default function NotesForm({ email, defaultNotes }: Props) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [value, setValue] = useState(defaultNotes)

  const onSubmit = (formData: FormData) => {
    startTransition(() => {
      void (async () => {
        await saveClientNotes(formData)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      })()
    })
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="email" value={email} />
      <textarea
        name="notes"
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Notes privées sur ce client (préférences, contexte, anniversaire…)"
        className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.18em] disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saved ? 'Enregistré' : 'Enregistrer'}
        </button>
        <span className="text-[10px] text-(--color-stone) italic">
          Visible uniquement par vous
        </span>
      </div>
    </form>
  )
}
