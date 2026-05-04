import { DEFAULT_PRICING, type Pricing } from './atelier-config'
import { createAdminClient } from './supabase/admin'

type PricingRow = {
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
}

function rowToPricing(row: PricingRow): Pricing {
  return {
    format: {
      '40x60': Number(row.format_40x60),
      '57x77': Number(row.format_57x77),
      '60x90': Number(row.format_60x90),
      '130x160': Number(row.format_130x160),
    },
    frameByFormat: {
      '40x60': Number(row.frame_40x60),
      '57x77': Number(row.frame_57x77),
      '60x90': Number(row.frame_60x90),
      '130x160': Number(row.frame_130x160),
    },
    supplement: {
      background: Number(row.supplement_background),
      complex_decor: Number(row.supplement_complex_decor),
      high_detail: Number(row.supplement_high_detail),
      hyperrealism: Number(row.supplement_hyperrealism),
    },
    extraPortrait: Number(row.extra_portrait),
    defaultVatRate: Number(row.default_vat_rate ?? 0),
  }
}

/**
 * Laad de actuele prijslijst uit de DB. Valt terug op DEFAULT_PRICING als
 * de tabel leeg is of de fetch faalt.
 */
export async function loadPricing(): Promise<Pricing> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('commission_pricing')
      .select(
        'format_40x60, format_57x77, format_60x90, format_130x160,' +
          ' frame_40x60, frame_57x77, frame_60x90, frame_130x160,' +
          ' supplement_background, supplement_complex_decor, supplement_high_detail,' +
          ' supplement_hyperrealism, extra_portrait, default_vat_rate'
      )
      .eq('id', 1)
      .single<PricingRow>()
    if (error || !data) return DEFAULT_PRICING
    return rowToPricing(data)
  } catch (err) {
    console.error('loadPricing failed, falling back to defaults', err)
    return DEFAULT_PRICING
  }
}
