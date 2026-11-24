import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={effectiveType}
          className={cn(
            'block w-full rounded-btn bg-bg-card border px-3 py-2 text-sm text-text transition-colors placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-600/30',
            isPassword ? 'pr-10' : '',
            error ? 'border-error focus:ring-error/30' : 'border-border-hover',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-text transition-colors rounded-full focus:outline-none cursor-pointer"
            title={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  )
}
