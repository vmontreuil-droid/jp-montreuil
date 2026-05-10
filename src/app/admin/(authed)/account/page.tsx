import { redirect } from 'next/navigation'
import { UserCircle, Mail, Lock, IdCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import AccountProfileForm from './AccountProfileForm'
import AccountPasswordForm from './AccountPasswordForm'

export const dynamic = 'force-dynamic'

export default async function AdminAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, display_name, avatar_url, created_at')
    .eq('id', user.id)
    .single()

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 inline-flex items-center gap-2">
          <UserCircle className="w-3.5 h-3.5 text-(--color-bronze)" />
          Mon compte
        </p>
        <h1 className="text-3xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Profil administrateur
        </h1>
      </header>

      <section className="bg-(--color-paper) border border-(--color-frame) p-6 space-y-3">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) inline-flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-(--color-bronze)" />
          Compte
        </h2>
        <dl className="text-sm space-y-1.5">
          <div className="flex gap-3">
            <dt className="w-32 text-(--color-stone)">Adresse e-mail</dt>
            <dd className="text-(--color-ink) font-medium">{user.email}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-32 text-(--color-stone)">Rôle</dt>
            <dd className="text-(--color-ink) font-medium uppercase tracking-wider text-xs">
              {profile?.role ?? 'user'}
            </dd>
          </div>
          {profile?.created_at && (
            <div className="flex gap-3">
              <dt className="w-32 text-(--color-stone)">Compte créé</dt>
              <dd className="text-(--color-charcoal)">
                {new Date(profile.created_at).toLocaleDateString('fr-BE', { dateStyle: 'long' })}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section>
        <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)] mb-3 inline-flex items-center gap-2">
          <IdCard className="w-4 h-4 text-(--color-bronze)" />
          Profil affiché
        </h2>
        <AccountProfileForm
          initial={{
            display_name: profile?.display_name ?? '',
            avatar_url: profile?.avatar_url ?? '',
          }}
        />
      </section>

      <section>
        <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)] mb-3 inline-flex items-center gap-2">
          <Lock className="w-4 h-4 text-(--color-bronze)" />
          Changer mon mot de passe
        </h2>
        <AccountPasswordForm />
      </section>
    </main>
  )
}
