import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface OrderActionDialogProps {
  title: string
  description: string
  confirmLabel: string
  noteLabel?: string
  isPending: boolean
  error: string | null
  onClose: () => void
  onSubmit: (note: string) => Promise<boolean>
}

export default function OrderActionDialog({
  title,
  description,
  confirmLabel,
  noteLabel,
  isPending,
  error,
  onClose,
  onSubmit,
}: OrderActionDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [note, setNote] = useState('')
  const titleId = useId()
  const descriptionId = useId()
  const noteId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (isPending || (noteLabel && note.trim().length < 3)) return
    if (await onSubmit(note.trim())) onClose()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        if (isPending) event.preventDefault()
        else onClose()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-orange-200 bg-white p-6 text-gray-800 shadow-card-lg backdrop:bg-petko-blue-dark/50"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2
            id={titleId}
            className="font-display text-xl font-extrabold text-petko-blue"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-petko-blue disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
        <p id={descriptionId} className="text-sm leading-relaxed text-gray-600">
          {description}
        </p>
        {noteLabel && (
          <div>
            <label
              htmlFor={noteId}
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              {noteLabel}
            </label>
            <textarea
              id={noteId}
              required
              minLength={3}
              maxLength={1000}
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={isPending}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-petko-blue focus:outline-none focus:ring-2 focus:ring-petko-blue/20"
            />
            <p className="mt-1 text-xs text-gray-500">
              3–1,000 characters. Please include the details needed to help.
            </p>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Go back
          </button>
          <button
            type="submit"
            disabled={isPending || Boolean(noteLabel && note.trim().length < 3)}
            className="rounded-xl bg-petko-blue px-4 py-2 text-sm font-bold text-white hover:bg-petko-blue-dark disabled:opacity-50"
          >
            {isPending ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
