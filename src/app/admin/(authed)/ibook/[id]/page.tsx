import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getIbookById, ibookUrl } from '@/lib/ibook'
import IbookEdit from './IbookEdit'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export default async function IbookDetailPage({ params }: Props) {
  const { id } = await params
  const ibook = await getIbookById(id)
  if (!ibook) notFound()

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <Link
        href="/admin/ibook"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-(--color-stone) hover:text-(--color-ink) mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Tous les ibooks
      </Link>

      <IbookEdit
        ibook={{
          id: ibook.id,
          title_fr: ibook.title_fr,
          title_nl: ibook.title_nl,
          description_fr: ibook.description_fr,
          description_nl: ibook.description_nl,
          is_active: ibook.is_active,
          coverUrl: ibook.cover_path ? ibookUrl(ibook.cover_path) : '',
          qrUrl: ibook.qr_path ? ibookUrl(ibook.qr_path) : '',
          pdfUrl: ibook.pdf_path ? ibookUrl(ibook.pdf_path) : '',
        }}
      />
    </div>
  )
}
