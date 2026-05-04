import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toIcsDate(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  // Auth check — alleen admin mag de .ics genereren
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const admin = createAdminClient()
  const { data: req } = await admin
    .from('commission_requests')
    .select(
      'id, name, email, phone, devis_subject, delivery_address, delivery_confirmed_date,' +
        ' delivery_proposed_date, delivery_alt_option, delivery_alt_specs'
    )
    .eq('id', id)
    .single<{
      id: string
      name: string
      email: string
      phone: string | null
      devis_subject: string | null
      delivery_address: string | null
      delivery_confirmed_date: string | null
      delivery_proposed_date: string | null
      delivery_alt_option: string | null
      delivery_alt_specs: string | null
    }>()

  if (!req) return new Response('Not found', { status: 404 })

  const dateStr = req.delivery_confirmed_date || req.delivery_proposed_date
  if (!dateStr) {
    return new Response('No delivery date set', { status: 400 })
  }

  const start = new Date(dateStr)
  const end = new Date(start.getTime() + 30 * 60 * 1000) // 30 min default

  const summary = `Livraison — ${req.name}${req.devis_subject ? ` (${req.devis_subject})` : ''}`

  const descriptionParts: string[] = [
    `Client : ${req.name}`,
    `Email : ${req.email}`,
  ]
  if (req.phone) descriptionParts.push(`Téléphone : ${req.phone}`)
  if (req.delivery_alt_option) {
    const altLabels: Record<string, string> = {
      home: 'Présent à domicile',
      neighbours: 'Remettre aux voisins',
      door: 'Déposer à la porte',
      safe_place: 'Endroit sûr',
      other: 'Autre',
    }
    descriptionParts.push(
      `En cas d'absence : ${altLabels[req.delivery_alt_option] ?? req.delivery_alt_option}${req.delivery_alt_specs ? ` — ${req.delivery_alt_specs}` : ''}`
    )
  }
  const description = descriptionParts.join('\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Atelier Montreuil//Commissions//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:commission-${req.id}@montreuil.be`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    req.delivery_address ? `LOCATION:${escapeIcs(req.delivery_address.replace(/\n/g, ', '))}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs('Livraison ' + req.name + ' dans 1h')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')

  return new Response(lines, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="livraison-${req.id.slice(0, 8)}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
