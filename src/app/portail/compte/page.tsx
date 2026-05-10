import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Mail, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDictionary } from '@/i18n/dictionaries'
import { getPortailLocale } from '../locale'
import AccountForm from './AccountForm'
import MessageForm from './MessageForm'
import ShopProfileForm from './ShopProfileForm'
import { getMyShopCustomer } from '@/lib/shop/customer-portal'

export const dynamic = 'force-dynamic'

export default async function PortailComptePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/portail/login')

  const locale = await getPortailLocale()
  const t = getDictionary(locale).portail
  const isFR = locale === 'fr'

  // Bestaande shop-customer rij (kan null zijn voor klanten die nog
  // geen webshop-bestelling deden — form vult dan met defaults).
  const customer = await getMyShopCustomer(user.email!).catch(() => null)
  const addr = (customer?.address ?? {}) as Record<string, string>
  const initialShopProfile = {
    full_name: customer?.full_name ?? '',
    phone: customer?.phone ?? '',
    street: addr.street ?? '',
    postal_code: addr.postal_code ?? '',
    city: addr.city ?? '',
    country: addr.country ?? 'BE',
    is_b2b: customer?.is_b2b ?? false,
    company: customer?.company ?? '',
    vat_number: customer?.vat_number ?? '',
    vat_validated_at: customer?.vat_validated_at ?? null,
    vat_company_name: customer?.vat_company_name ?? null,
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
      <div>
        <Link
          href="/portail"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.account.backToPortal}
        </Link>
      </div>

      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          {t.dashboard.eyebrow}
        </p>
        <h1 className="text-3xl md:text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          {t.account.title}
        </h1>
      </header>

      <section className="bg-(--color-paper) border border-(--color-frame) p-6 space-y-3 text-sm">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone)">
          {isFR ? 'Mes informations' : 'Mijn gegevens'}
        </h2>
        <div className="flex items-center gap-3 text-(--color-charcoal)">
          <Mail className="w-4 h-4 text-(--color-bronze)" />
          {t.account.emailLabel}: <span className="text-(--color-ink)">{user.email}</span>
        </div>
      </section>

      <MessageForm locale={locale} labels={t.account.message} />

      <section>
        <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)] mb-1 inline-flex items-center gap-2">
          <Building2 className="w-4 h-4 text-(--color-bronze)" />
          {t.shopProfile.sectionTitle}
        </h2>
        <p className="text-xs text-(--color-stone) mb-3">{t.shopProfile.sectionLead}</p>
        <ShopProfileForm t={t.shopProfile} initial={initialShopProfile} />
      </section>

      <section>
        <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)] mb-3">
          {t.account.passwordSection}
        </h2>
        <AccountForm t={{ ...t, account: t.account }} />
      </section>
    </div>
  )
}
