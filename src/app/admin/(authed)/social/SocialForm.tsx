'use client'

import { useState, useTransition } from 'react'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'
import { updateSocialSettings } from './actions'

type Props = {
  facebook: string
  instagram: string
}

type IconProps = { className?: string; style?: React.CSSProperties }

function FacebookIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.13 8.44 9.88v-6.99H7.9v-2.89h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.89h-2.33V22c4.78-.75 8.44-4.88 8.44-9.94z" />
    </svg>
  )
}

function InstagramIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

export default function SocialForm({ facebook, instagram }: Props) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaved(false)
    const fd = new FormData(e.currentTarget)
    startTransition(() => {
      void (async () => {
        await updateSocialSettings(fd)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      })()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label htmlFor="facebook" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          <FacebookIcon className="w-3.5 h-3.5" style={{ color: '#1877f2' }} />
          Facebook
        </label>
        <input
          id="facebook"
          name="facebook"
          type="url"
          defaultValue={facebook}
          placeholder="https://www.facebook.com/jeanpierre.montreuil.3"
          className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) font-mono text-sm"
        />
      </div>

      <div>
        <label htmlFor="instagram" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          <InstagramIcon className="w-3.5 h-3.5" style={{ color: '#e4405f' }} />
          Instagram
          <span className="ml-2 normal-case tracking-normal text-(--color-stone)">(optionnel)</span>
        </label>
        <input
          id="instagram"
          name="instagram"
          type="url"
          defaultValue={instagram}
          placeholder="https://www.instagram.com/..."
          className="w-full px-3 py-2 bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) font-mono text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em] disabled:opacity-50"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-(--color-bronze)">
            <CheckCircle2 className="w-4 h-4" />
            Enregistré
          </span>
        )}
      </div>
    </form>
  )
}
