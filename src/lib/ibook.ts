import { createClient } from '@/lib/supabase/server'

export { ibookUrl } from './ibook-url'

export type Ibook = {
  id: string
  title_fr: string
  title_nl: string
  description_fr: string
  description_nl: string
  cover_path: string | null
  qr_path: string | null
  pdf_path: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Lijst van actieve ibooks voor publieke pagina's. */
export async function getActiveIbooks(): Promise<Ibook[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ibooks')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<Ibook[]>()
  return (data ?? []).filter((b) => b.pdf_path)
}

/** Volledige lijst voor admin (incl. inactieve). */
export async function getAllIbooks(): Promise<Ibook[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ibooks')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<Ibook[]>()
  return data ?? []
}

export async function getIbookById(id: string): Promise<Ibook | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ibooks')
    .select('*')
    .eq('id', id)
    .single<Ibook>()
  return data ?? null
}
