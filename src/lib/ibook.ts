import { createClient } from '@/lib/supabase/server'

export type IbookConfig = {
  titleFr: string
  titleNl: string
  descriptionFr: string
  descriptionNl: string
  coverPath: string
  qrPath: string
  pdfPath: string
}

const IBOOK_KEYS = [
  'ibook_title',
  'ibook_description',
  'ibook_cover_path',
  'ibook_qr_path',
  'ibook_pdf_path',
] as const

export async function getIbookConfig(): Promise<IbookConfig> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('site_texts')
    .select('key, value_fr, value_nl')
    .in('key', IBOOK_KEYS as unknown as string[])

  const map = new Map((data ?? []).map((r) => [r.key as string, r]))
  const get = (k: string, lng: 'fr' | 'nl' = 'fr') =>
    (lng === 'fr' ? map.get(k)?.value_fr : map.get(k)?.value_nl) ?? ''

  return {
    titleFr: get('ibook_title', 'fr'),
    titleNl: get('ibook_title', 'nl'),
    descriptionFr: get('ibook_description', 'fr'),
    descriptionNl: get('ibook_description', 'nl'),
    coverPath: get('ibook_cover_path'),
    qrPath: get('ibook_qr_path'),
    pdfPath: get('ibook_pdf_path'),
  }
}

/** Publieke URL voor een ibook-bestand uit de bucket. */
export function ibookUrl(storagePath: string): string {
  if (!storagePath) return ''
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return ''
  return `${base}/storage/v1/object/public/ibook/${storagePath}`
}
