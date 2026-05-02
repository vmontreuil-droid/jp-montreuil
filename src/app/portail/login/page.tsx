import { getDictionary } from '@/i18n/dictionaries'
import { getPortailLocale } from '../locale'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function PortailLoginPage() {
  const locale = await getPortailLocale()
  const t = getDictionary(locale)

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <LoginForm t={t.portail} />
    </div>
  )
}
