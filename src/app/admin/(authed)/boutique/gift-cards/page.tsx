import Link from 'next/link'
import { ArrowLeft, Gift, Plus, Trash2, Mail } from 'lucide-react'
import { listGiftCards } from '@/lib/shop/gift-cards'
import { createGiftCardAction, deleteGiftCardAction } from './actions'

export const dynamic = 'force-dynamic'

const dateFmt = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium' })

export default async function GiftCardsPage() {
  const cards = await listGiftCards()
  const totalIssued = cards.reduce((sum, c) => sum + c.initial_cents, 0)
  const totalRemaining = cards.reduce((sum, c) => sum + c.remaining_cents, 0)
  const totalUsed = totalIssued - totalRemaining

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Boutique
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Cartes-cadeaux</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <Gift className="w-6 h-6 text-(--color-bronze)" />
          Cartes-cadeaux
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Émettez des cartes-cadeaux manuellement. Le destinataire utilise le code à la caisse.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Émises" value={`€ ${(totalIssued / 100).toFixed(2)}`} />
        <Stat label="Utilisées" value={`€ ${(totalUsed / 100).toFixed(2)}`} />
        <Stat label="Solde restant" value={`€ ${(totalRemaining / 100).toFixed(2)}`} />
      </div>

      {/* Nouvelle carte */}
      <section className="bg-(--color-paper) border border-(--color-frame) p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3 inline-flex items-center gap-2">
          <Plus className="w-3.5 h-3.5 text-(--color-bronze)" />
          Émettre une nouvelle carte
        </h2>
        <form action={createGiftCardAction} className="grid sm:grid-cols-2 gap-3">
          <Field label="Montant (€) *" name="initial_eur" type="number" step="0.01" min="0.01" required placeholder="50" />
          <Field label="Expire (optionnel)" name="expires_at" type="date" />
          <Field label="Email destinataire" name="recipient_email" type="email" placeholder="cadeau@…" />
          <Field label="Nom destinataire" name="recipient_name" placeholder="Marie Dupont" />
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5 block">
              Message (optionnel)
            </span>
            <textarea
              name="message"
              rows={2}
              placeholder="Bon anniversaire !"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-sm focus:border-(--color-bronze) focus:outline-none"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em]"
            >
              <Gift className="w-4 h-4" />
              Émettre
            </button>
          </div>
        </form>
      </section>

      {cards.length === 0 ? (
        <p className="bg-(--color-paper) border border-(--color-frame) p-12 text-center text-(--color-stone)">
          Aucune carte-cadeau émise.
        </p>
      ) : (
        <div className="bg-(--color-paper) border border-(--color-frame) overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-(--color-frame) bg-(--color-canvas)/40">
              <tr className="text-left text-xs text-(--color-stone) uppercase tracking-widest">
                <th className="p-3">Code</th>
                <th className="p-3 w-32">Montant</th>
                <th className="p-3 w-32">Restant</th>
                <th className="p-3">Destinataire</th>
                <th className="p-3 w-32">Émise</th>
                <th className="p-3 w-32">Expire</th>
                <th className="p-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id} className="border-b border-(--color-frame)/60">
                  <td className="p-3 font-mono text-xs uppercase text-(--color-ink)">{c.code}</td>
                  <td className="p-3 tabular-nums">€ {(c.initial_cents / 100).toFixed(2)}</td>
                  <td className={`p-3 tabular-nums ${c.remaining_cents === 0 ? 'text-(--color-stone)/60 line-through' : 'text-emerald-700'}`}>
                    € {(c.remaining_cents / 100).toFixed(2)}
                  </td>
                  <td className="p-3">
                    {c.recipient_name && <p className="text-(--color-ink)">{c.recipient_name}</p>}
                    {c.recipient_email && (
                      <a href={`mailto:${c.recipient_email}`} className="text-xs text-(--color-bronze) inline-flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {c.recipient_email}
                      </a>
                    )}
                    {!c.recipient_name && !c.recipient_email && (
                      <span className="text-(--color-stone)/60 text-xs italic">—</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-(--color-stone)">{dateFmt.format(new Date(c.created_at))}</td>
                  <td className="p-3 text-xs text-(--color-stone)">
                    {c.expires_at ? dateFmt.format(new Date(c.expires_at)) : '—'}
                  </td>
                  <td className="p-3 text-right">
                    <form action={deleteGiftCardAction.bind(null, c.id)}>
                      <button
                        type="submit"
                        aria-label="Supprimer"
                        className="p-1.5 text-(--color-stone) hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-(--color-paper) border border-(--color-frame) p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) tabular-nums">{value}</p>
    </div>
  )
}

function Field({
  label, name, type = 'text', required, placeholder, step, min,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  step?: string
  min?: string
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-1.5 block">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        step={step}
        min={min}
        className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
      />
    </label>
  )
}
