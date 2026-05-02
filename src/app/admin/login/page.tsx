'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Mail, Lock, Unlock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { workImageUrl } from '@/lib/links'
import ThemeToggle from '@/components/site/ThemeToggle'

export default function AdminLoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const errorParam = params.get('error')
  const [error, setError] = useState<string | null>(
    errorParam === 'not_admin'
      ? 'Ce compte n\'a pas les droits administrateur.'
      : errorParam === 'auth_callback'
      ? 'Échec de la connexion.'
      : null
  )
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    // FormData ipv React state — Chrome autofill triggert niet altijd onChange,
    // waardoor controlled state leeg blijft en Supabase "missing email or phone" geeft.
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    if (!email || !password) {
      setError('E-mail et mot de passe requis.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-(--color-canvas) relative overflow-hidden">
      {/* === LINKER HELFT — papa met zijn bril === */}
      <div className="hidden lg:block relative">
        <Image
          src={workImageUrl('about/tete-lunettes-.jpg')}
          alt="Jean-Pierre Montreuil"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        {/* Donkere gradient over de foto voor leesbaarheid */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />

        {/* Tagline-card linksonder */}
        <div
          className="absolute bottom-12 left-12 px-7 py-6 backdrop-blur-md max-w-md text-white border border-white/15"
          style={{ background: 'rgba(10, 9, 8, 0.55)' }}
        >
          <div className="text-[10px] uppercase tracking-[0.25em] mb-3 text-(--color-bronze)">
            Atelier Montreuil
          </div>
          <div className="font-[family-name:var(--font-display)] text-3xl leading-tight">
            Jean-Pierre Montreuil
            <br />
            <span className="text-xl">L&apos;intermédiaire entre vous et la toile</span>
          </div>
        </div>

        {/* Decoratieve dunne lijnen rechtsboven */}
        <div className="absolute top-12 right-12 flex flex-col gap-2 text-white/70">
          <div className="h-12 w-px bg-current" />
          <div className="h-6 w-px bg-current" />
          <div className="h-3 w-px bg-current" />
        </div>
      </div>

      {/* === RECHTER HELFT — form === */}
      <div className="relative px-6 py-12 flex flex-col">
        {/* Subtiele lijnstructuur als achtergrond — horizontaal */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, var(--color-stone) 0, var(--color-stone) 1px, transparent 1px, transparent 56px)',
          }}
          aria-hidden="true"
        />

        {/* Brons-glow linksboven */}
        <div
          aria-hidden="true"
          className="absolute top-32 -left-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(184, 150, 104, 0.12)' }}
        />

        {/* Topbar — terug naar site + theme toggle */}
        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink) transition-colors group"
          >
            <ArrowLeft
              className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            Retour au site
          </Link>
          <ThemeToggle labelLight="Mode clair" labelDark="Mode sombre" />
        </div>

        {/* Form gecentreerd */}
        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-sm relative z-10">
            {/* Logo met halo */}
            <div className="relative flex justify-center mb-6">
              <div
                aria-hidden="true"
                className="absolute inset-0 m-auto w-40 h-40 rounded-full blur-2xl"
                style={{ background: 'radial-gradient(circle, rgba(184, 150, 104, 0.25), transparent 70%)' }}
              />
              <Image
                src="/logo.png"
                alt="Atelier Montreuil"
                width={743}
                height={258}
                className="h-14 w-auto relative logo-invert"
                priority
              />
            </div>

            {/* Titel */}
            <div className="text-center mb-8">
              <div className="font-[family-name:var(--font-display)] text-3xl mb-1 text-(--color-ink)">
                Admin
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">
                Connexion
              </div>
            </div>

            {/* Decoratieve scheiding — drie streepjes */}
            <div className="flex items-center gap-2 justify-center mb-8 text-(--color-bronze)/60">
              <div className="h-px w-8 bg-current" />
              <div className="h-1 w-1 rounded-full bg-current" />
              <div className="h-px w-8 bg-current" />
            </div>

            <form
              onSubmit={onSubmit}
              className="space-y-5 bg-(--color-paper)/70 backdrop-blur-md border border-(--color-frame) p-8"
            >
              <div>
                <label
                  htmlFor="email"
                  className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  E-mail
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-stone)">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue=""
                    className="w-full pl-10 pr-4 py-3 bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Mot de passe
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-stone)">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    defaultValue=""
                    className="w-full pl-10 pr-4 py-3 bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <p className="flex items-start gap-2 text-sm text-red-200 bg-red-950/40 border border-red-900 px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em] disabled:opacity-50"
              >
                {loading ? (
                  <span>Connexion…</span>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Se connecter</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="relative z-10 text-center text-xs text-(--color-stone)">
          © {new Date().getFullYear()} Atelier Montreuil
        </div>
      </div>
    </div>
  )
}
