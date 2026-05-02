import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { workImageUrl } from '@/lib/links'
import AboutEdit from './AboutEdit'

export const dynamic = 'force-dynamic'

type Section = {
  id: string
  sort_order: number
  title_fr: string
  title_nl: string
  body_fr: string
  body_nl: string
  image_path: string | null
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function AboutDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: section } = await supabase
    .from('about_sections')
    .select('id, sort_order, title_fr, title_nl, body_fr, body_nl, image_path')
    .eq('id', id)
    .single<Section>()

  if (!section) notFound()

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <Link
        href="/admin/about"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-(--color-stone) hover:text-(--color-ink) mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Toutes les sections
      </Link>

      <AboutEdit
        section={{
          id: section.id,
          sort_order: section.sort_order,
          title_fr: section.title_fr,
          title_nl: section.title_nl,
          body_fr: section.body_fr,
          body_nl: section.body_nl,
          imageUrl: section.image_path ? workImageUrl(section.image_path) : '',
        }}
      />
    </div>
  )
}
