'use client'

import { useActionState, useEffect, useLayoutEffect, useRef, useState } from 'react'
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

function SubmitButton({
  label,
  sending,
  disabled,
}: {
  label: string
  sending: string
  disabled: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center gap-2 px-7 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) transition-colors text-sm uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
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
  const [accepted, setAccepted] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<HTMLInputElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasInk, setHasInk] = useState(false)
  const [showAcceptError, setShowAcceptError] = useState(false)

  useEffect(() => {
    if (state.status === 'success') setHasSigned(true)
  }, [state.status])

  // Robuuste canvas-init: sync intrinsic size met layout size, ook bij resize.
  useLayoutEffect(() => {
    if (hasSigned) return
    const canvas = canvasRef.current
    if (!canvas) return

    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      // Bewaar bestaande tekening
      const ctx = canvas.getContext('2d')
      const prev =
        canvas.width > 0 && canvas.height > 0
          ? ctx?.getImageData(0, 0, canvas.width, canvas.height)
          : null

      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)

      if (ctx) {
        ctx.scale(dpr, dpr)
        ctx.lineWidth = 2.4
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = '#1c1916'
        if (prev) ctx.putImageData(prev, 0, 0)
      }
    }

    setupCanvas()
    const ro = new ResizeObserver(() => setupCanvas())
    ro.observe(canvas)
    window.addEventListener('orientationchange', setupCanvas)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', setupCanvas)
    }
  }, [hasSigned])

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    try {
      canvas.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    setDrawing(true)
    const p = getPos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    // Eén dot tekenen voor zeer korte tap zodat een klik-zonder-beweging
    // ook iets achterlaat
    ctx.lineTo(p.x + 0.01, p.y + 0.01)
    ctx.stroke()
    if (!hasInk) setHasInk(true)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = getPos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const endDraw = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) e.preventDefault()
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
    if (!accepted) {
      e.preventDefault()
      setShowAcceptError(true)
      return
    }
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

  const submitDisabled = !accepted || !hasInk

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
        <div
          className="bg-white border border-(--color-frame) overflow-hidden"
          style={{ touchAction: 'none' }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerCancel={endDraw}
            onPointerLeave={endDraw}
            style={{ touchAction: 'none', display: 'block' }}
            className="w-full h-44 cursor-crosshair select-none"
          />
        </div>
      </div>

      {/* Verplicht akkoord-vinkje */}
      <label
        className={`flex items-start gap-3 cursor-pointer px-4 py-3 border transition-colors ${
          accepted
            ? 'border-(--color-bronze) bg-(--color-bronze)/10'
            : showAcceptError
              ? 'border-red-500/60 bg-red-500/5'
              : 'border-(--color-frame) bg-(--color-paper) hover:border-(--color-stone)'
        }`}
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked)
            if (e.target.checked) setShowAcceptError(false)
          }}
          className="w-4 h-4 mt-0.5 accent-(--color-bronze) shrink-0"
        />
        <span className="text-sm text-(--color-ink)">
          {tt.acceptTerms} <span className="text-(--color-bronze)">*</span>
        </span>
      </label>

      {state.status === 'error' && (
        <div className="flex items-start gap-2 p-4 bg-red-950/40 border border-red-900 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{state.message}</p>
        </div>
      )}

      {showAcceptError && !accepted && (
        <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{tt.acceptRequired}</p>
        </div>
      )}

      <SubmitButton label={tt.signBtn} sending={tt.signing} disabled={submitDisabled} />
    </form>
  )
}
