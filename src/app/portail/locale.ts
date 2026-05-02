import { headers, cookies } from 'next/headers'
import { isLocale, defaultLocale, type Locale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PORTAIL_LOCALE_COOKIE } from './locale-cookie'

/**
 * Bepaal de taal voor /portail/* (in volgorde van prioriteit):
 *   1. Cookie `portail_locale` — handmatige keuze van de klant via de
 *      FR/NL-knop in de header.
 *   2. Ingelogd → `client_locale` van het meest recente actieve album.
 *   3. Accept-Language header (eerste FR/NL match).
 *   4. defaultLocale (FR).
 */
export async function getPortailLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const cookieLoc = cookieStore.get(PORTAIL_LOCALE_COOKIE)?.value
  if (cookieLoc && isLocale(cookieLoc)) return cookieLoc

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
