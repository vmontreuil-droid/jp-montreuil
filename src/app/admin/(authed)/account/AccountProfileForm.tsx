'use client'

import { useState, useTransition } from 'react'
import { Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { saveAdminProfile } from './actions'

type Initial = {
  display_name: string
  avatar_url: string
}

export default function AccountProfileForm({ initial }: { initial: Initial }) {
  const [displayName, setDisplayName] = useState(initial.display_name)
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url)
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSavedAt(null)
    startTransition(async () => {
      const r = await saveAdminProfile({ display_name: displayName, avatar_url: avatarUrl })
      if (r.ok) setSavedAt(Date.now())
      else setError(r.error)
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-(--color-paper) border border-(--color-frame) p-6 space-y-4"
    >
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 block">
          Nom affiché
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Jean-Pierre Montreuil"
          className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
        />
        <p className="text-[11px] text-(--color-stone) mt-1">
          Apparaît dans les emails sortants et la signature.
        </p>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 block">
          URL de l&apos;avatar (optionnel)
        </span>
        <input
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…"
          className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm font-mono focus:border-(--color-bronze) focus:outline-none"
        />
      </label>

      {error && (
        <p className="inline-flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {savedAt && (
        <p className="inline-flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Enregistré.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
