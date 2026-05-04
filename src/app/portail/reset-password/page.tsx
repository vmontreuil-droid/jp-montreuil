import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/i18n/dictionaries'
import { getPortailLocale } from '../locale'
import ResetForm from './ResetForm'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    // Geen geldige sessie — redirect naar login
    redirect('/portail/login?err=not_authenticated')
  }

  const locale = await getPortailLocale()
  const t = getDictionary(locale)

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <ResetForm t={t.portail} />
    </div>
  )
}
