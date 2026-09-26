import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full min-w-0">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-1.5 truncate"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full max-w-full border rounded-lg px-3 py-2.5 text-sm
              bg-white text-slate-800
              placeholder:text-slate-400
              transition-all duration-fast
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${error
                ? 'border-danger-500 focus:ring-danger/20 focus:border-danger-500'
                : 'border-slate-200 hover:border-slate-300'
              }
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-danger-600">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
