import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/i18n/dictionaries'
import { getPortailLocale } from '../locale'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ next?: string; err?: string; error?: string }>
}

function safeNextPath(raw: string | undefined): string | null {
  if (!raw) return null
  // Alleen interne paden toelaten (geen open redirect)
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

export default async function PortailLoginPage({ searchParams }: Props) {
  const sp = await searchParams
  const nextParam = safeNextPath(sp.next)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Reeds ingelogd én geen err-flag (zoals wrong_account) → meteen door
  const errFlag = sp.err || sp.error
  if (user && !errFlag) {
    redirect(nextParam ?? '/portail')
  }

  const locale = await getPortailLocale()
  const t = getDictionary(locale)

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <LoginForm t={t.portail} />
    </div>
  )
}
