'use client'

import { useState, useTransition } from 'react'
import { Lock, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { changeAdminPassword } from './actions'

const ERR_MAP: Record<string, string> = {
  too_short: 'Le mot de passe doit contenir au moins 8 caractères.',
  mismatch: 'Les deux mots de passe ne correspondent pas.',
  wrong_current: 'Mot de passe actuel incorrect.',
  not_authenticated: 'Session expirée. Reconnectez-vous.',
  server: 'Une erreur serveur est survenue.',
}

export default function AccountPasswordForm() {
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
    if (next.length < 8) return setError(ERR_MAP.too_short)
    if (next !== confirm) return setError(ERR_MAP.mismatch)
    startTransition(async () => {
      const r = await changeAdminPassword({ current, next, confirm })
      if (r.ok) {
        setSuccess(true)
        setCurrent('')
        setNext('')
        setConfirm('')
      } else {
        setError(ERR_MAP[r.error] ?? ERR_MAP.server)
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-(--color-paper) border border-(--color-frame) p-6 space-y-4"
    >
      <PasswordField label="Mot de passe actuel" value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordField label="Nouveau mot de passe" value={next} onChange={setNext} autoComplete="new-password" />
      <PasswordField label="Confirmer le nouveau" value={confirm} onChange={setConfirm} autoComplete="new-password" />

      {error && (
        <p className="inline-flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {success && (
        <p className="inline-flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mot de passe mis à jour.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {pending ? 'Enregistrement…' : 'Mettre à jour'}
      </button>
    </form>
  )
}

function PasswordField({
  label, value, onChange, autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 block inline-flex items-center gap-2">
        <Lock className="w-3 h-3" />
        {label}
      </span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={8}
        autoComplete={autoComplete}
        className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
      />
    </label>
  )
}
