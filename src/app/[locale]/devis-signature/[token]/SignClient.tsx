'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Eraser, PenLine, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import { signDevis, type SignState } from './actions'

const initial: SignState = { status: 'idle' }

type Props = {
  locale: Locale
  t: Dictionary
  token: string
  defaultName: string
  alreadySigned: boolean
}

function SubmitButton({ label, sending }: { label: string; sending: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-7 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em] disabled:opacity-50"
    >
      <PenLine className="w-4 h-4" />
      {pending ? sending : label}
    </button>
  )
}

export default function SignClient({
  locale,
  t,
  token,
  defaultName,
  alreadySigned: initialAlreadySigned,
}: Props) {
  const tt = t.devisSign
  const [state, action] = useActionState(signDevis, initial)
  const [hasSigned, setHasSigned] = useState(initialAlreadySigned)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<HTMLInputElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasInk, setHasInk] = useState(false)

  // Re-render canvas when client succeeds, mark as signed
  useEffect(() => {
    if (state.status === 'success') setHasSigned(true)
  }, [state.status])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#1c1916'
    }
  }, [hasSigned])

  const getPos = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.setPointerCapture(e.pointerId)
    setDrawing(true)
    const p = getPos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = getPos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    if (!hasInk) setHasInk(true)
  }

  const endDraw = () => {
    setDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !hasInk || !dataRef.current) {
      e.preventDefault()
      return
    }
    dataRef.current.value = canvas.toDataURL('image/png')
  }

  if (hasSigned) {
    return (
      <div className="flex items-start gap-3 p-6 bg-(--color-paper) border border-(--color-bronze)/40">
        <CheckCircle2 className="w-6 h-6 text-(--color-bronze) shrink-0 mt-0.5" />
        <div>
          <p className="text-(--color-ink) text-lg font-[family-name:var(--font-display)] mb-2">
            {tt.signedTitle}
          </p>
          <p className="text-(--color-charcoal) text-sm leading-relaxed">{tt.signedBody}</p>
        </div>
      </div>
    )
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <input ref={dataRef} type="hidden" name="signature_data" value="" />

      <div>
        <label
          htmlFor="signer_name"
          className="block text-sm uppercase tracking-[0.2em] text-(--color-stone) mb-2"
        >
          {tt.signerNameLabel} <span className="text-(--color-bronze)">*</span>
        </label>
        <input
          id="signer_name"
          name="signer_name"
          type="text"
          required
          defaultValue={defaultName}
          className="w-full px-4 py-3 input-elev bg-(--color-paper) border border-(--color-frame) focus:border-(--color-bronze) focus:outline-none text-(--color-ink)"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm uppercase tracking-[0.2em] text-(--color-stone)">
            {tt.signaturePadLabel} <span className="text-(--color-bronze)">*</span>
          </label>
          <button
            type="button"
            onClick={clearCanvas}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-(--color-stone) hover:text-(--color-ink)"
          >
            <Eraser className="w-3.5 h-3.5" />
            {tt.clearSignature}
          </button>
        </div>
        <div className="bg-(--color-paper) border border-(--color-frame) overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerCancel={endDraw}
            onPointerLeave={endDraw}
            className="w-full h-44 cursor-crosshair touch-none select-none"
          />
        </div>
      </div>

      {state.status === 'error' && (
        <div className="flex items-start gap-2 p-4 bg-red-950/40 border border-red-900 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{state.message}</p>
        </div>
      )}

      <SubmitButton label={tt.signBtn} sending={tt.signing} />
    </form>
  )
}
