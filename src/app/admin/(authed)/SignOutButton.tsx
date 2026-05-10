'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter()

  async function onSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      title={compact ? 'Déconnexion' : undefined}
      className={`flex items-center gap-3 w-full px-3 py-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink) transition-colors ${
        compact ? 'md:justify-center md:px-2' : ''
      }`}
    >
      <LogOut className="w-4 h-4 shrink-0" />
      <span className={compact ? 'md:hidden' : ''}>Déconnexion</span>
    </button>
  )
}
