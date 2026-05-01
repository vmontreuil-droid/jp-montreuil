import Link from 'next/link'
import Image from 'next/image'
import type { Locale } from '@/i18n/config'
import { type Dictionary } from '@/i18n/dictionaries'
import { getAltLocaleHref, getRequestPathname } from '@/i18n/server'
import { localePath } from '@/lib/links'
import ThemeToggle from './ThemeToggle'

type Props = {
  locale: Locale
  t: Dictionary
}

export default async function Header({ locale, t }: Props) {
  const pathname = await getRequestPathname()
  const altHref = getAltLocaleHref(pathname, locale)
  const altLabel = locale === 'fr' ? 'NL' : 'FR'

  const navItems = [
    { href: localePath(locale, '/'), label: t.nav.home },
    { href: localePath(locale, '/galerie'), label: t.nav.collection },
    { href: localePath(locale, '/social'), label: t.nav.about },
    { href: localePath(locale, '/contact'), label: t.nav.contact },
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

        <nav className="hidden md:flex items-center gap-8 text-sm tracking-wide uppercase">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-(--color-charcoal) hover:text-(--color-bronze) transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle
            labelLight={locale === 'fr' ? 'Mode clair' : 'Lichte modus'}
            labelDark={locale === 'fr' ? 'Mode sombre' : 'Donkere modus'}
          />
          <a
            href={altHref}
            className="inline-flex items-center justify-center text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink) transition-colors border border-(--color-frame) px-3 h-[34px] rounded-sm"
            aria-label={`Switch to ${altLabel}`}
          >
            {altLabel}
          </a>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden border-t border-(--color-frame) px-6 py-3 flex items-center justify-around text-xs uppercase tracking-wide">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-(--color-charcoal) hover:text-(--color-bronze) transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
