import { ArrowRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { defaultLocale, isLocale, type Locale } from '@/i18n/config'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{
    token_hash?: string
    type?: string
    next?: string
  }>
}

const ALLOWED_TYPES = ['magiclink', 'recovery', 'invite', 'signup', 'email_change', 'email'] as const
type AllowedType = (typeof ALLOWED_TYPES)[number]

async function detectLocale(): Promise<Locale> {
  const h = await headers()
  const al = h.get('accept-language') ?? ''
  for (const tag of al.split(',').map((s) => s.trim().split(';')[0]?.toLowerCase() ?? '')) {
    if (tag.startsWith('nl')) return 'nl'
    if (tag.startsWith('fr')) return 'fr'
  }
  return defaultLocale
}

/**
 * Tussenpagina die de magic-link verifieert via een expliciete user-klik.
 * Doel: voorkom dat link-scanners (Outlook SafeLinks, Gmail link-preview)
 * de eenmalige token opbruiken vóór de bezoeker klikt. Wanneer de pagina
 * geladen wordt, gebeurt er nog niets — pas op klik POST'et de form-action
 * naar de callback waar verifyOtp gebeurt.
 */
export default async function ConfirmPage({ searchParams }: Props) {
  const sp = await searchParams
  const tokenHash = sp.token_hash ?? ''
  const typeRaw = sp.type ?? ''
  const next = sp.next ?? '/portail'

  const locale = await detectLocale()
  const isFR = locale === 'fr'

  const isPortail = next.startsWith('/portail') || next.startsWith('/nl/portail')
  const errorRedirect = isPortail ? '/portail/login?error=auth_callback' : '/admin/login?error=auth_callback'

  // Validatie: ontbreekt iets → meteen naar fout
  if (!tokenHash || !ALLOWED_TYPES.includes(typeRaw as AllowedType)) {
    redirect(errorRedirect)
  }

  async function confirmAction() {
    'use server'
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeRaw as AllowedType,
    })
    if (error) {
      console.error('[auth/confirm] verifyOtp failed:', error.message)
      redirect(errorRedirect)
    }
    redirect(next)
  }

  const title = isFR ? 'Confirmez votre connexion' : 'Bevestig uw aanmelding'
  const body = isFR
    ? 'Pour des raisons de sécurité, cliquez sur le bouton ci-dessous pour activer votre lien de connexion.'
    : 'Klik op de knop hieronder om uw login-link te activeren.'
  const button = isFR ? 'Continuer vers mes photos' : "Doorgaan naar mijn foto's"
  const note = isFR
    ? 'Une étape supplémentaire — ce clic est nécessaire pour empêcher les filtres anti-spam de consommer votre lien.'
    : 'Een extra klik — dit voorkomt dat spamfilters uw link verbruiken voordat u hem opent.'

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-(--color-paper) border border-(--color-frame) p-8 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-(--color-stone) mb-3">
          Atelier Montreuil
        </p>
        <h1 className="text-2xl text-(--color-ink) font-[family-name:var(--font-display)] mb-4">
          {title}
        </h1>
        <p className="text-sm text-(--color-charcoal) mb-7">{body}</p>
        <form action={confirmAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.18em]"
          >
            {button}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
        <p className="mt-6 text-[11px] text-(--color-stone) leading-relaxed">{note}</p>
      </div>
    </main>
  )
}
