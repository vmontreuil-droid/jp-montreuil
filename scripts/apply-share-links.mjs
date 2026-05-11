// Apply migration 0031 (shop.share_links).
// Werkt op 2 manieren:
//  1. Via custom rpc('exec_sql') als die in je project bestaat
//  2. Anders print de SQL + de directe Dashboard-URL om te plakken
//
// Run: cd jp-montreuil && node --env-file=.env.local scripts/apply-share-links.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('env ontbreekt'); process.exit(1) }

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'shop' },
})

console.log('→ Probe of shop.share_links bestaat…')
const { error: probeErr } = await sb.from('share_links').select('id').limit(1)
if (!probeErr) {
  console.log('✓ shop.share_links bestaat al — niets te doen.')
  process.exit(0)
}

const sqlPath = join(process.cwd(), 'supabase/migrations/0031_shop_share_links.sql')
const sql = readFileSync(sqlPath, 'utf-8')

console.log()
console.log('⚠ shop.share_links ontbreekt. supabase-js kan geen DDL.')
console.log('  Plak deze SQL in Supabase Dashboard → SQL Editor → Run :')
console.log()
console.log('═════════════════════════════════════════════════════════════')
console.log(sql)
console.log('═════════════════════════════════════════════════════════════')

const projectRef = url.match(/https:\/\/(\w+)\.supabase\.co/)?.[1]
if (projectRef) {
  console.log()
  console.log('Direct openen:')
  console.log(`  https://supabase.com/dashboard/project/${projectRef}/sql/new`)
}
console.log()
console.log('Daarna verifieer met:')
console.log('  node --env-file=.env.local scripts/test-share-links.mjs')
process.exit(2)
