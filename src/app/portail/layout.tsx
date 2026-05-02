import { createClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { getDictionary } from '@/i18n/dictionaries'
import { defaultLocale } from '@/i18n/config'

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

  const t = getDictionary(defaultLocale)

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={defaultLocale} t={t} />

      {user && (
        <div className="border-b border-(--color-frame) bg-(--color-paper)/60">
          <div className="max-w-5xl mx-auto px-6 py-2 flex items-center justify-end gap-3 text-xs">
            <span className="text-(--color-stone) truncate max-w-[240px]">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <Footer locale={defaultLocale} t={t} />
    </div>
  )
}
