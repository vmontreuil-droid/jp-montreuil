import Link from 'next/link'
import { getRequestLocale } from '@/i18n/server'
import { getDictionary } from '@/i18n/dictionaries'

export default async function NotFound() {
  const locale = await getRequestLocale()
  const t = getDictionary(locale)
  const homeHref = locale === 'fr' ? '/' : '/nl'

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-(--color-stone) mb-4">
          404
        </p>
        <h1 className="text-4xl text-(--color-ink) mb-4">{t.notFound.title}</h1>
        <p className="text-(--color-charcoal) mb-8">{t.notFound.message}</p>
        <Link
          href={homeHref}
          className="inline-block px-6 py-3 border border-(--color-ink) text-(--color-ink) hover:bg-(--color-ink) hover:text-(--color-canvas) transition-colors"
        >
          {t.notFound.back}
        </Link>
      </div>
    </main>
  )
}
