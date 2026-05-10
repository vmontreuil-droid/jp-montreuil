'use server'

import { revalidatePath } from 'next/cache'
import {
  sendSupplierOrderEmail,
  setSupplierOrderStatus,
  reassignSupplier,
  updateSupplierOrderNotes,
  type SupplierOrderStatus,
} from '@/lib/shop/supplier-orders'

export async function sendToSupplierAction(id: string): Promise<void> {
  const r = await sendSupplierOrderEmail(id)
  if (!r.ok) throw new Error(r.error)
  revalidatePath(`/admin/boutique/production/${id}`)
  revalidatePath('/admin/boutique/production')
}

export async function changeStatusAction(
  id: string,
  status: SupplierOrderStatus,
  externalRef?: string | null,
): Promise<void> {
  await setSupplierOrderStatus(id, status, externalRef ?? undefined)
  revalidatePath(`/admin/boutique/production/${id}`)
  revalidatePath('/admin/boutique/production')
}

export async function reassignSupplierAction(id: string, form: FormData): Promise<void> {
  const supplierId = String(form.get('supplier_id') ?? '').trim() || null
  await reassignSupplier(id, supplierId)
  revalidatePath(`/admin/boutique/production/${id}`)
}

export async function updateNotesAction(id: string, form: FormData): Promise<void> {
  const notes = String(form.get('notes') ?? '').trim() || null
  await updateSupplierOrderNotes(id, notes)
  revalidatePath(`/admin/boutique/production/${id}`)
}

export async function setExternalRefAction(id: string, form: FormData): Promise<void> {
  const ref = String(form.get('external_ref') ?? '').trim() || null
  // Hergebruik setSupplierOrderStatus met huidige status — niet ideaal
  // maar voorkomt aparte helper voor één veld. Beter: dedicated update.
  const { createShopAdminClient } = await import('@/lib/shop/supabase')
  const sb = createShopAdminClient()
  const { error } = await sb.from('supplier_orders').update({ external_ref: ref }).eq('id', id)
  if (error) throw error
  revalidatePath(`/admin/boutique/production/${id}`)
}
