'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  setReviewStatus,
  updateReviewContent,
  type ReviewStatus,
} from '@/lib/shop/reviews'

export async function setReviewStatusAction(id: string, status: ReviewStatus): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await setReviewStatus(id, status, user?.id)
  revalidatePath('/admin/boutique/reviews')
  revalidatePath('/shop/boutique', 'layout')
}

/**
 * Bewerk een review (titel, body, gekoppelde foto). FormData-gebaseerd
 * zodat we het zonder JS-handler vanuit een progressive-enhancement
 * <form> kunnen aanroepen.
 *
 * Velden:
 *   - id          (verplicht, hidden)
 *   - title       (lege string → null)
 *   - body        (lege string → null)
 *   - photo_id    (uuid)
 */
export async function updateReviewAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const titleRaw = formData.get('title')
  const bodyRaw = formData.get('body')
  const photoIdRaw = formData.get('photo_id')

  const patch: { title?: string | null; body?: string | null; photo_id?: string } = {}
  if (titleRaw !== null) {
    const v = String(titleRaw).trim()
    patch.title = v.length > 0 ? v : null
  }
  if (bodyRaw !== null) {
    const v = String(bodyRaw).trim()
    patch.body = v.length > 0 ? v : null
  }
  if (photoIdRaw !== null) {
    const v = String(photoIdRaw).trim()
    if (v.length > 0) patch.photo_id = v
  }

  await updateReviewContent(id, patch)
  revalidatePath('/admin/boutique/reviews')
  revalidatePath('/shop/boutique', 'layout')
  revalidatePath('/(locale)/avis', 'page')
}
