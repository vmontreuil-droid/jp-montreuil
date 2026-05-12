// Kuist bot/headless events uit analytics_events.
//
// Reden: e2e-tests (~290 tests × meerdere page_views), Vercel-deploy-checks,
// Lighthouse-audits en monitoring-pings hebben de visitor-cijfers opgeblazen.
//
// Spike-pattern op 2026-05-11:
//   - 956 events / 856 unieke sessions op 1 dag (gewone dagen ~5-30 visitors)
//   - 100% country=null (Vercel-Edge zonder geo-header = e2e/CI traffic)
//   - 767 sessions met 1 event (Playwright open-and-close pattern)
//   - chrome/mobile = 494 (mijn mobile-chrome project-suite)
//
// Strategie: delete alles met country=null op de spike-dag(en). Echte
// bezoekers hebben altijd een country-header van Vercel.
//
// Run: cd jp-montreuil && node --env-file=.env.local scripts/cleanup-bot-analytics.mjs [--dry-run] [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('env ontbreekt'); process.exit(1) }

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fromArg = args.find(a => a.startsWith('--from='))?.slice(7) ?? '2026-05-10'
const toArg   = args.find(a => a.startsWith('--to='))?.slice(5)   ?? '2026-05-12'
const fromIso = `${fromArg}T00:00:00.000Z`
const toIso   = `${toArg}T23:59:59.999Z`

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log(`Range: ${fromIso} → ${toIso}\n`)

// Stap 1: tel wat we gaan verwijderen
const { count: nullCountryCount } = await sb
  .from('analytics_events')
  .select('*', { count: 'exact', head: true })
  .is('country', null)
  .gte('created_at', fromIso)
  .lte('created_at', toIso)

const { count: totalInRange } = await sb
  .from('analytics_events')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', fromIso)
  .lte('created_at', toIso)

const { count: totalAll } = await sb
  .from('analytics_events')
  .select('*', { count: 'exact', head: true })

console.log(`Totaal events in DB:            ${totalAll}`)
console.log(`Events in range:                ${totalInRange}`)
console.log(`└ met country=null (te wissen): ${nullCountryCount}`)
console.log(`└ behouden (echte bezoekers):   ${(totalInRange ?? 0) - (nullCountryCount ?? 0)}`)

if (dryRun) {
  console.log('\n[DRY RUN] geen rows verwijderd. Run zonder --dry-run om uit te voeren.')
  process.exit(0)
}

// Stap 2: delete in batches (Supabase heeft geen RETURNING-count limiet,
// maar we doen het gewoon in 1 query op de filtered set)
console.log('\n→ Delete events met country=null in range…')
const { error, count: deleted } = await sb
  .from('analytics_events')
  .delete({ count: 'exact' })
  .is('country', null)
  .gte('created_at', fromIso)
  .lte('created_at', toIso)

if (error) {
  console.error('  ✗', error.message)
  process.exit(1)
}

console.log(`✓ Verwijderd: ${deleted} events`)

const { count: totalAfter } = await sb
  .from('analytics_events')
  .select('*', { count: 'exact', head: true })
console.log(`\nTotaal events nadien: ${totalAfter}`)
