import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Mail, Phone, MapPin, BookOpen } from 'lucide-react'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { whatsappHref } from '@/lib/links'
import { pageMetadata } from '@/lib/og'
import { getActiveIbooks, ibookUrl } from '@/lib/ibook'
import IbookViewer from '@/components/site/IbookViewer'
import ContactForm from './ContactForm'

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
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDictionary(locale as Locale)
  const isFR = locale === 'fr'
  return pageMetadata({
    locale: locale as Locale,
    title: t.contact.title,
    description: isFR
      ? 'Contactez Jean-Pierre Montreuil pour une commande, un portrait ou une exposition.'
      : 'Neem contact op met Jean-Pierre Montreuil voor een opdracht, portret of tentoonstelling.',
  })
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDictionary(locale as Locale)

  const waHref = whatsappHref(t.contact.phoneValue, locale as Locale)
  const ibooks = (await getActiveIbooks()).filter((b) => b.pdf_path)

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
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
            <a href={`tel:${t.contact.phoneValue.replace(/\s/g, '')}`} className="hover:text-(--color-bronze)">
              {t.contact.phoneValue}
            </a>
          </li>
          <li className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-(--color-bronze) shrink-0 mt-0.5" />
            <a href={`mailto:${t.contact.emailValue}`} className="hover:text-(--color-bronze)">
              {t.contact.emailValue}
            </a>
          </li>
          <li className="flex items-start gap-3">
            <WhatsAppIcon className="w-5 h-5 text-(--color-bronze) shrink-0 mt-0.5" />
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-(--color-bronze)"
            >
              WhatsApp
            </a>
          </li>
          <li className="flex items-start gap-3">
            <FacebookIcon className="w-5 h-5 text-(--color-bronze) shrink-0 mt-0.5" />
            <a
              href="https://www.facebook.com/jeanpierre.montreuil.3"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-(--color-bronze)"
            >
              Facebook
            </a>
          </li>
          {ibooks.map((b) => {
            const t = locale === 'fr' ? b.title_fr : b.title_nl
            const fallback = t || b.title_fr || b.title_nl || (locale === 'fr' ? 'Livre (PDF)' : 'Boek (PDF)')
            return (
              <li key={b.id} className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-(--color-bronze) shrink-0 mt-0.5" />
                <IbookViewer
                  pdfUrl={ibookUrl(b.pdf_path!)}
                  title={fallback}
                  closeLabel={locale === 'fr' ? 'Fermer' : 'Sluiten'}
                  className="text-left hover:text-(--color-bronze)"
                >
                  {fallback}
                </IbookViewer>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <ContactForm locale={locale as Locale} t={t} />
      </div>
    </div>
  )
}
