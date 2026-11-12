import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, RefreshCw, ShieldAlert } from 'lucide-react'

export type ConfirmVariant = 'danger' | 'warning' | 'info'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  onConfirm: () => void
  onCancel: () => void
}

const VARIANT_STYLES = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBtn: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
  },
  warning: {
    icon: RefreshCw,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500',
  },
  info: {
    icon: ShieldAlert,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBtn: 'bg-[#10298E] hover:bg-[#0b1f6b] focus-visible:ring-blue-500',
  },
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const v = VARIANT_STYLES[variant]
  const Icon = v.icon

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Top accent stripe */}
        <div className={`h-1 w-full ${variant === 'danger' ? 'bg-red-500' : variant === 'warning' ? 'bg-amber-400' : 'bg-[#10298E]'}`} />

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${v.iconBg}`}>
              <Icon size={20} className={v.iconColor} />
            </div>
            <div className="min-w-0">
              <h2
                id="confirm-title"
                className="text-base font-black text-[#10298E]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                {title}
              </h2>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>

          {/* Warning triangle for danger */}
          {variant === 'danger' && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              <AlertTriangle size={13} className="shrink-0" />
              This action cannot be undone.
            </div>
          )}

          {/* Buttons */}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[#e1cba5] bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-[#fef8e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className={`rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${v.confirmBtn}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
