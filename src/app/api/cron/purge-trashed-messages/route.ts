import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

const RETENTION_DAYS = 30

/**
 * Vercel Cron route — wordt dagelijks aangeroepen.
 * Hard-delete'd contact_messages waarvan deleted_at > RETENTION_DAYS oud is,
 * inclusief opruimen van bijhorende bestanden uit storage.
 *
 * Beveiligd: Vercel Cron stuurt automatisch een Authorization header met
 * `Bearer ${CRON_SECRET}`. Op die secret matchen we, anders 401.
 */
export async function GET(request: Request) {
  // Vercel Cron auth
  const auth = request.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const admin = createAdminClient()

  // Pak alle messages die over de retention zijn
  const { data: stale, error: fetchErr } = await admin
    .from('contact_messages')
    .select('id, contact_attachments(storage_path)')
    .not('deleted_at', 'is', null)
    .lte('deleted_at', cutoff)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!stale || stale.length === 0) {
    return NextResponse.json({ ok: true, purged: 0, files_removed: 0 })
  }

  // Verzamel alle storage-paths voor batch-delete
  const allPaths: string[] = []
  for (const msg of stale) {
    const atts = msg.contact_attachments as { storage_path: string }[] | null
    if (atts) for (const a of atts) allPaths.push(a.storage_path)
  }

  // Storage cleanup (batch)
  if (allPaths.length > 0) {
    await admin.storage.from('contact-attachments').remove(allPaths)
  }

  // Hard delete (cascade dropt attachment-rijen)
  const ids = stale.map((m) => m.id)
  const { error: delErr } = await admin
    .from('contact_messages')
    .delete()
    .in('id', ids)

  if (delErr) {
    return NextResponse.json(
      { error: delErr.message, files_removed: allPaths.length },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    purged: ids.length,
    files_removed: allPaths.length,
    cutoff,
  })
}
