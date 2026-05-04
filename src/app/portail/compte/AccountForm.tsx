'use client'

import { useState, useTransition } from 'react'
import { Lock, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { Dictionary } from '@/i18n/dictionaries'
import { changePassword } from './actions'

type Props = {
  t: Dictionary['portail']
}

export default function AccountForm({ t }: Props) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (next.length < 8) return setError(t.account.errors.tooShort)
    if (next !== confirm) return setError(t.account.errors.mismatch)
    startTransition(() => {
      void (async () => {
        const r = await changePassword({ current, next, confirm })
        if (r.ok) {
          setSuccess(true)
          setCurrent('')
          setNext('')
          setConfirm('')
          return
        }
        if (r.error === 'too_short') setError(t.account.errors.tooShort)
        else if (r.error === 'mismatch') setError(t.account.errors.mismatch)
        else if (r.error === 'wrong_current') setError(t.account.errors.wrongCurrent)
        else setError(t.account.errors.server)
      })()
    })
  }

  return (
    <form onSubmit={onSubmit} className="bg-(--color-paper) border border-(--color-frame) p-6 md:p-8 space-y-4">
      <div className="space-y-1">
        <label htmlFor="current" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          <Lock className="w-3.5 h-3.5" />
          {t.account.currentPasswordLabel}
        </label>
        <input
          id="current"
          type="password"
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="next" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          <Lock className="w-3.5 h-3.5" />
          {t.account.newPasswordLabel}
        </label>
        <input
          id="next"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          <Lock className="w-3.5 h-3.5" />
          {t.account.confirmPasswordLabel}
        </label>
        <input
          id="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
      </div>

      {error && (
        <p className="inline-flex items-start gap-2 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {success && (
        <p className="inline-flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {t.account.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {pending ? t.account.saving : t.account.submit}
      </button>
    </form>
  )
}
