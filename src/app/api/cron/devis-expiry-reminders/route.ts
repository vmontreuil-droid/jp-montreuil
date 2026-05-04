import { NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email/client'
import { DevisExpiringReminder } from '@/lib/email/templates/DevisExpiringReminder'
import { PUBLIC_BASE_URL } from '@/lib/public-url'
import { localePath } from '@/lib/links'

export const runtime = 'nodejs'
export const maxDuration = 60

type Row = {
  id: string
  name: string
  email: string
  locale: 'fr' | 'nl'
  devis_subject: string | null
  devis_total_eur: number | null
  devis_acompte_eur: number | null
  devis_valid_until: string
  signature_token: string | null
}

/**
 * Vercel Cron — dagelijks. Stuurt 1 dag voor het vervallen van een devis een
 * vriendelijke herinneringsmail. Werkt met een 24h-window om te garanderen
 * dat elke devis exact één reminder krijgt, zelfs als de cron eens hapert.
 *
 * Selectie:
 *   - devis_sent_at niet null
 *   - signed_at, acompte_received_at en devis_reminder_sent_at zijn null
 *   - devis_valid_until ligt tussen NOW + 24h en NOW + 48h
 *
 * Beveiligd via CRON_SECRET, identiek aan andere cron-routes.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const min = new Date(now + 24 * 60 * 60 * 1000).toISOString()
  const max = new Date(now + 48 * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('commission_requests')
    .select(
      'id, name, email, locale, devis_subject, devis_total_eur, devis_acompte_eur, devis_valid_until, signature_token'
    )
    .not('devis_sent_at', 'is', null)
    .is('signed_at', null)
    .is('acompte_received_at', null)
    .is('devis_reminder_sent_at', null)
    .not('devis_valid_until', 'is', null)
    .gte('devis_valid_until', min)
    .lt('devis_valid_until', max)
    .returns<Row[]>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, window: { min, max } })
  }

  const origin = PUBLIC_BASE_URL.replace(/\/$/, '')
  let sent = 0
  const failed: { id: string; reason: string }[] = []

  for (const row of data) {
    if (!row.signature_token) {
      failed.push({ id: row.id, reason: 'no_signature_token' })
      continue
    }

    try {
      const isFR = row.locale === 'fr'
      const signUrl = `${origin}${localePath(row.locale, `/devis-signature/${row.signature_token}`)}`

      const html = await render(
        DevisExpiringReminder({
          recipientName: row.name,
          locale: row.locale,
          devisSubject: row.devis_subject,
          totalEur: row.devis_total_eur,
          acompteEur: row.devis_acompte_eur,
          validUntil: new Date(row.devis_valid_until),
          signUrl,
          replyEmail: ADMIN_EMAIL,
        })
      )

      const subject = isFR
        ? 'Petit rappel — votre devis expire demain'
        : 'Vriendelijke herinnering — uw offerte vervalt morgen'

      const fallbackText = isFR
        ? `Bonjour ${row.name},\n\nUn petit rappel amical : votre devis expire demain. Pour confirmer votre commande, signez-le en ligne :\n${signUrl}\n\nUne question ? Répondez simplement à cet e-mail — Jean-Pierre vous répondra personnellement.\n\nBien à vous,\nJean-Pierre Montreuil`
        : `Beste ${row.name},\n\nEen vriendelijke herinnering: uw offerte vervalt morgen. Wilt u uw bestelling bevestigen, onderteken hem online:\n${signUrl}\n\nVraag of twijfel? Antwoord gewoon op deze mail — Jean-Pierre antwoordt u persoonlijk.\n\nMet vriendelijke groet,\nJean-Pierre Montreuil`

      const result = await sendEmail({
        to: row.email,
        subject,
        html,
        text: fallbackText,
        replyTo: ADMIN_EMAIL,
      })

      if (!result.ok) {
        failed.push({ id: row.id, reason: 'send_failed' })
        continue
      }

      // Markeer als verstuurd zodat de volgende run hem niet opnieuw pakt
      await admin
        .from('commission_requests')
        .update({ devis_reminder_sent_at: new Date().toISOString() })
        .eq('id', row.id)

      sent++
    } catch (err) {
      console.error('[cron/devis-expiry-reminders] failure for', row.id, err)
      failed.push({ id: row.id, reason: String(err) })
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    candidates: data.length,
    failed,
    window: { min, max },
  })
}
