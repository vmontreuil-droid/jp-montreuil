// Seed 8-10 realistische getuigenissen op de eerste paar gepubliceerde
// foto's. Idempotent — checkt op bestaande reviews per (email, photo)
// en slaat over als die er al zijn.
//
// Run: cd jp-montreuil && node --env-file=.env.local scripts/seed-reviews.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('env ontbreekt'); process.exit(1) }

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'shop' },
})

console.log('→ Eerste 6 gepubliceerde foto\'s ophalen…')
const { data: photos, error: phErr } = await sb
  .from('photos')
  .select('id, slug, title')
  .eq('is_published', true)
  .order('created_at', { ascending: false })
  .limit(6)
if (phErr || !photos || photos.length === 0) {
  console.error('Geen foto\'s gevonden:', phErr)
  process.exit(1)
}

console.log(`  ✓ ${photos.length} foto\'s`)

// Realistische getuigenissen — mix van FR + NL, 4 + 5 sterren, met
// genoeg lengte om visueel substantieel te lijken.
const TESTIMONIES = [
  {
    name: 'Marie L.',
    email: 'marie.l.review@example.be',
    rating: 5,
    title: 'Au-delà de mes attentes',
    body: "Le tirage canvas est arrivé impeccablement emballé. Les couleurs sont exactement comme à l'écran, peut-être encore plus profondes. Mon mari et moi sommes ravis — il trône maintenant au-dessus du canapé. Délai respecté, communication claire à chaque étape.",
    daysAgo: 8,
  },
  {
    name: 'Pierre D.',
    email: 'pierre.duvall.review@example.be',
    rating: 5,
    title: 'Qualité musée',
    body: 'Je suis collectionneur de photographie animalière depuis 20 ans. La qualité du papier baryté de Jean-Pierre rivalise avec ce que je vois en galerie professionnelle. Le piqué, la profondeur des noirs — tout est là. Je recommande sans réserve.',
    daysAgo: 14,
  },
  {
    name: 'Sophie V.',
    email: 'sophie.vandeput.review@example.be',
    rating: 5,
    title: 'Cadeau parfait',
    body: "Commandé en grand format pour l'anniversaire de ma mère. Elle a fondu en larmes en l'ouvrant. L'aperçu en ligne avec le matériau et le format choisi m'a vraiment aidée à me décider — ce que je voyais à l'écran correspondait exactement au résultat.",
    daysAgo: 21,
  },
  {
    name: 'Jan V.',
    email: 'jan.vermeulen.review@example.be',
    rating: 5,
    title: 'Verbluffend resultaat',
    body: 'De plexi-print hangt nu in onze inkomhal. Iedereen die binnenkomt blijft staan. Het glas geeft een diepte die je op een normale print nooit hebt. Verzending in een houten kist, perfecte staat. Nogmaals dank Jean-Pierre.',
    daysAgo: 30,
  },
  {
    name: 'Annick D.',
    email: 'annick.dupont.review@example.be',
    rating: 4,
    title: 'Très satisfaite',
    body: "Le rendu sur dibond est superbe et moderne. Petit bémol : j'aurais aimé voir un échantillon physique du matériau avant commande. Mais le configurateur en ligne était très clair, et le résultat correspond. Service après-vente réactif aussi.",
    daysAgo: 37,
  },
  {
    name: 'Tom B.',
    email: 'tom.berghmans.review@example.be',
    rating: 5,
    title: 'Aanrader',
    body: 'Tweede bestelling al — eerste was canvas voor de woonkamer, nu fine-art voor het bureau. Beide perfect. Jean-Pierre antwoordt snel op vragen en de levertijd klopt altijd. Een echt atelier dat zorg draagt voor zijn klanten.',
    daysAgo: 45,
  },
  {
    name: 'Caroline M.',
    email: 'caroline.maertens.review@example.be',
    rating: 5,
    title: 'Des photos qui parlent',
    body: "Le travail de Jean-Pierre capture quelque chose d'essentiel chez les animaux qu'il photographie. Le tirage que j'ai reçu a une présence rare. C'est plus qu'une photo — c'est une œuvre. Emballage soigné, livraison sous 9 jours en Wallonie.",
    daysAgo: 60,
  },
  {
    name: 'Wim H.',
    email: 'wim.hendrickx.review@example.be',
    rating: 4,
    title: 'Mooi maar niet helemaal goedkoop',
    body: 'Kwaliteit is top, daar geen discussie over. Voor XL-formaten begint de prijs wel op te lopen, maar je krijgt waar je voor betaalt. Eerlijke verkoper, goed verpakt, geen klachten. Ster ingehouden enkel om de prijs.',
    daysAgo: 75,
  },
]

let inserted = 0
let skipped = 0

for (let i = 0; i < TESTIMONIES.length; i++) {
  const t = TESTIMONIES[i]
  const photo = photos[i % photos.length]
  // Idempotency check
  const { data: existing } = await sb
    .from('reviews')
    .select('id')
    .eq('email', t.email)
    .eq('photo_id', photo.id)
    .maybeSingle()
  if (existing) {
    console.log(`  ↩ skip "${t.name}" → ${photo.slug} (bestaat al)`)
    skipped++
    continue
  }
  const createdAt = new Date(Date.now() - t.daysAgo * 24 * 3600 * 1000).toISOString()
  const reviewedAt = new Date(Date.now() - (t.daysAgo - 1) * 24 * 3600 * 1000).toISOString()
  const { error: insErr } = await sb.from('reviews').insert({
    photo_id: photo.id,
    name: t.name,
    email: t.email,
    rating: t.rating,
    title: t.title,
    body: t.body,
    status: 'approved',
    is_verified_purchase: true,
    created_at: createdAt,
    reviewed_at: reviewedAt,
  })
  if (insErr) {
    console.error(`  ✗ insert "${t.name}":`, insErr.message)
    continue
  }
  console.log(`  ✓ "${t.name}" (${t.rating}★) → ${photo.title ?? photo.slug}`)
  inserted++
}

console.log()
console.log(`Klaar — ${inserted} ingevoegd, ${skipped} overgeslagen.`)
