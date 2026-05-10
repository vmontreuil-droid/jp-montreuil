'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createGiftCard, deleteGiftCard } from '@/lib/shop/gift-cards'

export async function createGiftCardAction(form: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const initialEur = Number(form.get('initial_eur') ?? 0)
  if (initialEur <= 0) throw new Error('Montant invalide')

  await createGiftCard({
    initial_eur: initialEur,
    recipient_email: String(form.get('recipient_email') ?? '').trim() || null,
    recipient_name: String(form.get('recipient_name') ?? '').trim() || null,
    message: String(form.get('message') ?? '').trim() || null,
    expires_at: String(form.get('expires_at') ?? '').trim()
      ? new Date(String(form.get('expires_at')) + 'T23:59:59Z').toISOString()
      : null,
    created_by: user.email ?? null,
  })

  revalidatePath('/admin/boutique/gift-cards')
}

export async function deleteGiftCardAction(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await deleteGiftCard(id)
  revalidatePath('/admin/boutique/gift-cards')
}
