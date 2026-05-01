import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Mail, Phone, MapPin } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import ContactForm from './ContactForm'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDictionary(locale as Locale)
  return { title: t.contact.title }
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale as Locale)

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-(--color-stone) mb-3">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl md:text-5xl text-(--color-ink) mb-8">{t.contact.title}</h1>

        <ul className="space-y-5 text-(--color-charcoal)">
          <li className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-(--color-bronze) shrink-0 mt-0.5" />
            <span>{t.contact.address}</span>
          </li>
          <li className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-(--color-bronze) shrink-0 mt-0.5" />
            <a href={`tel:${t.contact.phone.replace(/\s/g, '')}`} className="hover:text-(--color-bronze)">
              {t.contact.phone}
            </a>
          </li>
          <li className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-(--color-bronze) shrink-0 mt-0.5" />
            <a href={`mailto:${t.contact.emailValue}`} className="hover:text-(--color-bronze)">
              {t.contact.emailValue}
            </a>
          </li>
        </ul>
      </div>

      <div>
        <ContactForm locale={locale as Locale} t={t} />
      </div>
    </div>
  )
}
