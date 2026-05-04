import { DEFAULT_PRICING, type Pricing } from './atelier-config'
import { createAdminClient } from './supabase/admin'

type PricingRow = {
  format_40x60: number
  format_57x77: number
  format_60x90: number
  format_130x160: number
  frame_simple: number
  frame_standard: number
  frame_travaille: number
  frame_sur_mesure: number | null
  supplement_background: number
  supplement_complex_decor: number
  supplement_high_detail: number
  supplement_hyperrealism: number
  supplement_rush: number
  extra_portrait: number
}

function rowToPricing(row: PricingRow): Pricing {
  return {
    format: {
      '40x60': Number(row.format_40x60),
      '57x77': Number(row.format_57x77),
      '60x90': Number(row.format_60x90),
      '130x160': Number(row.format_130x160),
    },
    frame: {
      simple: Number(row.frame_simple),
      standard: Number(row.frame_standard),
      travaille: Number(row.frame_travaille),
      sur_mesure: row.frame_sur_mesure == null ? null : Number(row.frame_sur_mesure),
    },
    supplement: {
      background: Number(row.supplement_background),
      complex_decor: Number(row.supplement_complex_decor),
      high_detail: Number(row.supplement_high_detail),
      hyperrealism: Number(row.supplement_hyperrealism),
      rush: Number(row.supplement_rush),
    },
    extraPortrait: Number(row.extra_portrait),
  }
}

/**
 * Laad de actuele prijslijst uit de DB. Gebruikt service-role
 * (publieke read-policy bestaat ook, maar zo werkt het altijd).
 * Valt terug op DEFAULT_PRICING als de tabel leeg is of de fetch faalt.
 */
export async function loadPricing(): Promise<Pricing> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('commission_pricing')
      .select(
        'format_40x60, format_57x77, format_60x90, format_130x160,' +
          ' frame_simple, frame_standard, frame_travaille, frame_sur_mesure,' +
          ' supplement_background, supplement_complex_decor, supplement_high_detail,' +
          ' supplement_hyperrealism, supplement_rush, extra_portrait'
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
