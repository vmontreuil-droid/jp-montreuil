import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PRICING } from '@/lib/atelier-config'
import PricingForm from './PricingForm'

export const dynamic = 'force-dynamic'

type Row = {
  format_40x60: number
  format_57x77: number
  format_60x90: number
  format_130x160: number
  frame_40x60: number
  frame_57x77: number
  frame_60x90: number
  frame_130x160: number
  supplement_background: number
  supplement_complex_decor: number
  supplement_high_detail: number
  supplement_hyperrealism: number
  extra_portrait: number
  default_vat_rate: number | null
  updated_at: string
}

export default async function PricingPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('commission_pricing')
    .select(
      'format_40x60, format_57x77, format_60x90, format_130x160,' +
        ' frame_40x60, frame_57x77, frame_60x90, frame_130x160,' +
        ' supplement_background, supplement_complex_decor, supplement_high_detail,' +
        ' supplement_hyperrealism, extra_portrait, default_vat_rate, updated_at'
    )
    .eq('id', 1)
    .maybeSingle<Row>()

  // Fallback naar defaults als rij nog niet bestaat
  const defaults = data
    ? { ...data, default_vat_rate: Number(data.default_vat_rate ?? 0) }
    : {
        format_40x60: DEFAULT_PRICING.format['40x60'],
        format_57x77: DEFAULT_PRICING.format['57x77'],
        format_60x90: DEFAULT_PRICING.format['60x90'],
        format_130x160: DEFAULT_PRICING.format['130x160'],
        frame_40x60: DEFAULT_PRICING.frameByFormat['40x60'],
        frame_57x77: DEFAULT_PRICING.frameByFormat['57x77'],
        frame_60x90: DEFAULT_PRICING.frameByFormat['60x90'],
        frame_130x160: DEFAULT_PRICING.frameByFormat['130x160'],
        supplement_background: DEFAULT_PRICING.supplement.background,
        supplement_complex_decor: DEFAULT_PRICING.supplement.complex_decor,
        supplement_high_detail: DEFAULT_PRICING.supplement.high_detail,
        supplement_hyperrealism: DEFAULT_PRICING.supplement.hyperrealism,
        extra_portrait: DEFAULT_PRICING.extraPortrait,
        default_vat_rate: DEFAULT_PRICING.defaultVatRate,
        updated_at: '',
      }

  const updatedStr = defaults.updated_at
    ? new Date(defaults.updated_at).toLocaleString('fr-BE', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : null

  return (
    <div className="p-8 md:p-12 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/admin/commissions"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux demandes
        </Link>
      </div>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Tarifs des commandes
        </h1>
        <p className="mt-2 text-sm text-(--color-charcoal) max-w-xl">
          Ces tarifs alimentent l'estimation en direct sur la page <code>/devis</code>{' '}
          et le récapitulatif dans la fiche d'une demande. Modifiez-les quand
          vous le souhaitez — les changements sont visibles immédiatement.
        </p>
        {updatedStr && (
          <p className="mt-1 text-xs text-(--color-stone)">
            Dernière modification : {updatedStr}
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs text-red-400">
            Avertissement : table non disponible. Modifiez aussi{' '}
            <code>src/lib/atelier-config.ts</code> pour les valeurs par défaut.
          </p>
        )}
      </header>

      <PricingForm defaults={defaults} />
    </div>
  )
}
