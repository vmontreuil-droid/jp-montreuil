// Smoke-test voor de share_links feature.
// 1. Insert een test-row
// 2. Lookup
// 3. Cleanup
//
// Run: cd jp-montreuil && node --env-file=.env.local scripts/test-share-links.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('env ontbreekt'); process.exit(1) }

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'shop' },
})

const code = 'test' + Math.random().toString(36).slice(2, 6)
const params = { material: 'canvas', size: 'm', orientation: 'portrait' }

console.log(`→ Insert test-code "${code}"…`)
const { data: ins, error: insErr } = await sb
  .from('share_links')
  .insert({ code, photo_slug: 'test-slug', params })
  .select()
  .single()
if (insErr) { console.error('✗ insert:', insErr); process.exit(1) }
console.log('  ✓ aangemaakt:', { id: ins.id, code: ins.code })

console.log(`→ Lookup "${code}"…`)
const { data: look, error: lookErr } = await sb
  .from('share_links')
  .select('photo_slug, params, uses_count')
  .eq('code', code)
  .maybeSingle()
if (lookErr || !look) { console.error('✗ lookup:', lookErr); process.exit(1) }
console.log('  ✓ gevonden:', look)

console.log(`→ Cleanup test-code…`)
await sb.from('share_links').delete().eq('code', code)
console.log('  ✓ verwijderd')

console.log()
console.log('Alles OK — share-codes feature is werkend.')
