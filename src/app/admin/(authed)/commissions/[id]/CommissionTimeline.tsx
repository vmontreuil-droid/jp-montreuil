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

function formatLong(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-BE', { day: '2-digit', month: 'long' })
}

/**
 * Tijdsbalk met responsieve weergave:
 *  - mobile (< md): verticale lijst met dot + label + datum links uitgelijnd,
 *    leesbaar met 9 stappen zonder overlappende labels.
 *  - desktop (md+): horizontale rail met geroteerde labels onder de bolletjes,
 *    zodat 9 stappen comfortabel passen op brede schermen.
 */
export default function CommissionTimeline({ steps }: Props) {
  const lastDoneIdx = steps.reduce((acc, s, i) => (s.at ? i : acc), -1)
  const progressPct = steps.length <= 1 ? 0 : (lastDoneIdx / (steps.length - 1)) * 100

  return (
    <section className="border border-(--color-frame) bg-(--color-paper) p-6">
      <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-5">
        Avancement
      </h2>

      {/* Mobile — vertical */}
      <ol className="md:hidden relative space-y-3 pl-2">
        <div
          aria-hidden="true"
          className="absolute left-[14px] top-3 bottom-3 w-px bg-(--color-frame)"
        />
        {steps.map((step, idx) => {
          const done = !!step.at
          const isLast = idx === lastDoneIdx
          return (
            <li key={step.key} className="relative flex items-start gap-3">
              <span
                className={`relative z-10 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 shrink-0 ${
                  done
                    ? 'border-(--color-bronze) bg-(--color-bronze) text-white'
                    : 'border-(--color-frame) bg-(--color-paper) text-(--color-stone)'
                } ${isLast ? 'ring-4 ring-(--color-bronze)/20' : ''}`}
              >
                {done && <Check className="w-3 h-3" />}
              </span>
              <div className="flex-1 min-w-0 pt-1">
                <p
                  className={`text-[11px] uppercase tracking-[0.15em] leading-tight ${
                    done ? 'text-(--color-ink) font-semibold' : 'text-(--color-stone)'
                  }`}
                >
                  {step.label}
                </p>
                {step.at && (
                  <p className="text-[10px] text-(--color-stone) mt-0.5">
                    {formatLong(step.at)}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* Desktop — horizontal met geroteerde labels */}
      <div className="hidden md:block relative pb-12">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-3 h-0.5 bg-(--color-frame)"
        />
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
                className="flex flex-col items-center text-center relative"
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
                <div className="absolute top-9 left-1/2 -translate-x-1/2 origin-top -rotate-45 whitespace-nowrap">
                  <span
                    className={`block text-[10px] uppercase tracking-[0.1em] ${
                      done ? 'text-(--color-ink) font-semibold' : 'text-(--color-stone)'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.at && (
                    <span className="block text-[9px] text-(--color-stone) mt-0.5">
                      {formatShort(step.at)}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
