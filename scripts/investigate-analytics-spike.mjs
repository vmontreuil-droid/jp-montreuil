// Onderzoek de analytics-spike: per dag tellen, en kijk naar top-paths.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('env ontbreekt'); process.exit(1) }

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: events } = await sb
  .from('analytics_events')
  .select('session_id, path, browser, device, created_at, country')
  .order('created_at', { ascending: false })
  .limit(50000)

console.log(`Totaal events opgehaald: ${events?.length ?? 0}\n`)

// Per dag
const perDay = new Map()
for (const e of events ?? []) {
  const day = e.created_at.slice(0, 10)
  if (!perDay.has(day)) perDay.set(day, { events: 0, sessions: new Set() })
  perDay.get(day).events++
  perDay.get(day).sessions.add(e.session_id)
}
const days = [...perDay.entries()].sort()
console.log('Events + unieke sessies per dag:')
for (const [day, d] of days) {
  console.log(`  ${day}: ${String(d.events).padStart(4)} events, ${String(d.sessions.size).padStart(4)} unieke sessions`)
}

// Top countries
const perCountry = new Map()
for (const e of events ?? []) {
  const c = e.country || '(null)'
  perCountry.set(c, (perCountry.get(c) ?? 0) + 1)
}
console.log('\nTop landen:')
for (const [c, n] of [...perCountry].sort((a,b) => b[1]-a[1]).slice(0, 10)) {
  console.log(`  ${c}: ${n}`)
}

// Browser/device breakdown
const browsers = new Map()
for (const e of events ?? []) {
  const k = `${e.browser}/${e.device}`
  browsers.set(k, (browsers.get(k) ?? 0) + 1)
}
console.log('\nBrowser/device breakdown:')
for (const [k, n] of [...browsers].sort((a,b) => b[1]-a[1])) {
  console.log(`  ${k.padEnd(20)} → ${n}`)
}

// Top paths
const paths = new Map()
for (const e of events ?? []) {
  paths.set(e.path, (paths.get(e.path) ?? 0) + 1)
}
console.log('\nTop 15 paths:')
for (const [p, n] of [...paths].sort((a,b) => b[1]-a[1]).slice(0, 15)) {
  console.log(`  ${String(n).padStart(4)} ${p}`)
}

// Sessies met events_count distribution
const sessionCounts = new Map()
for (const e of events ?? []) {
  sessionCounts.set(e.session_id, (sessionCounts.get(e.session_id) ?? 0) + 1)
}
const dist = { '1': 0, '2-3': 0, '4-10': 0, '11-50': 0, '50+': 0 }
for (const c of sessionCounts.values()) {
  if (c === 1) dist['1']++
  else if (c <= 3) dist['2-3']++
  else if (c <= 10) dist['4-10']++
  else if (c <= 50) dist['11-50']++
  else dist['50+']++
}
console.log('\nSession size distributie:')
for (const [k, v] of Object.entries(dist)) {
  console.log(`  ${k.padEnd(8)} events/session: ${v} sessies`)
}

console.log(`\nTotaal unieke sessions: ${sessionCounts.size}`)
