import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

const RETENTION_DAYS = 90

/**
 * Vercel Cron route — wordt dagelijks aangeroepen.
 * Hard-delete'd analytics_events ouder dan RETENTION_DAYS. Voorkomt
 * onbeperkte tabel-groei (geen soft-delete nodig — events zijn anonyme
 * aggregatie-data).
 *
 * Beveiligd via CRON_SECRET (zelfde patroon als purge-trashed-messages).
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const admin = createAdminClient()

  // Hoeveel rows worden verwijderd? Tellen vooraf voor de telemetry.
  const { count, error: countErr } = await admin
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', cutoff)

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 })
  }

  if (!count || count === 0) {
    return NextResponse.json({ ok: true, purged: 0, cutoff })
  }

  const { error: delErr } = await admin
    .from('analytics_events')
    .delete()
    .lt('created_at', cutoff)

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, purged: count, cutoff })
}
