'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { acknowledgeError, deleteErrorRow } from '@/lib/error-log'

export async function acknowledgeErrorAction(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await acknowledgeError(id, user.id)
  revalidatePath('/admin/errors')
}

export async function deleteErrorAction(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await deleteErrorRow(id)
  revalidatePath('/admin/errors')
}
