'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { setReviewStatus, type ReviewStatus } from '@/lib/shop/reviews'

export async function setReviewStatusAction(id: string, status: ReviewStatus): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await setReviewStatus(id, status, user?.id)
  revalidatePath('/admin/boutique/reviews')
  revalidatePath('/shop/boutique', 'layout')
}
