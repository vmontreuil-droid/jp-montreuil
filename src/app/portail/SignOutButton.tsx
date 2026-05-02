'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  label: string
}

export default function SignOutButton({ label }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onSignOut() {
    startTransition(() => {
      void (async () => {
        const sb = createClient()
        await sb.auth.signOut()
        router.push('/portail/login')
        router.refresh()
      })()
    })
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-(--color-stone) hover:text-(--color-ink) transition-colors disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <LogOut className="w-3.5 h-3.5" />
      )}
      {label}
    </button>
  )
}
