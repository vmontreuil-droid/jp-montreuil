import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
import { marked } from 'marked'
import { isLocale, type Locale } from '@/i18n/config'
import { localePath, workImageUrl } from '@/lib/links'
import { pageMetadata } from '@/lib/og'
import { PUBLIC_BASE_URL } from '@/lib/public-url'
import { getPublishedPostBySlug } from '@/lib/journal'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbJsonLd } from '@/lib/seo/structured-data'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam, slug } = await params
  if (!isLocale(localeParam)) return {}
  const post = await getPublishedPostBySlug(slug)
  if (!post) return {}
  const locale = localeParam as Locale
  const isFR = locale === 'fr'
  const title = isFR ? post.title_fr : (post.title_nl || post.title_fr)
  const description = isFR ? (post.excerpt_fr || post.title_fr) : (post.excerpt_nl || post.title_nl || post.title_fr)
  return pageMetadata({
    locale,
    title,
    description: description.slice(0, 200),
    imageUrl: post.cover_image_path ? workImageUrl(post.cover_image_path) : null,
    ogType: 'article',
    path: `/journal/${slug}`,
  })
}

// Markdown → HTML, server-side. Marked default settings — bewust geen
// raw HTML toelaten via custom renderer? Voor admin-only content (JP
// schrijft alles zelf) is het OK om standaard te laten. We zetten wel
// 'mangle' uit en gfm aan voor tabellen.
marked.setOptions({ gfm: true, breaks: false })

export default async function JournalPostPage({ params }: Props) {
  const { locale: localeParam, slug } = await params
  if (!isLocale(localeParam)) notFound()
  const post = await getPublishedPostBySlug(slug)
  if (!post) notFound()
  const locale = localeParam as Locale
  const isFR = locale === 'fr'
  const title = isFR ? post.title_fr : (post.title_nl || post.title_fr)
  const body = isFR ? post.body_fr : (post.body_nl || post.body_fr)
  const html = await marked.parse(body)

  const dateFmt = new Intl.DateTimeFormat(isFR ? 'fr-BE' : 'nl-BE', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // JSON-LD: Article (rich-result in Google + Discover)
  const base = PUBLIC_BASE_URL.replace(/\/$/, '')
  const localePrefix = locale === 'fr' ? '' : '/nl'
  const articleUrl = `${base}${localePrefix}/journal/${slug}`
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: (isFR ? post.excerpt_fr : post.excerpt_nl) || title,
    image: post.cover_image_path ? workImageUrl(post.cover_image_path) : `${base}/opengraph-image`,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Person', name: 'Jean-Pierre Montreuil', url: base },
    publisher: { '@type': 'Organization', name: 'Atelier Montreuil', url: base },
    mainEntityOfPage: articleUrl,
    inLanguage: isFR ? 'fr-BE' : 'nl-BE',
    keywords: post.tags.join(', '),
  }
  const breadcrumbLd = breadcrumbJsonLd([
    { name: isFR ? 'Accueil' : 'Home', path: localePrefix || '/' },
    { name: 'Journal', path: `${localePrefix}/journal` },
    { name: title, path: `${localePrefix}/journal/${slug}` },
  ])

  return (
    <main className="bg-(--color-canvas)">
      <JsonLd data={[articleLd, breadcrumbLd]} />

      <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <Link
          href={localePath(locale, '/journal')}
          className="inline-flex items-center gap-2 text-sm text-(--color-stone) hover:text-(--color-ink) mb-6"
        >
          <ArrowLeft size={14} /> {isFR ? 'Retour au journal' : 'Terug naar journaal'}
        </Link>

        <header className="mb-10">
          {post.published_at && (
            <p className="text-xs text-(--color-stone) mb-3 inline-flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {dateFmt.format(new Date(post.published_at))}
            </p>
          )}
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-(--color-ink) mb-4 leading-tight">
            {title}
          </h1>
          {post.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {post.tags.map((t) => (
                <span key={t} className="text-[10px] uppercase tracking-widest text-(--color-bronze) bg-(--color-bronze)/10 px-2 py-0.5">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </header>

        {post.cover_image_path && (
          <div className="relative aspect-[3/2] mb-10 overflow-hidden">
            <Image
              src={workImageUrl(post.cover_image_path)}
              alt={title}
              fill
              priority
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        {/* Markdown body — kale prose-styling via Tailwind utilities, want
            we hebben geen tailwind/typography plugin. */}
        <div
          className="journal-body text-(--color-charcoal) leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </main>
  )
}
