import Link from 'next/link'
import { CalendarDays, Plus, Eye, EyeOff, MapPin, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { workImageUrl } from '@/lib/links'
import NewExhibitionForm from './NewExhibitionForm'

export const dynamic = 'force-dynamic'

type ExhibitionRow = {
  id: string
  title_fr: string
  title_nl: string
  location: string | null
  date_from: string
  date_to: string | null
  image_path: string | null
  external_url: string | null
  is_active: boolean
  created_at: string
}

function formatRange(from: string, to: string | null): string {
  const f = new Date(from).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })
  if (!to || to === from) return f
  const t = new Date(to).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${f} → ${t}`
}

export default async function ExhibitionsAdminPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('exhibitions')
    .select('*')
    .order('date_from', { ascending: false })
    .returns<ExhibitionRow[]>()

  const all = data ?? []
  const todayKey = new Date().toISOString().slice(0, 10)
  const upcoming = all.filter((e) => (e.date_to ?? e.date_from) >= todayKey)
  const past = all.filter((e) => (e.date_to ?? e.date_from) < todayKey)

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Expositions
        </h1>
        <p className="mt-2 text-sm text-(--color-stone)">
          Tentoonstellingen, beurzen en evenementen — getoond op{' '}
          <code>/expositions</code> en (komende) op de homepagina.
        </p>
      </header>

      <div className="mb-10 bg-(--color-paper) border border-(--color-frame) p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 inline-flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          Nouvelle exposition
        </h2>
        <NewExhibitionForm />
      </div>

      {all.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-(--color-stone) bg-(--color-paper) border border-(--color-frame)">
          <CalendarDays className="w-12 h-12 mb-4 opacity-50" />
          <p>Aucune exposition.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-bronze) mb-3">
                À venir / en cours · {upcoming.length}
              </h2>
              <ul className="space-y-3">
                {upcoming.map((e) => (
                  <ExhibitionRowCard key={e.id} ex={e} />
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
                Passées · {past.length}
              </h2>
              <ul className="space-y-3 opacity-80">
                {past.map((e) => (
                  <ExhibitionRowCard key={e.id} ex={e} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function ExhibitionRowCard({ ex }: { ex: ExhibitionRow }) {
  return (
    <li className="bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze)/50 transition-colors">
      <Link href={`/admin/exhibitions/${ex.id}`} className="flex items-stretch gap-4 p-3">
        <div className="relative w-20 h-24 shrink-0 bg-(--color-canvas) border border-(--color-frame) overflow-hidden">
          {ex.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={workImageUrl(ex.image_path)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-(--color-stone)">
              <CalendarDays className="w-6 h-6 opacity-50" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-(--color-ink) font-[family-name:var(--font-display)] text-lg leading-tight truncate">
            {ex.title_fr || ex.title_nl}
          </p>
          <p className="text-xs text-(--color-stone) mt-1 inline-flex items-center gap-3 truncate">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {formatRange(ex.date_from, ex.date_to)}
            </span>
            {ex.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />
                {ex.location}
              </span>
            )}
            {ex.external_url && (
              <span className="inline-flex items-center gap-1 text-(--color-bronze)">
                <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </p>
        </div>

        <div
          className={`shrink-0 self-center inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-[0.15em] border ${
            ex.is_active
              ? 'border-(--color-bronze) text-(--color-bronze)'
              : 'border-(--color-frame) text-(--color-stone)'
          }`}
        >
          {ex.is_active ? (
            <>
              <Eye className="w-3 h-3" /> Visible
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" /> Caché
            </>
          )}
        </div>
      </Link>
    </li>
  )
}
