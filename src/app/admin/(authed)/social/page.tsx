import { Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import SocialForm from './SocialForm'

export const dynamic = 'force-dynamic'

export const DEFAULT_FACEBOOK = 'https://www.facebook.com/jeanpierre.montreuil.3'

export default async function SocialAdminPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('site_texts')
    .select('key, value_fr')
    .in('key', ['social_facebook', 'social_instagram'])

  const map = new Map((data ?? []).map((r) => [r.key, r.value_fr]))
  const facebook = map.get('social_facebook') ?? DEFAULT_FACEBOOK
  const instagram = map.get('social_instagram') ?? ''

  return (
    <div className="p-8 md:p-12 max-w-2xl">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Réseaux sociaux
        </h1>
        <p className="mt-2 text-sm text-(--color-stone)">
          Liens affichés sur la page /social. Vide = pas affiché.
        </p>
      </header>

      <SocialForm facebook={facebook} instagram={instagram} />

      <p className="mt-8 text-xs text-(--color-stone)">
        WhatsApp utilise le numéro de téléphone configuré dans le dictionnaire (centralisé pour
        contact + footer + WhatsApp).
      </p>
    </div>
  )
}
