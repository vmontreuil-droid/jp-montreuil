// Quick check: pingen we Resend met de geconfigureerde API key?
// Gebruikt de domains-list endpoint (geen mail wordt gestuurd).
//
// Run met: node --env-file=.env.local scripts/check-resend.mjs

import { Resend } from 'resend'

const key = process.env.RESEND_API_KEY
const from = process.env.RESEND_FROM_EMAIL
const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
const replyTo = process.env.RESEND_REPLY_TO

console.log('── Resend env-config ──')
console.log('  RESEND_API_KEY     :', key ? `set (${key.length} chars)` : '⚠ ONTBREEKT')
console.log('  RESEND_FROM_EMAIL  :', from ?? '⚠ ontbreekt → fallback "Atelier Montreuil <onboarding@resend.dev>"')
console.log('  ADMIN_NOTIFY_EMAIL :', adminEmail ?? '⚠ ontbreekt → fallback "jp@montreuil.be"')
console.log('  RESEND_REPLY_TO    :', replyTo ?? '⚠ ontbreekt → fallback "jp@montreuil.be"')
console.log()

if (!key) {
  console.error('Geen API-key — kan niet pingen.')
  process.exit(1)
}

console.log('→ Pingen Resend (domains-list)…')
const resend = new Resend(key)
try {
  const { data, error } = await resend.domains.list()
  if (error) {
    console.error('✗ Resend antwoordde met fout:', error)
    process.exit(1)
  }
  console.log('✓ Resend bereikbaar.')
  console.log('  Geverifieerde domeinen:')
  for (const d of data?.data ?? []) {
    console.log(`   - ${d.name} (status: ${d.status}, region: ${d.region})`)
  }
  if (!data?.data || data.data.length === 0) {
    console.log('   (geen — je gebruikt waarschijnlijk de default onboarding@resend.dev)')
  }
} catch (e) {
  console.error('✗ Onverwachte fout:', e)
  process.exit(1)
}
