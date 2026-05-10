'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SaveProfileResult = { ok: true } | { ok: false; error: string }

export async function saveAdminProfile(input: {
  display_name: string
  avatar_url: string
}): Promise<SaveProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: input.display_name.trim() || null,
      avatar_url: input.avatar_url.trim() || null,
    })
    .eq('id', user.id)

  if (error) {
    console.error('[admin/account] saveProfile failed:', error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/account')
  return { ok: true }
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: 'too_short' | 'mismatch' | 'wrong_current' | 'server' | 'not_authenticated' }

export async function changeAdminPassword(input: {
  current: string
  next: string
  confirm: string
}): Promise<ChangePasswordResult> {
  if (input.next.length < 8) return { ok: false, error: 'too_short' }
  if (input.next !== input.confirm) return { ok: false, error: 'mismatch' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { ok: false, error: 'not_authenticated' }

  // Re-auth: tijdelijke validatie van het huidige password
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.current,
  })
  if (signInErr) return { ok: false, error: 'wrong_current' }

  const { error } = await supabase.auth.updateUser({ password: input.next })
  if (error) {
    console.error('[admin/account] updatePassword failed:', error.message)
    return { ok: false, error: 'server' }
  }

  revalidatePath('/admin/account')
  return { ok: true }
}
