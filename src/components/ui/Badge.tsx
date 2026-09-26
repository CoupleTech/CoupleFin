import { ReactNode } from 'react'

const variants = {
  success: 'bg-accent-50 text-accent-700 border-accent-100',
  warning: 'bg-warning-50 text-warning-600 border-warning-100',
  danger: 'bg-danger-50 text-danger-600 border-danger-100',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  info: 'bg-info-50 text-info-600 border-info-100',
  primary: 'bg-primary-50 text-primary-700 border-primary-100',
}

interface BadgeProps {
  variant?: keyof typeof variants
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export default function Badge({ variant = 'neutral', icon, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-0.5
        text-xs font-medium rounded-full border
        ${variants[variant]}
        ${className}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
