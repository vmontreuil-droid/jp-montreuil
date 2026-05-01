'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'

export async function updateSocialSettings(formData: FormData) {
  const supabase = await requireAdmin()

  const facebook = String(formData.get('facebook') ?? '').trim()
  const instagram = String(formData.get('instagram') ?? '').trim()

  const rows = [
    {
      key: 'social_facebook',
      value_fr: facebook,
      value_nl: facebook,
      description: 'URL Facebook',
    },
    {
      key: 'social_instagram',
      value_fr: instagram,
      value_nl: instagram,
      description: 'URL Instagram',
    },
  ]

  for (const row of rows) {
    await supabase.from('site_texts').upsert(row, { onConflict: 'key' })
  }

  revalidatePath('/admin/social')
  revalidatePath('/social')
  revalidatePath('/nl/social')
  return { ok: true }
}
