import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-12 sm:p-16 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-50 rounded-2xl flex items-center justify-center mb-5">
        <div className="text-primary w-8 h-8 sm:w-10 sm:h-10">
          {icon}
        </div>
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  )
}
