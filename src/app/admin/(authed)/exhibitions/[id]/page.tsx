import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { workImageUrl } from '@/lib/links'
import ExhibitionEdit from './ExhibitionEdit'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  title_fr: string
  title_nl: string
  description_fr: string
  description_nl: string
  location: string | null
  date_from: string
  date_to: string | null
  image_path: string | null
  external_url: string | null
  is_active: boolean
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function ExhibitionDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ex } = await supabase
    .from('exhibitions')
    .select('*')
    .eq('id', id)
    .single<Row>()
  if (!ex) notFound()

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <Link
        href="/admin/exhibitions"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-(--color-stone) hover:text-(--color-ink) mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Toutes les expositions
      </Link>

      <ExhibitionEdit
        ex={{
          id: ex.id,
          title_fr: ex.title_fr,
          title_nl: ex.title_nl,
          description_fr: ex.description_fr,
          description_nl: ex.description_nl,
          location: ex.location ?? '',
          date_from: ex.date_from,
          date_to: ex.date_to ?? '',
          external_url: ex.external_url ?? '',
          is_active: ex.is_active,
          imageUrl: ex.image_path ? workImageUrl(ex.image_path) : '',
        }}
      />
    </div>
  )
}
