'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createShopAdminClient } from '@/lib/shop/supabase'
import type { OrderStatus } from '@/lib/shop/orders'

async function requireAdmin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Niet geauthenticeerd')
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const update: Record<string, unknown> = { status }
  if (status === 'paid') update.paid_at = new Date().toISOString()
  const { error } = await sb.from('orders').update(update).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/boutique/orders')
  revalidatePath(`/admin/boutique/orders/${id}`)
}

export async function setTracking(id: string, formData: FormData) {
  await requireAdmin()
  const sb = createShopAdminClient()
  const carrier = String(formData.get('carrier') ?? '').trim() || null
  const number = String(formData.get('number') ?? '').trim() || null
  const { error } = await sb.from('orders').update({
    tracking_carrier: carrier,
    tracking_number: number,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/boutique/orders/${id}`)
}
