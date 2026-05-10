'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendAbandonedCartReminder } from '@/lib/shop/abandoned-carts'

export async function sendReminderAction(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const r = await sendAbandonedCartReminder(id)
  if (!r.ok) throw new Error(r.error)
  revalidatePath('/admin/boutique/abandoned-carts')
}
