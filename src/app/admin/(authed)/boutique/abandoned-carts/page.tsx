import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Send, CheckCircle2, Mail } from 'lucide-react'
import { listAbandonedCarts } from '@/lib/shop/abandoned-carts'
import { sendReminderAction } from './actions'

export const dynamic = 'force-dynamic'

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium', timeStyle: 'short' })

export default async function AbandonedCartsPage() {
  const carts = await listAbandonedCarts()
  const pending = carts.filter((c) => !c.reminder_sent_at && !c.recovered_order_id)
  const reminded = carts.filter((c) => c.reminder_sent_at && !c.recovered_order_id)
  const recovered = carts.filter((c) => c.recovered_order_id)

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Boutique
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Paniers abandonnés</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-(--color-bronze)" />
          Paniers abandonnés
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Capturés quand un client a tapé son email + ajouté des articles, sans finaliser. Vous pouvez relancer manuellement.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="À relancer" value={pending.length} hint="Pas encore d’email envoyé" />
        <Stat label="Relancés" value={reminded.length} hint="Mail envoyé, pas (encore) recommandé" />
        <Stat label="Récupérés" value={recovered.length} hint="Commande payée après abandon" />
      </div>

      {carts.length === 0 ? (
        <p className="bg-(--color-paper) border border-(--color-frame) p-12 text-center text-(--color-stone)">
          Aucun panier abandonné. (Ou personne n’a encore commencé un checkout — c’est aussi possible.)
        </p>
      ) : (
        <ul className="space-y-3">
          {[...pending, ...reminded, ...recovered].map((c) => (
            <li key={c.id} className="bg-(--color-paper) border border-(--color-frame) p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-(--color-ink) font-medium inline-flex items-center gap-2">
                    {c.full_name || c.email}
                    {c.recovered_order_id && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Récupéré
                      </span>
                    )}
                    {c.reminder_sent_at && !c.recovered_order_id && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-sky-700">
                        <Send className="w-3 h-3" /> Relancé
                      </span>
                    )}
                  </p>
                  <a href={`mailto:${c.email}`} className="text-xs text-(--color-bronze) inline-flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" /> {c.email}
                  </a>
                  <p className="text-[11px] text-(--color-stone) mt-1">
                    {dateFmt.format(new Date(c.created_at))} · {c.locale.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums text-(--color-ink)">
                    € {(c.subtotal_cents / 100).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-(--color-stone)">
                    {c.items.length} article{c.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <ul className="mt-3 text-xs text-(--color-charcoal) divide-y divide-(--color-frame)/40">
                {c.items.map((it, idx) => (
                  <li key={idx} className="py-1.5 flex justify-between gap-3">
                    <span className="truncate">{it.title} × {it.quantity}</span>
                    <span className="font-mono tabular-nums shrink-0">
                      € {(it.unit_price_cents * it.quantity / 100).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>

              {!c.reminder_sent_at && !c.recovered_order_id && (
                <form action={sendReminderAction.bind(null, c.id)} className="mt-4">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-widest"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Envoyer un rappel
                  </button>
                </form>
              )}
              {c.reminder_sent_at && (
                <p className="mt-3 text-[11px] text-(--color-stone) inline-flex items-center gap-1">
                  <Send className="w-3 h-3" />
                  Rappel envoyé le {dateFmt.format(new Date(c.reminder_sent_at))}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="bg-(--color-paper) border border-(--color-frame) p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink)">{value}</p>
      {hint && <p className="text-[11px] text-(--color-stone) mt-1">{hint}</p>}
    </div>
  )
}
