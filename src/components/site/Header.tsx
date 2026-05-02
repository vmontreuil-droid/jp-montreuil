import Link from 'next/link'
import Image from 'next/image'
import { User } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { type Dictionary } from '@/i18n/dictionaries'
import { getAltLocaleHref, getRequestPathname } from '@/i18n/server'
import { localePath } from '@/lib/links'
import ThemeToggle from './ThemeToggle'
import MobileMenu from './MobileMenu'
import DesktopNav from './DesktopNav'
import PortailLocaleSwitch from './PortailLocaleSwitch'

type Props = {
  locale: Locale
  t: Dictionary
}

export default async function Header({ locale, t }: Props) {
  const pathname = await getRequestPathname()
  const altHref = getAltLocaleHref(pathname, locale)
  const altLabel = locale === 'fr' ? 'NL' : 'FR'
  const altLocale: Locale = locale === 'fr' ? 'nl' : 'fr'

  // Op /portail/* werkt URL-prefix routing niet (geen /nl/portail-route).
  // We schakelen daar naar een cookie-based switcher die de pagina
  // herlaadt in de andere taal zonder de URL te wijzigen.
  const isPortail = pathname.startsWith('/portail') || pathname.startsWith('/nl/portail')

  const localeSwitcher = isPortail ? (
    <PortailLocaleSwitch
      altLocale={altLocale}
      altLabel={altLabel}
      ariaLabel={`Switch to ${altLabel}`}
    />
  ) : null

  // Icon-component wordt client-side gekozen via iconName-string —
  // veilig over server→client grens (geen forwardRef-serialization).
  const navItems = [
    { href: localePath(locale, '/'), label: t.nav.home, iconName: 'home' as const },
    { href: localePath(locale, '/galerie'), label: t.nav.collection, iconName: 'collection' as const },
    { href: localePath(locale, '/a-propos'), label: t.nav.about, iconName: 'about' as const },
    { href: localePath(locale, '/social'), label: t.nav.social, iconName: 'social' as const },
    { href: localePath(locale, '/contact'), label: t.nav.contact, iconName: 'contact' as const },
  ]

  return (
    <header className="sticky top-0 z-40 bg-(--color-canvas)/85 backdrop-blur-sm border-b border-(--color-frame)">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link href={localePath(locale, '/')} className="block leading-none">
          <Image
            src="/logo.png"
            alt="Atelier Montreuil"
            width={743}
            height={258}
            priority
            className="h-10 md:h-12 w-auto logo-invert"
          />
        </Link>

        <DesktopNav items={navItems} />

        <div className="flex items-center gap-2">
          {/* Desktop: portail + thema + taal-switch zichtbaar */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/portail/login"
              aria-label={locale === 'fr' ? 'Espace client' : 'Klantenportaal'}
              title={locale === 'fr' ? 'Espace client' : 'Klantenportaal'}
              className="inline-flex items-center justify-center w-[34px] h-[34px] text-(--color-stone) hover:text-(--color-bronze) transition-colors border border-(--color-frame) hover:border-(--color-bronze) rounded-sm"
            >
              <User className="w-4 h-4" />
            </Link>
            <ThemeToggle
              labelLight={locale === 'fr' ? 'Mode clair' : 'Lichte modus'}
              labelDark={locale === 'fr' ? 'Mode sombre' : 'Donkere modus'}
            />
            {localeSwitcher ?? (
              <a
                href={altHref}
                className="inline-flex items-center justify-center text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink) transition-colors border border-(--color-frame) px-3 h-[34px] rounded-sm"
                aria-label={`Switch to ${altLabel}`}
              >
                {altLabel}
              </a>
            )}
          </div>

          {/* Mobile: hamburger-menu */}
          <MobileMenu
            items={navItems}
            altHref={altHref}
            altLabel={altLabel}
            switchLabel={`Switch to ${altLabel}`}
            portalHref="/portail/login"
            portalLabel={locale === 'fr' ? 'Espace client' : 'Klantenportaal'}
            localeSwitcher={localeSwitcher ?? undefined}
            themeToggle={
              <ThemeToggle
                labelLight={locale === 'fr' ? 'Mode clair' : 'Lichte modus'}
                labelDark={locale === 'fr' ? 'Mode sombre' : 'Donkere modus'}
              />
            }
          />
        </div>
      </div>
    </header>
  )
}
