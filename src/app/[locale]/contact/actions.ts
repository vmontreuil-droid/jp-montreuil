'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocale } from '@/i18n/config'

export type ContactState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()
  const localeRaw = String(formData.get('locale') ?? 'fr')
  const locale = isLocale(localeRaw) ? localeRaw : 'fr'
  const honeypot = String(formData.get('website') ?? '')

  if (honeypot) {
    // Honeypot ingevuld door bot — stilzwijgend "succes" tonen
    return { status: 'success' }
  }

  if (!name || !email || !message) {
    return { status: 'error', message: 'Tous les champs sont requis.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Email invalide.' }
  }
  if (message.length < 5 || message.length > 5000) {
    return { status: 'error', message: 'Message trop court ou trop long.' }
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  const userAgent = h.get('user-agent') ?? null

  const supabase = createAdminClient()
  const { error } = await supabase.from('contact_messages').insert({
    name,
    email,
    message,
    locale,
    ip,
    user_agent: userAgent,
  })

  if (error) {
    console.error('Contact insert failed', error)
    return { status: 'error', message: 'Server error.' }
  }

  return { status: 'success' }
}
