import Link from 'next/link'
import { UserCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { getDictionary } from '@/i18n/dictionaries'
import { getPortailLocale } from './locale'

export const dynamic = 'force-dynamic'

export default async function PortailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const locale = await getPortailLocale()
  const t = getDictionary(locale)

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} t={t} portailMode />

      {user && (
        <div className="border-b border-(--color-frame) bg-(--color-paper)/60">
          <div className="max-w-5xl mx-auto px-6 py-2 flex items-center justify-end gap-3 text-xs">
            <Link
              href="/portail/compte"
              className="inline-flex items-center gap-1.5 text-(--color-stone) hover:text-(--color-ink) transition-colors"
            >
              <UserCircle className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{user.email}</span>
            </Link>
            <SignOutButton label={t.portail.signOut} />
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <Footer locale={locale} t={t} />
    </div>
  )
}
