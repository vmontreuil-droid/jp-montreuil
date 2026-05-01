import Image from 'next/image'
import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { type Dictionary } from '@/i18n/dictionaries'
import { localePath, whatsappHref } from '@/lib/links'

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.13 8.44 9.88v-6.99H7.9v-2.89h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.89h-2.33V22c4.78-.75 8.44-4.88 8.44-9.94z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

type Props = {
  locale: Locale
  t: Dictionary
}

export default function Footer({ locale, t }: Props) {
  const year = new Date().getFullYear()

  const navItems = [
    { href: localePath(locale, '/'), label: t.nav.home },
    { href: localePath(locale, '/galerie'), label: t.nav.collection },
    { href: localePath(locale, '/social'), label: t.nav.about },
    { href: localePath(locale, '/contact'), label: t.nav.contact },
  ]

  const waHref = whatsappHref(t.contact.phoneValue, locale)

  return (
    <footer className="mt-24 border-t border-(--color-frame) bg-(--color-paper)">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
        {/* 1. Logo + tagline */}
        <div className="md:col-span-1">
          <Image
            src="/logo.png"
            alt="Atelier Montreuil"
            width={743}
            height={258}
            className="h-12 w-auto mb-3 logo-invert"
          />
          <p className="text-(--color-charcoal) text-sm">{t.tagline}</p>
        </div>

        {/* 2. Menu */}
        <div>
          <h3 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
            Menu
          </h3>
          <ul className="space-y-2 text-sm">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-(--color-charcoal) hover:text-(--color-bronze) transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. Contact */}
        <div>
          <h3 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
            Contact
          </h3>
          <ul className="space-y-2 text-sm text-(--color-charcoal)">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-(--color-stone) shrink-0" />
              <span>{t.contact.address}</span>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="w-4 h-4 mt-0.5 text-(--color-stone) shrink-0" />
              <a
                href={`tel:${t.contact.phoneValue.replace(/\s/g, '')}`}
                className="hover:text-(--color-bronze)"
              >
                {t.contact.phoneValue}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 text-(--color-stone) shrink-0" />
              <a
                href={`mailto:${t.contact.emailValue}`}
                className="hover:text-(--color-bronze)"
              >
                {t.contact.emailValue}
              </a>
            </li>
          </ul>
        </div>

        {/* 4. Social */}
        <div>
          <h3 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4">
            {locale === 'fr' ? 'Suivez-moi' : 'Volg mij'}
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://www.facebook.com/jeanpierre.montreuil.3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-(--color-charcoal) hover:text-(--color-bronze)"
              >
                <FacebookIcon className="w-4 h-4" /> Facebook
              </a>
            </li>
            <li>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-(--color-charcoal) hover:text-(--color-bronze)"
              >
                <WhatsAppIcon className="w-4 h-4" /> WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-(--color-frame) py-4 px-6 text-xs text-(--color-stone)">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:justify-between gap-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link
              href={localePath(locale, '/mentions-legales')}
              className="hover:text-(--color-ink) transition-colors"
            >
              {locale === 'fr' ? 'Mentions légales' : 'Wettelijke vermeldingen'}
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href={localePath(locale, '/confidentialite')}
              className="hover:text-(--color-ink) transition-colors"
            >
              {locale === 'fr' ? 'Confidentialité' : 'Privacybeleid'}
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/admin"
              className="hover:text-(--color-ink) transition-colors"
            >
              Admin
            </Link>
          </div>
          <div>© {year} Jean-Pierre Montreuil — {t.footer.rights}</div>
          <div>
            {locale === 'fr' ? 'Site créé par' : 'Site gemaakt door'}{' '}
            <a
              href="mailto:vmontreuil@outlook.be"
              className="hover:text-(--color-ink) transition-colors"
            >
              Vincent Montreuil
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
