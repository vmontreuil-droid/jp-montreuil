import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listSubscribers } from '@/lib/newsletter'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

  const subs = await listSubscribers()

  const rows: string[][] = [
    ['email', 'locale', 'subscribed_at', 'unsubscribed_at'],
    ...subs.map((s) => [
      s.email,
      s.locale,
      s.subscribed_at,
      s.unsubscribed_at ?? '',
    ]),
  ]
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const filename = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse('﻿' + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

function esc(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}
