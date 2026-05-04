'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/admin/login')
}

export async function toggleDevisExample(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') || '')
  const newValue = formData.get('value') === 'true'
  if (!id) return
  const admin = createAdminClient()
  await admin.from('works').update({ is_devis_example: newValue }).eq('id', id)
  revalidatePath('/admin/commissions/devis-examples')
  revalidatePath('/[locale]/devis', 'page')
}
