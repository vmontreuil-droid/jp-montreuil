'use client'

import { useState, useTransition, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Mail,
  Send,
  Check,
  AlertCircle,
  Loader2,
  Lock,
  KeyRound,
  Wand,
} from 'lucide-react'
import type { Dictionary } from '@/i18n/dictionaries'
import {
  signInWithPassword,
  requestPasswordReset,
  requestPortalMagicLink,
} from './actions'

type Mode = 'password' | 'magic'

type Props = {
  t: Dictionary['portail']
}

function FormInner({ t }: Props) {
  const params = useSearchParams()
  const errorParam = params.get('error') ?? params.get('err')
  const nextRaw = params.get('next')
  const nextPath =
    nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : null
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, startTransition] = useTransition()
  const [magicSent, setMagicSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    if (!errorParam) return null
    const map: Record<string, string> = {
      auth_callback: t.login.expired,
      invalid_credentials: t.login.invalidCredentials,
      invalid_email: t.login.invalidEmail,
      rate_limited: t.login.rateLimited,
      wrong_account: t.login.wrongAccount,
    }
    return map[errorParam] ?? null
  })

  function clearMessages() {
    setError(null)
  }

  function onPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    clearMessages()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t.login.invalidEmail)
      return
    }
    startTransition(() => {
      void (async () => {
        const r = await signInWithPassword({ email, password })
        if (r.ok) {
          window.location.href = nextPath ?? '/portail'
          return
        }
        if (r.error === 'invalid_credentials') setError(t.login.invalidCredentials)
        else if (r.error === 'invalid_email') setError(t.login.invalidEmail)
        else if (r.error === 'rate_limited') setError(t.login.rateLimited)
        else setError(t.login.sendFailed)
      })()
    })
  }

  function onMagicSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    clearMessages()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t.login.invalidEmail)
      return
    }
    startTransition(() => {
      void (async () => {
        const r = await requestPortalMagicLink({ email, next: nextPath ?? undefined })
        if (r.ok) {
          setMagicSent(true)
          return
        }
        if (r.error === 'unknown_email') setError(t.login.unknownEmail)
        else if (r.error === 'invalid_email') setError(t.login.invalidEmail)
        else setError(t.login.sendFailed)
      })()
    })
  }

  function onResetClick() {
    clearMessages()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t.login.invalidEmail)
      return
    }
    startTransition(() => {
      void (async () => {
        const r = await requestPasswordReset({ email })
        if (r.ok) {
          setResetSent(true)
          return
        }
        if (r.error === 'unknown_email') setError(t.login.unknownEmail)
        else if (r.error === 'invalid_email') setError(t.login.invalidEmail)
        else setError(t.login.sendFailed)
      })()
    })
  }

  if (magicSent) {
    return <SentCard email={email} title={t.login.sentTitle} body={t.login.sentBody} expiry={t.login.sentExpiry} retryQuestion={t.login.retryQuestion} retryAction={t.login.retryAction} onRetry={() => setMagicSent(false)} />
  }

  if (resetSent) {
    return <SentCard email={email} title={t.login.resetSentTitle} body={t.login.resetSentBody} expiry={t.login.resetSentExpiry} retryQuestion={t.login.retryQuestion} retryAction={t.login.retryAction} onRetry={() => setResetSent(false)} />
  }

  return (
    <div className="bg-(--color-paper) border border-(--color-frame) overflow-hidden">
      {/* Mode-tabs */}
      <div className="grid grid-cols-2 border-b border-(--color-frame)">
        <button
          type="button"
          onClick={() => {
            setMode('password')
            clearMessages()
          }}
          className={`inline-flex items-center justify-center gap-2 py-3 text-xs uppercase tracking-[0.18em] transition-colors ${
            mode === 'password'
              ? 'bg-(--color-paper) text-(--color-ink) border-b-2 border-(--color-bronze)'
              : 'bg-(--color-canvas) text-(--color-stone) hover:text-(--color-ink)'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          {t.login.modePasswordLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('magic')
            clearMessages()
          }}
          className={`inline-flex items-center justify-center gap-2 py-3 text-xs uppercase tracking-[0.18em] transition-colors ${
            mode === 'magic'
              ? 'bg-(--color-paper) text-(--color-ink) border-b-2 border-(--color-bronze)'
              : 'bg-(--color-canvas) text-(--color-stone) hover:text-(--color-ink)'
          }`}
        >
          <Wand className="w-3.5 h-3.5" />
          {t.login.modeMagicLabel}
        </button>
      </div>

      <div className="p-8">
        <h2 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] mb-2">
          {mode === 'password' ? t.login.titlePassword : t.login.titleMagic}
        </h2>
        <p className="text-sm text-(--color-charcoal) mb-6">
          {mode === 'password' ? t.login.intro : t.login.introMagic}
        </p>

        <form onSubmit={mode === 'password' ? onPasswordSubmit : onMagicSubmit}>
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
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.login.emailPlaceholder}
            className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none mb-4"
          />

          {mode === 'password' && (
            <>
              <label
                htmlFor="password"
                className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2"
              >
                <Lock className="w-3.5 h-3.5" />
                {t.login.passwordLabel}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.login.passwordPlaceholder}
                className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none mb-2"
              />
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={onResetClick}
                  className="text-xs text-(--color-bronze) hover:text-(--color-bronze-dark) underline-offset-2 hover:underline"
                >
                  {t.login.forgotPassword}
                </button>
              </div>
            </>
          )}

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
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'password' ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {mode === 'password' ? t.login.submitPassword : t.login.submit}
          </button>

          <p className="mt-6 text-[11px] text-(--color-stone) text-center leading-relaxed">
            {t.login.hint}
          </p>
        </form>
      </div>
    </div>
  )
}

function SentCard({
  email,
  title,
  body,
  expiry,
  retryQuestion,
  retryAction,
  onRetry,
}: {
  email: string
  title: string
  body: string
  expiry: string
  retryQuestion: string
  retryAction: string
  onRetry: () => void
}) {
  return (
    <div className="bg-(--color-paper) border border-(--color-frame) p-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-(--color-bronze)/10 text-(--color-bronze) mb-4">
        <Check className="w-6 h-6" />
      </div>
      <h2 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] mb-2">
        {title}
      </h2>
      <p className="text-sm text-(--color-charcoal) mb-1">
        {body} <strong>{email}</strong>.
      </p>
      <p className="text-xs text-(--color-stone)">{expiry}</p>
      <p className="mt-6 text-xs text-(--color-stone)">
        {retryQuestion}{' '}
        <button
          type="button"
          onClick={onRetry}
          className="text-(--color-bronze) hover:text-(--color-bronze-dark) underline"
        >
          {retryAction}
        </button>
        .
      </p>
    </div>
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
