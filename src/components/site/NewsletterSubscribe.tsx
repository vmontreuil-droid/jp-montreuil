'use client'

import { useState, useTransition } from 'react'
import { Mail, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { subscribeToNewsletterAction } from './newsletter-actions'

type Props = {
  locale: 'fr' | 'nl'
  variant?: 'inline' | 'footer'
}

const TEXT = {
  fr: {
    title: 'Newsletter',
    lead: 'Recevez les nouvelles œuvres et expositions de Jean-Pierre.',
    placeholder: 'votre@email.be',
    submit: 'S’inscrire',
    submitting: 'Inscription…',
    invalidEmail: 'Adresse e-mail invalide.',
    server: 'Une erreur est survenue. Réessayez.',
    successNew: 'Inscription confirmée. Merci !',
    successAlready: 'Cette adresse est déjà abonnée.',
  },
  nl: {
    title: 'Nieuwsbrief',
    lead: 'Ontvang de nieuwe werken en tentoonstellingen van Jean-Pierre.',
    placeholder: 'uw@email.be',
    submit: 'Inschrijven',
    submitting: 'Inschrijven…',
    invalidEmail: 'Ongeldig e-mailadres.',
    server: 'Er is een fout opgetreden. Probeer opnieuw.',
    successNew: 'Inschrijving bevestigd. Bedankt!',
    successAlready: 'Dit adres is al ingeschreven.',
  },
}

export default function NewsletterSubscribe({ locale, variant = 'inline' }: Props) {
  const t = TEXT[locale]
  const [email, setEmail] = useState('')
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<
    | null
    | { ok: true; alreadySubscribed: boolean }
    | { ok: false; error: string }
  >(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setResult({ ok: false, error: t.invalidEmail })
      return
    }
    setResult(null)
    startTransition(async () => {
      const r = await subscribeToNewsletterAction({ email: email.trim(), locale })
      if (r.ok) {
        setResult({ ok: true, alreadySubscribed: r.alreadySubscribed })
        if (!r.alreadySubscribed) setEmail('')
      } else {
        setResult({ ok: false, error: r.error || t.server })
      }
    })
  }

  const isFooter = variant === 'footer'

  return (
    <form onSubmit={onSubmit} className={isFooter ? 'space-y-2' : 'space-y-3'}>
      {!isFooter && (
        <>
          <h3 className="font-[family-name:var(--font-display)] text-xl text-(--color-ink) inline-flex items-center gap-2">
            <Mail className="w-4 h-4 text-(--color-bronze)" />
            {t.title}
          </h3>
          <p className="text-sm text-(--color-charcoal)">{t.lead}</p>
        </>
      )}

      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.placeholder}
          autoComplete="email"
          className={`flex-1 px-3 py-2 text-sm focus:outline-none border ${
            isFooter
              ? 'bg-(--color-canvas) border-(--color-frame) text-(--color-ink) focus:border-(--color-bronze)'
              : 'bg-(--color-paper) border-(--color-frame) text-(--color-ink) focus:border-(--color-bronze)'
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.15em] disabled:opacity-50 whitespace-nowrap"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{pending ? t.submitting : t.submit}</span>
        </button>
      </div>

      {result?.ok && (
        <p className="inline-flex items-start gap-1.5 text-xs text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {result.alreadySubscribed ? t.successAlready : t.successNew}
        </p>
      )}
      {result && !result.ok && (
        <p className="inline-flex items-start gap-1.5 text-xs text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {result.error}
        </p>
      )}
    </form>
  )
}
