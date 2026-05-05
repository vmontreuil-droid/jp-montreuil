'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { CheckCircle2, Loader2, Send, AlertTriangle } from 'lucide-react'
import { sendMessageToJP, type SendMessageState } from './actions'

type Props = {
  locale: 'fr' | 'nl'
  /** Wanneer ingesteld, wordt het dossier in de mail vermeld zodat JP weet
   *  over welke commission de vraag gaat. */
  commissionId?: string
  labels: {
    title: string
    lead: string
    placeholder: string
    submit: string
    sending: string
    success: string
    successHint: string
  }
}

const initialState: SendMessageState = { status: 'idle' }

function SubmitButton({ submit, sending }: { submit: string; sending: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em] disabled:opacity-50"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      {pending ? sending : submit}
    </button>
  )
}

export default function MessageForm({ locale, commissionId, labels }: Props) {
  const [state, action] = useActionState(sendMessageToJP, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success' && formRef.current) {
      formRef.current.reset()
    }
  }, [state])

  return (
    <section className="bg-(--color-paper) border border-(--color-frame) p-6">
      <h2 className="text-base text-(--color-ink) font-[family-name:var(--font-display)] mb-1">
        {labels.title}
      </h2>
      <p className="text-sm text-(--color-charcoal) mb-4">{labels.lead}</p>

      {state.status === 'success' && (
        <div className="mb-4 inline-flex items-start gap-2 px-3 py-2 bg-(--color-bronze)/10 border border-(--color-bronze)/30 text-sm text-(--color-ink)">
          <CheckCircle2 className="w-4 h-4 text-(--color-bronze) shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{labels.success}</p>
            <p className="text-xs text-(--color-charcoal) mt-0.5">{labels.successHint}</p>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {state.message}
        </div>
      )}

      <form ref={formRef} action={action} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {commissionId && <input type="hidden" name="commission_id" value={commissionId} />}
        <textarea
          name="message"
          rows={5}
          required
          minLength={5}
          maxLength={5000}
          placeholder={labels.placeholder}
          className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
        />
        <SubmitButton submit={labels.submit} sending={labels.sending} />
      </form>
    </section>
  )
}
