'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email/client'
import { NewContactMessage } from '@/lib/email/templates/NewContactMessage'

export type ChangePasswordResult =
  | { ok: true }
  | {
      ok: false
      error: 'too_short' | 'mismatch' | 'wrong_current' | 'not_authenticated' | 'server'
    }

export async function changePassword(input: {
  current: string
  next: string
  confirm: string
}): Promise<ChangePasswordResult> {
  if (input.next.length < 8) return { ok: false, error: 'too_short' }
  if (input.next !== input.confirm) return { ok: false, error: 'mismatch' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return { ok: false, error: 'not_authenticated' }

  // Re-auth with current password to verify
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.current,
  })
  if (signInErr) {
    return { ok: false, error: 'wrong_current' }
  }

  const { error } = await supabase.auth.updateUser({ password: input.next })
  if (error) {
    console.error('[compte/changePassword] error:', error.message)
    return { ok: false, error: 'server' }
  }

  revalidatePath('/portail/compte')
  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/portail/login')
}

export type SendMessageState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function sendMessageToJP(
  _prev: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return { status: 'error', message: 'Niet ingelogd.' }
  }

  const message = String(formData.get('message') ?? '').trim()
  const localeRaw = String(formData.get('locale') ?? 'fr')
  const locale: 'fr' | 'nl' = localeRaw === 'nl' ? 'nl' : 'fr'
  const isFR = locale === 'fr'
  // Optionele commission-id (wanneer vraag gesteld vanuit dossier-pagina)
  const commissionId = String(formData.get('commission_id') ?? '').trim() || null

  if (message.length < 5) {
    return {
      status: 'error',
      message: isFR ? 'Message trop court.' : 'Bericht te kort.',
    }
  }
  if (message.length > 5000) {
    return {
      status: 'error',
      message: isFR ? 'Message trop long.' : 'Bericht te lang.',
    }
  }

  const admin = createAdminClient()

  // Naam + telefoon ophalen uit meest recente commission van deze klant
  const { data: lastReq } = await admin
    .from('commission_requests')
    .select('name, phone')
    .ilike('email', user.email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ name: string; phone: string | null }>()

  const name = lastReq?.name || user.email
  const phone = lastReq?.phone || ''

  // Optioneel: dossier-context ophalen voor in subject/body
  let commissionContext = ''
  if (commissionId) {
    const { data: comm } = await admin
      .from('commission_requests')
      .select('id, devis_subject, email')
      .eq('id', commissionId)
      .maybeSingle<{ id: string; devis_subject: string | null; email: string }>()
    if (comm && comm.email.toLowerCase() === user.email.toLowerCase()) {
      const subjectStr = comm.devis_subject || `${comm.id.slice(0, 8)}`
      commissionContext = isFR
        ? `Concerne le dossier : ${subjectStr}\n`
        : `Betreft dossier: ${subjectStr}\n`
    }
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  const userAgent = h.get('user-agent') ?? null

  // Tag de boodschap zodat JP weet dat ze uit het portaal komt
  const taggedMessage =
    `[${isFR ? 'Message via espace client' : 'Bericht via klantenportaal'}]\n` +
    (commissionContext ? `${commissionContext}\n` : '\n') +
    message

  const { error: insErr } = await admin.from('contact_messages').insert({
    name,
    email: user.email,
    phone: phone || null,
    message: taggedMessage,
    locale,
    ip,
    user_agent: userAgent,
  })

  if (insErr) {
    console.error('Portail message insert failed', insErr)
    return {
      status: 'error',
      message: isFR ? 'Erreur serveur.' : 'Serverfout.',
    }
  }

  // Notificatie naar JP — replyTo = klant zodat JP gewoon kan antwoorden
  try {
    const subject = isFR
      ? `Nouveau message via l'espace client — ${name}`
      : `Nieuw bericht via het klantenportaal — ${name}`

    const html = await render(
      NewContactMessage({
        name,
        email: user.email,
        phone,
        message: taggedMessage,
        locale,
        attachments: [],
        ip,
        submittedAt: new Date(),
      })
    )

    const fallbackText = [
      isFR ? `Nom: ${name}` : `Naam: ${name}`,
      `Email: ${user.email}`,
      phone ? (isFR ? `Téléphone: ${phone}` : `Telefoon: ${phone}`) : '',
      '',
      taggedMessage,
    ]
      .filter(Boolean)
      .join('\n')

    await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html,
      text: fallbackText,
      replyTo: user.email,
    })
  } catch (err) {
    console.error('Portail message notification failed', err)
  }

  revalidatePath('/portail/compte')
  return { status: 'success' }
}
