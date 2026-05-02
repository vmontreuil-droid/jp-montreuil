import { headers } from 'next/headers'
import { isLocale, defaultLocale, type Locale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Bepaal de taal voor /portail/* :
 *   1. Ingelogd → kijk de `client_locale` op van het meest recente album
 *      gekoppeld aan het e-mailadres van de user.
 *   2. Niet ingelogd → val terug op Accept-Language (eerste FR/NL match).
 *   3. Geen indicatie → defaultLocale (FR).
 *
 * Wordt server-side gebruikt door de portail layout en pagina's. Geeft
 * altijd een geldige Locale terug.
 */
export async function getPortailLocale(): Promise<Locale> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('event_albums')
      .select('client_locale, created_at')
      .ilike('client_email', user.email)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const loc = data?.client_locale
    if (loc && isLocale(loc)) return loc
  }

  return acceptLanguageLocale()
}

async function acceptLanguageLocale(): Promise<Locale> {
  const h = await headers()
  const al = h.get('accept-language') ?? ''
  // Vereenvoudigd: pak het eerste taag, kijk of het met fr of nl begint.
  const tags = al.split(',').map((s) => s.trim().split(';')[0]?.toLowerCase() ?? '')
  for (const tag of tags) {
    if (tag.startsWith('nl')) return 'nl'
    if (tag.startsWith('fr')) return 'fr'
  }
  return defaultLocale
}
