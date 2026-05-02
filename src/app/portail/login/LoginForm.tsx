'use client'

import { useState, useTransition, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Send, Check, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/i18n/dictionaries'

type Props = {
  t: Dictionary['portail']
}

function FormInner({ t }: Props) {
  const params = useSearchParams()
  const errorParam = params.get('error')
  const [email, setEmail] = useState('')
  const [pending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam === 'auth_callback' ? t.login.expired : null
  )

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const value = String(fd.get('email') ?? '').trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError(t.login.invalidEmail)
      return
    }
    startTransition(() => {
      void (async () => {
        const sb = createClient()
        const origin =
          typeof window !== 'undefined' ? window.location.origin : 'https://montreuil.be'
        const { error } = await sb.auth.signInWithOtp({
          email: value,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${origin}/auth/callback?next=/portail`,
          },
        })
        if (error) {
          // Supabase signaleert onbekende e-mails via "Signups not allowed for otp"
          // (sinds shouldCreateUser:false). Toon dan onze nette tekst.
          const isUnknown =
            /signups? not allowed/i.test(error.message) ||
            /user not found/i.test(error.message)
          setError(isUnknown ? t.login.unknownEmail : error.message)
        } else {
          setSent(true)
        }
      })()
    })
  }

  if (sent) {
    return (
      <div className="bg-(--color-paper) border border-(--color-frame) p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-(--color-bronze)/10 text-(--color-bronze) mb-4">
          <Check className="w-6 h-6" />
        </div>
        <h2 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] mb-2">
          {t.login.sentTitle}
        </h2>
        <p className="text-sm text-(--color-charcoal) mb-1">
          {t.login.sentBody} <strong>{email}</strong>.
        </p>
        <p className="text-xs text-(--color-stone)">{t.login.sentExpiry}</p>
        <p className="mt-6 text-xs text-(--color-stone)">
          {t.login.retryQuestion}{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-(--color-bronze) hover:text-(--color-bronze-dark) underline"
          >
            {t.login.retryAction}
          </button>
          .
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="bg-(--color-paper) border border-(--color-frame) p-8">
      <h2 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] mb-2">
        {t.espaceClient}
      </h2>
      <p className="text-sm text-(--color-charcoal) mb-6">{t.login.intro}</p>

      <label
        htmlFor="email"
        className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2"
      >
        <Mail className="w-3.5 h-3.5" />
        {t.login.emailLabel}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.login.emailPlaceholder}
        className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none mb-4"
      />

      {error && (
        <p className="inline-flex items-center gap-2 text-xs text-red-300 mb-4">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {t.login.submit}
      </button>

      <p className="mt-6 text-[11px] text-(--color-stone) text-center">{t.login.hint}</p>
    </form>
  )
}

export default function LoginForm({ t }: Props) {
  return (
    <Suspense
      fallback={
        <div className="bg-(--color-paper) border border-(--color-frame) p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-(--color-bronze) mx-auto" />
        </div>
      }
    >
      <FormInner t={t} />
    </Suspense>
  )
}
