'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus, Trash2, Send, AlertCircle } from 'lucide-react'
import { composeDevis, type ComposeDevisState } from '../actions'

const initial: ComposeDevisState = { status: 'idle' }

type LineDraft = {
  id: number
  description: string
  quantity: number
  unitPrice: number
}

type Props = {
  id: string
  defaultSubject: string
  defaultIntro: string
  defaultAcomptePct: number
  initialLines?: LineDraft[]
}

let counter = 1

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em] disabled:opacity-50"
    >
      <Send className="w-4 h-4" />
      {pending ? 'Envoi…' : 'Envoyer le devis'}
    </button>
  )
}

export default function DevisComposeForm({
  id,
  defaultSubject,
  defaultIntro,
  defaultAcomptePct,
  initialLines,
}: Props) {
  const [state, action] = useActionState(composeDevis, initial)
  const [lines, setLines] = useState<LineDraft[]>(
    initialLines && initialLines.length > 0
      ? initialLines
      : [{ id: counter++, description: '', quantity: 1, unitPrice: 0 }]
  )
  const [acomptePct, setAcomptePct] = useState(defaultAcomptePct)

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const acompteEur = Math.round(subtotal * (acomptePct / 100) * 100) / 100

  const addLine = () => {
    setLines((prev) => [...prev, { id: counter++, description: '', quantity: 1, unitPrice: 0 }])
  }
  const removeLine = (lid: number) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== lid) : prev))
  }
  const updateLine = (lid: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l) => (l.id === lid ? { ...l, ...patch } : l)))
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">
          Titre du devis
        </label>
        <input
          name="devis_subject"
          type="text"
          required
          defaultValue={defaultSubject}
          placeholder="Ex. Aquarelle sur mesure — chien de famille"
          className="w-full px-3 py-2 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-sm"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">
          Introduction (optionnel)
        </label>
        <textarea
          name="devis_intro"
          rows={3}
          defaultValue={defaultIntro}
          placeholder="Mot personnel pour le client, contexte du projet…"
          className="w-full px-3 py-2 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-sm resize-y"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">
          Lignes
        </label>
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.id} className="grid grid-cols-12 gap-2">
              <input
                type="text"
                name="line_description"
                placeholder="Description"
                value={l.description}
                onChange={(e) => updateLine(l.id, { description: e.target.value })}
                className="col-span-7 px-3 py-2 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-sm"
              />
              <input
                type="number"
                name="line_quantity"
                min="0.01"
                step="0.01"
                value={l.quantity}
                onChange={(e) =>
                  updateLine(l.id, { quantity: Number(e.target.value) || 0 })
                }
                className="col-span-2 px-3 py-2 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-sm"
                placeholder="Qté"
              />
              <input
                type="number"
                name="line_unit_price"
                min="0"
                step="0.01"
                value={l.unitPrice}
                onChange={(e) =>
                  updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })
                }
                className="col-span-2 px-3 py-2 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-sm"
                placeholder="€"
              />
              <button
                type="button"
                onClick={() => removeLine(l.id)}
                aria-label="Supprimer cette ligne"
                className="col-span-1 inline-flex items-center justify-center text-(--color-stone) hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-2 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-(--color-bronze) hover:text-(--color-bronze-dark)"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter une ligne
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">
            Acompte (%)
          </label>
          <input
            type="number"
            name="devis_acompte_pct"
            min="0"
            max="100"
            step="1"
            value={acomptePct}
            onChange={(e) => setAcomptePct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            className="w-full px-3 py-2 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-1.5">
            Valable jusqu’au
          </label>
          <input
            type="date"
            name="devis_valid_until"
            className="w-full px-3 py-2 input-elev bg-(--color-canvas) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink) text-sm"
          />
        </div>
      </div>

      {/* Récap */}
      <div className="bg-(--color-canvas) border border-(--color-frame) px-4 py-3 text-sm space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-(--color-charcoal)">Total</span>
          <span className="text-(--color-ink) font-semibold">{subtotal.toFixed(2)} €</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-(--color-stone) text-xs">Acompte ({acomptePct}%)</span>
          <span className="text-(--color-bronze) font-semibold">{acompteEur.toFixed(2)} €</span>
        </div>
      </div>

      {state.status === 'error' && (
        <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{state.message}</p>
        </div>
      )}

      {state.status === 'success' && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-900 text-emerald-200 text-sm">
          Devis enregistré et envoyé.
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
