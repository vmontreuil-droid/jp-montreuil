'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ChangePasswordResult =
  | { ok: true }
  | {
      ok: false
      error: 'too_short' | 'mismatch' | 'wrong_current' | 'not_authenticated' | 'server'
    }

export async function changePassword(input: {
  current: string
  next: string
  confirm: string
}): Promise<ChangePasswordResult> {
  if (input.next.length < 8) return { ok: false, error: 'too_short' }
  if (input.next !== input.confirm) return { ok: false, error: 'mismatch' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return { ok: false, error: 'not_authenticated' }

  // Re-auth with current password to verify
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.current,
  })
  if (signInErr) {
    return { ok: false, error: 'wrong_current' }
  }

  const { error } = await supabase.auth.updateUser({ password: input.next })
  if (error) {
    console.error('[compte/changePassword] error:', error.message)
    return { ok: false, error: 'server' }
  }

  revalidatePath('/portail/compte')
  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/portail/login')
}
