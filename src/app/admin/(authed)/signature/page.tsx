import { PenTool } from 'lucide-react'
import { PUBLIC_BASE_URL } from '@/lib/public-url'
import SignatureDesigns from './SignatureDesigns'

export const dynamic = 'force-dynamic'

export default function SignatureAdminPage() {
  const logoUrl = `${PUBLIC_BASE_URL.replace(/\/$/, '')}/logo-dark.png`
  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 inline-flex items-center gap-2">
          <PenTool className="w-3.5 h-3.5" />
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Signature mail
        </h1>
        <p className="mt-2 text-sm text-(--color-stone) max-w-2xl">
          Trois designs prêts à l&apos;emploi. Choisis ton préféré, clique sur
          « Sélectionner et copier », puis suis les instructions pour Apple Mail
          (Mac) ou iPhone.
        </p>
      </header>

      <SignatureDesigns
        info={{
          name: 'Jean-Pierre Montreuil',
          roleFr: 'Artiste peintre',
          roleNl: 'Kunstschilder',
          atelier: 'Atelier Montreuil',
          address: 'Heuntjesstraat 6, 8570 Anzegem',
          phone: '+32 475 61 68 38',
          phoneTel: '+32475616838',
          email: 'jp@montreuil.be',
          website: 'montreuil.be',
          websiteUrl: 'https://montreuil.be',
          websiteUrlNl: 'https://montreuil.be/nl',
          facebook: 'https://www.facebook.com/jeanpierre.montreuil.3',
          logoUrl,
          taglineFr: 'Visitez notre site renouvelé',
          taglineNl: 'Bezoek onze vernieuwde website',
        }}
      />
    </div>
  )
}
