'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Send, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import { submitContact, type ContactState } from './actions'

const initial: ContactState = { status: 'idle' }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-7 py-3 bg-(--color-bronze) text-(--color-canvas) hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-wider disabled:opacity-50"
    >
      <Send className="w-4 h-4" />
      {pending ? '…' : label}
    </button>
  )
}

type Props = {
  locale: Locale
  t: Dictionary
}

export default function ContactForm({ locale, t }: Props) {
  const [state, action] = useActionState(submitContact, initial)

  if (state.status === 'success') {
    return (
      <div className="flex items-start gap-3 p-6 bg-(--color-paper) border border-(--color-frame)">
        <CheckCircle2 className="w-5 h-5 text-(--color-bronze) shrink-0 mt-0.5" />
        <p className="text-(--color-ink)">{t.contact.success}</p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {/* honeypot — verborgen voor mensen, ingevuld door bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px]"
        aria-hidden="true"
      />

      <div>
        <label htmlFor="name" className="block text-sm uppercase tracking-wide text-(--color-stone) mb-2">
          {t.contact.name}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full px-4 py-3 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm uppercase tracking-wide text-(--color-stone) mb-2">
          {t.contact.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full px-4 py-3 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm uppercase tracking-wide text-(--color-stone) mb-2">
          {t.contact.message}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className="w-full px-4 py-3 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) resize-y"
        />
      </div>

      {state.status === 'error' && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{state.message}</p>
        </div>
      )}

      <SubmitButton label={t.contact.send} />
    </form>
  )
}
