import { Mail, Phone, MapPin } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { type Dictionary } from '@/i18n/dictionaries'

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.13 8.44 9.88v-6.99H7.9v-2.89h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.89h-2.33V22c4.78-.75 8.44-4.88 8.44-9.94z" />
    </svg>
  )
}

type Props = {
  locale: Locale
  t: Dictionary
}

export default function Footer({ locale, t }: Props) {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 border-t border-(--color-frame) bg-(--color-paper)">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) mb-2">
            Atelier Montreuil
          </p>
          <p className="italic text-(--color-charcoal)">{t.tagline}</p>
        </div>

        <ul className="space-y-2 text-sm text-(--color-charcoal)">
          <li className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-(--color-stone) shrink-0" />
            <span>{t.contact.address}</span>
          </li>
          <li className="flex items-start gap-2">
            <Phone className="w-4 h-4 mt-0.5 text-(--color-stone) shrink-0" />
            <a href={`tel:${t.contact.phone.replace(/\s/g, '')}`} className="hover:text-(--color-bronze)">
              {t.contact.phone}
            </a>
          </li>
          <li className="flex items-start gap-2">
            <Mail className="w-4 h-4 mt-0.5 text-(--color-stone) shrink-0" />
            <a href={`mailto:${t.contact.emailValue}`} className="hover:text-(--color-bronze)">
              {t.contact.emailValue}
            </a>
          </li>
        </ul>

        <div className="flex md:justify-end items-start">
          <a
            href="https://www.facebook.com/jeanpierre.montreuil.3"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-(--color-charcoal) hover:text-(--color-bronze)"
          >
            <FacebookIcon className="w-4 h-4" /> Facebook
          </a>
        </div>
      </div>

      <div className="border-t border-(--color-frame) py-4 text-center text-xs text-(--color-stone)">
        © {year} Jean-Pierre Montreuil — {t.footer.rights} ({locale.toUpperCase()})
      </div>
    </footer>
  )
}
