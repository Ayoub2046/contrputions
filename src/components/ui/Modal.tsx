import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-bg-card border border-border p-4 sm:p-6 shadow-2xl max-h-[88vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4 sticky -top-4 sm:-top-6 -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-bg-card/95 backdrop-blur-sm border-b border-border/60 z-10">
          <h2 className="text-base sm:text-lg font-bold text-text truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center text-muted hover:text-text hover:bg-bg-elevated transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="pt-1">
          {children}
        </div>
      </div>
    </div>
  )
}
