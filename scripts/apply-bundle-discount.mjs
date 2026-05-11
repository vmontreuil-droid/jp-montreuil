// Idempotent seed van de BUNDLE3 kortingscode (-10%).
// Run met: node --env-file=.env.local scripts/apply-bundle-discount.mjs
//
// Equivalent van migration 0030_shop_bundle_discount_seed.sql, maar via
// supabase-js zodat we geen psql nodig hebben. Veilig om meerdere
// keren te draaien — INSERT is `on conflict do nothing` via een
// pre-check en is daardoor idempotent.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY moeten gezet zijn (in .env.local).')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'shop' },
})

async function main() {
  console.log('→ Check of BUNDLE3 al bestaat…')
  const { data: existing, error: selErr } = await supabase
    .from('discount_codes')
    .select('id, code, kind, value, is_active, description')
    .eq('code', 'BUNDLE3')
    .maybeSingle()

  if (selErr) {
    console.error('SELECT-fout:', selErr.message)
    process.exit(1)
  }

  if (existing) {
    console.log('✓ BUNDLE3 bestaat al:')
    console.log('  ', existing)
    console.log('Geen actie nodig.')
    return
  }

  console.log('→ BUNDLE3 ontbreekt, aanmaken…')
  const { data: inserted, error: insErr } = await supabase
    .from('discount_codes')
    .insert({
      code: 'BUNDLE3',
      kind: 'percent',
      value: 10,
      min_subtotal_cents: 0,
      description: 'Set de 3 tirages — 10 % de réduction automatique',
      is_active: true,
    })
    .select()
    .single()

  if (insErr) {
    console.error('INSERT-fout:', insErr.message)
    process.exit(1)
  }

  console.log('✓ BUNDLE3 aangemaakt:')
  console.log('  ', inserted)
}

main()
  .catch((e) => {
    console.error('Onverwachte fout:', e)
    process.exit(1)
  })
