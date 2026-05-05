'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Camera, CheckCircle2, Loader2, AlertTriangle, Send, X } from 'lucide-react'
import {
  addProgressUpdate,
  type AddProgressState,
} from '@/app/admin/(authed)/commissions/actions'

type Props = {
  commissionId: string
}

const initialState: AddProgressState = { status: 'idle' }

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="inline-flex items-center gap-2 px-5 py-3 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.18em] disabled:opacity-50"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      {pending
        ? 'Envoi…'
        : count > 0
          ? `Envoyer ${count} photo${count > 1 ? 's' : ''}`
          : 'Sélectionnez d’abord des photos'}
    </button>
  )
}

export default function ProgressUploadForm({ commissionId }: Props) {
  const [state, action] = useActionState(addProgressUpdate, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')

  useEffect(() => {
    if (state.status === 'success' && formRef.current) {
      formRef.current.reset()
      setFiles([])
      setPreviews([])
      setCaption('')
    }
  }, [state])

  // Object URLs revoken op cleanup
  useEffect(() => {
    return () => {
      for (const url of previews) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? [])
    // Cleanup previous previews
    for (const u of previews) URL.revokeObjectURL(u)
    setFiles(list)
    setPreviews(list.map((f) => URL.createObjectURL(f)))
  }

  function removeAt(idx: number) {
    URL.revokeObjectURL(previews[idx])
    const newFiles = files.filter((_, i) => i !== idx)
    const newPreviews = previews.filter((_, i) => i !== idx)
    setFiles(newFiles)
    setPreviews(newPreviews)

    // Sync naar het echte input element via DataTransfer
    if (fileInputRef.current) {
      const dt = new DataTransfer()
      newFiles.forEach((f) => dt.items.add(f))
      fileInputRef.current.files = dt.files
    }
  }

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="id" value={commissionId} />

      {state.status === 'success' && (
        <div className="inline-flex items-start gap-2 px-3 py-2 bg-(--color-bronze)/10 border border-(--color-bronze)/30 text-sm text-(--color-ink)">
          <CheckCircle2 className="w-4 h-4 text-(--color-bronze) shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Photos envoyées</p>
            <p className="text-xs text-(--color-charcoal) mt-0.5">
              Le client a reçu une notification par e-mail.
            </p>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="inline-flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {state.message}
        </div>
      )}

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2 inline-flex items-center gap-2">
          <Camera className="w-3.5 h-3.5" />
          Photos (max 8 · 10 MB chacune)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          name="files"
          accept="image/*"
          multiple
          required
          onChange={onFilesPicked}
          className="block w-full text-sm text-(--color-charcoal) file:mr-3 file:py-2 file:px-4 file:border-0 file:bg-(--color-bronze) file:text-white file:text-xs file:uppercase file:tracking-[0.15em] hover:file:bg-(--color-bronze-dark) file:cursor-pointer"
        />
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {previews.map((url, i) => (
            <div
              key={url}
              className="relative aspect-square border border-(--color-frame) overflow-hidden bg-(--color-canvas) group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={files[i]?.name ?? ''} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 bg-(--color-ink)/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Retirer cette photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Mot d’accompagnement (optionnel)
        </label>
        <textarea
          name="caption"
          rows={3}
          maxLength={1000}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Ex. : « J'ai commencé le fond aujourd'hui, voici un premier aperçu… »"
          className="w-full px-4 py-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
        />
      </div>

      <SubmitButton count={files.length} />
      <p className="text-[10px] text-(--color-stone) italic">
        Le client recevra un e-mail avec un aperçu et un lien vers son dossier. Il peut répondre directement à ce mail.
      </p>
    </form>
  )
}
