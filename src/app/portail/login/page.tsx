'use client'

import { useState, useTransition, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Send, Check, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const params = useSearchParams()
  const errorParam = params.get('error')
  const [email, setEmail] = useState('')
  const [pending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam === 'auth_callback' ? 'Le lien a expiré. Demandez-en un nouveau ci-dessous.' : null
  )

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const value = String(fd.get('email') ?? '').trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError('Adresse e-mail invalide')
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
            emailRedirectTo: `${origin}/auth/callback?next=/portail`,
          },
        })
        if (error) {
          setError(error.message)
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
          Vérifiez votre e-mail
        </h2>
        <p className="text-sm text-(--color-charcoal) mb-1">
          Un lien de connexion a été envoyé à <strong>{email}</strong>.
        </p>
        <p className="text-xs text-(--color-stone)">
          Cliquez sur le lien dans l&apos;e-mail pour accéder à vos photos. Le lien expire après 1 heure.
        </p>
        <p className="mt-6 text-xs text-(--color-stone)">
          Pas reçu ? Vérifiez vos spams, ou{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-(--color-bronze) hover:text-(--color-bronze-dark) underline"
          >
            essayez à nouveau
          </button>
          .
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="bg-(--color-paper) border border-(--color-frame) p-8">
      <h2 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] mb-2">
        Espace client
      </h2>
      <p className="text-sm text-(--color-charcoal) mb-6">
        Recevez un lien de connexion par e-mail. Aucun mot de passe à retenir.
      </p>

      <label htmlFor="email" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
        <Mail className="w-3.5 h-3.5" />
        E-mail
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="vous@example.com"
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
        Envoyer le lien
      </button>

      <p className="mt-6 text-[11px] text-(--color-stone) text-center">
        L&apos;adresse e-mail doit être celle utilisée par Jean-Pierre lors de la création de votre album.
      </p>
    </form>
  )
}

export default function PortailLoginPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <Suspense
        fallback={
          <div className="bg-(--color-paper) border border-(--color-frame) p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-(--color-bronze) mx-auto" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
