'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { setGdprStatus, eraseCustomerData, type GdprRequestStatus } from '@/lib/gdpr'

export async function setStatusAction(
  id: string,
  status: GdprRequestStatus,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await setGdprStatus(id, status, undefined, user.id)
  revalidatePath('/admin/gdpr')
}

export async function eraseCustomerAction(form: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const email = String(form.get('email') ?? '').trim()
  if (!email) return
  if (
    !email.includes('@') ||
    // Server-side prompt voor zekerheid: alleen runnen als email goed lijkt
    email.length < 5
  ) return
  await eraseCustomerData(email)
  revalidatePath('/admin/gdpr')
}
