'use client'

import { useState, useTransition } from 'react'
import { Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { saveSiteSettings } from './actions'
import type { SiteSetting } from '@/lib/site-settings'

const FIELD_LABELS: Record<string, string> = {
  site_title: 'Titre du site',
  site_tagline: 'Tagline',
  meta_description: 'Méta-description SEO',
  social_default_image: 'Image partage social (URL)',
  announcement_banner: "Bannière d'annonce",
  reply_to_email: 'Reply-To email',
  contact_phone: 'Téléphone (footer)',
  contact_address: 'Adresse postale (footer)',
  admin_notification_email: 'Email notifications admin',
  default_locale: 'Langue par défaut (fr/nl)',
}

/** Velden die als <textarea> ipv <input> renderen. */
const MULTILINE_KEYS = new Set(['meta_description', 'announcement_banner', 'contact_address'])

export default function SettingsForm({ initial }: { initial: SiteSetting[] }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const s of initial) map[s.key] = s.value ?? ''
    return map
  })
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSavedAt(null)
    startTransition(async () => {
      const r = await saveSiteSettings(values)
      if (r.ok) setSavedAt(Date.now())
      else setError(r.error)
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-(--color-paper) border border-(--color-frame) p-6 space-y-5"
    >
      {initial.map((setting) => {
        const label = FIELD_LABELS[setting.key] ?? setting.key
        const isMultiline = MULTILINE_KEYS.has(setting.key)
        return (
          <label key={setting.key} className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 block">
              {label}
            </span>
            {isMultiline ? (
              <textarea
                value={values[setting.key] ?? ''}
                onChange={(e) => update(setting.key, e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
              />
            ) : (
              <input
                type="text"
                value={values[setting.key] ?? ''}
                onChange={(e) => update(setting.key, e.target.value)}
                className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
              />
            )}
            {setting.description && (
              <p className="text-[11px] text-(--color-stone) mt-1">{setting.description}</p>
            )}
          </label>
        )
      })}

      {error && (
        <p className="inline-flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {savedAt && (
        <p className="inline-flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Paramètres enregistrés.
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
