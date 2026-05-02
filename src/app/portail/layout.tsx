import Link from 'next/link'
import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'

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

  return (
    <div className="min-h-screen flex flex-col bg-(--color-canvas)">
      <header className="border-b border-(--color-frame) bg-(--color-paper)/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link href="/portail" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Atelier Montreuil"
              width={743}
              height={258}
              priority
              className="h-8 md:h-10 w-auto logo-invert"
            />
            <span className="hidden sm:inline text-xs uppercase tracking-[0.2em] text-(--color-stone)">
              Espace client
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:inline text-xs text-(--color-stone) truncate max-w-[200px]">
                {user.email}
              </span>
            )}
            {user ? (
              <SignOutButton />
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-(--color-stone) hover:text-(--color-ink) transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 rotate-180" />
                Site public
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-(--color-frame) py-6 text-center text-xs text-(--color-stone)">
        © {new Date().getFullYear()} Atelier Montreuil ·{' '}
        <Link href="/" className="hover:text-(--color-ink)">
          montreuil.be
        </Link>
      </footer>
    </div>
  )
}
