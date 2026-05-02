'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { isLocale, type Locale } from '@/i18n/config'

export const PORTAIL_LOCALE_COOKIE = 'portail_locale'

/**
 * Zet de taalvoorkeur voor /portail/* via cookie. Overschrijft de
 * album-locale en de Accept-Language fallback. Wordt aangeroepen door
 * de FR/NL-knop in de header wanneer de bezoeker op portail zit.
 */
export async function setPortailLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return
  const store = await cookies()
  store.set(PORTAIL_LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 jaar
    sameSite: 'lax',
    httpOnly: false, // mag client-zichtbaar zijn — geen secret
  })
  revalidatePath('/portail', 'layout')
}
