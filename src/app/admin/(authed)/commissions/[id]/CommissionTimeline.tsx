import { Check } from 'lucide-react'

type Step = {
  key: string
  label: string
  at: string | null // ISO datestring or null
}

type Props = {
  steps: Step[]
}

function formatShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })
}

/**
 * Horizontale tijdsbalk voor een commissie-aanvraag.
 * Doorlopende balk vult tot aan de laatste voltooide stap; elke stap is
 * een bolletje met label en optionele datum.
 */
export default function CommissionTimeline({ steps }: Props) {
  const lastDoneIdx = steps.reduce((acc, s, i) => (s.at ? i : acc), -1)
  const progressPct = steps.length <= 1 ? 0 : (lastDoneIdx / (steps.length - 1)) * 100

  return (
    <section className="border border-(--color-frame) bg-(--color-paper) p-6">
      <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-5">
        Avancement
      </h2>
      <div className="relative">
        {/* Achtergrond-rail */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-3 h-0.5 bg-(--color-frame)"
        />
        {/* Vooruitgangs-rail */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-3 h-0.5 bg-(--color-bronze) transition-all duration-300"
          style={{ width: `${Math.max(0, progressPct)}%` }}
        />
        <ol className="relative flex justify-between">
          {steps.map((step, idx) => {
            const done = !!step.at
            const isLast = idx === lastDoneIdx
            return (
              <li
                key={step.key}
                className="flex flex-col items-center gap-1.5 text-center"
                style={{ width: `${100 / steps.length}%` }}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? 'border-(--color-bronze) bg-(--color-bronze) text-white'
                      : 'border-(--color-frame) bg-(--color-paper) text-(--color-stone)'
                  } ${isLast ? 'ring-4 ring-(--color-bronze)/20' : ''}`}
                >
                  {done && <Check className="w-3 h-3" />}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-[0.1em] leading-tight ${
                    done ? 'text-(--color-ink) font-semibold' : 'text-(--color-stone)'
                  }`}
                >
                  {step.label}
                </span>
                {step.at && (
                  <span className="text-[9px] text-(--color-stone)">
                    {formatShort(step.at)}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
