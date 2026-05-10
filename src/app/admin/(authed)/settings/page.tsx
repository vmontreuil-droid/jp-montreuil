import { redirect } from 'next/navigation'
import { Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listAllSettings } from '@/lib/site-settings'
import SettingsForm from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const settings = await listAllSettings()

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 inline-flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-(--color-bronze)" />
          Configuration
        </p>
        <h1 className="text-3xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Paramètres du site
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-2">
          Réglages globaux : titre, méta-données, signature, bannière, etc.
          Les modifications sont appliquées immédiatement.
        </p>
      </header>

      <SettingsForm initial={settings} />
    </main>
  )
}
