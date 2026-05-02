import Link from 'next/link'
import { Plus, FolderOpen, Image as ImageIcon, Calendar, User, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NewAlbumForm from './NewAlbumForm'

export const dynamic = 'force-dynamic'

type AlbumRow = {
  id: string
  slug: string
  title: string
  client_name: string | null
  event_date: string | null
  is_active: boolean
  created_at: string
  photos: { id: string }[] | null
}

export default async function EventsAdminPage() {
  const supabase = await createClient()

  const { data: albumsRaw } = await supabase
    .from('event_albums')
    .select('id, slug, title, client_name, event_date, is_active, created_at, photos:event_photos(id)')
    .order('created_at', { ascending: false })
    .returns<AlbumRow[]>()

  const albums = albumsRaw ?? []

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Albums clients
        </h1>
        <p className="mt-2 text-sm text-(--color-stone) max-w-2xl">
          Créez un album pour chaque évènement (mariage, fête...). Téléversez les photos,
          puis partagez le lien privé avec le client. Sans mot de passe — le lien lui-même
          est confidentiel.
        </p>
      </header>

      <div className="mb-10 bg-(--color-paper) border border-(--color-frame) p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-4 flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          Nouvel album
        </h2>
        <NewAlbumForm />
      </div>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-(--color-stone) bg-(--color-paper) border border-(--color-frame)">
          <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
          <p>Aucun album pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {albums.map((a) => {
            const count = a.photos?.length ?? 0
            return (
              <li
                key={a.id}
                className="bg-(--color-paper) border border-(--color-frame) hover:border-(--color-bronze)/50 transition-colors"
              >
                <Link
                  href={`/admin/events/${a.id}`}
                  className="flex items-center gap-4 p-4"
                >
                  <div className="w-12 h-12 shrink-0 bg-(--color-canvas) border border-(--color-frame) flex items-center justify-center text-(--color-bronze)">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-(--color-ink) font-[family-name:var(--font-display)] text-lg leading-tight truncate">
                      {a.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--color-stone)">
                      {a.client_name && (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {a.client_name}
                        </span>
                      )}
                      {a.event_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(a.event_date).toLocaleDateString('fr-BE')}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {count} photo{count !== 1 ? 's' : ''}
                      </span>
                      <code className="text-(--color-charcoal)">/album/{a.slug}</code>
                    </div>
                  </div>
                  <div
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-[0.15em] border ${
                      a.is_active
                        ? 'border-(--color-bronze) text-(--color-bronze)'
                        : 'border-(--color-frame) text-(--color-stone)'
                    }`}
                  >
                    {a.is_active ? (
                      <>
                        <Eye className="w-3 h-3" /> Actif
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" /> Inactif
                      </>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
