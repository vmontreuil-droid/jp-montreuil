'use client'

import { useState, useTransition, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lock, Save, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Dictionary } from '@/i18n/dictionaries'
import { updatePasswordAction } from './actions'

type Props = {
  t: Dictionary['portail']
}

function FormInner({ t }: Props) {
  const params = useSearchParams()
  const errorParam = params.get('err')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    if (!errorParam) return null
    const map: Record<string, string> = {
      too_short: t.reset.errors.tooShort,
      mismatch: t.reset.errors.mismatch,
      not_authenticated: t.reset.errors.notAuthenticated,
      server: t.reset.errors.server,
    }
    return map[errorParam] ?? null
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError(t.reset.errors.tooShort)
    if (password !== confirm) return setError(t.reset.errors.mismatch)

    startTransition(() => {
      void (async () => {
        const r = await updatePasswordAction({ password, confirm })
        if (r.ok) {
          setSuccess(true)
          return
        }
        if (r.error === 'too_short') setError(t.reset.errors.tooShort)
        else if (r.error === 'mismatch') setError(t.reset.errors.mismatch)
        else if (r.error === 'not_authenticated')
          setError(t.reset.errors.notAuthenticated)
        else setError(t.reset.errors.server)
      })()
    })
  }

  if (success) {
    return (
      <div className="bg-(--color-paper) border border-(--color-frame) p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-(--color-bronze)/10 text-(--color-bronze) mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] mb-2">
          {t.reset.successTitle}
        </h2>
        <p className="text-sm text-(--color-charcoal) mb-6">{t.reset.successBody}</p>
        <Link
          href="/portail"
          className="inline-flex items-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em]"
        >
          {t.reset.goToPortal}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="bg-(--color-paper) border border-(--color-frame) p-8">
      <h2 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] mb-2">
        {t.reset.title}
      </h2>
      <p className="text-sm text-(--color-charcoal) mb-6">{t.reset.lead}</p>

      <label
        htmlFor="password"
        className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2"
      >
        <Lock className="w-3.5 h-3.5" />
        {t.reset.newPasswordLabel}
      </label>
      <input
        id="password"
        type="password"
        required
        autoComplete="new-password"
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t.reset.newPasswordPlaceholder}
        className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none mb-4"
      />

      <label
        htmlFor="confirm"
        className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2"
      >
        <Lock className="w-3.5 h-3.5" />
        {t.reset.confirmPasswordLabel}
      </label>
      <input
        id="confirm"
        type="password"
        required
        autoComplete="new-password"
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={t.reset.newPasswordPlaceholder}
        className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none mb-4"
      />

      {error && (
        <p className="inline-flex items-start gap-2 text-xs text-red-300 mb-4">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {pending ? t.reset.saving : t.reset.submit}
      </button>
    </form>
  )
}

export default function ResetForm({ t }: Props) {
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
