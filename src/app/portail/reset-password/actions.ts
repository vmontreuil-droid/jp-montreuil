'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type UpdatePasswordResult =
  | { ok: true }
  | {
      ok: false
      error:
        | 'too_short'
        | 'mismatch'
        | 'not_authenticated'
        | 'rate_limited'
        | 'server'
    }

export async function updatePasswordAction(input: {
  password: string
  confirm: string
}): Promise<UpdatePasswordResult> {
  const password = input.password ?? ''
  const confirm = input.confirm ?? ''

  if (password.length < 8) return { ok: false, error: 'too_short' }
  if (password !== confirm) return { ok: false, error: 'mismatch' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    if (error.status === 429) return { ok: false, error: 'rate_limited' }
    console.error('[reset/update] error:', error.message)
    return { ok: false, error: 'server' }
  }

  return { ok: true }
}

export async function updatePasswordAndRedirect(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  const result = await updatePasswordAction({ password, confirm })
  if (!result.ok) {
    redirect(`/portail/reset-password?err=${result.error}`)
  }
  redirect('/portail?welcome=1')
}
