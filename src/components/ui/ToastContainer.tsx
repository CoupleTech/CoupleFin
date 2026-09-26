import { useToastStore, ToastType } from '../../store/useToastStore'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const toastStyles: Record<ToastType, string> = {
  success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  error: 'bg-danger-50 text-danger-900 border-danger-200',
  warning: 'bg-warning-50 text-warning-900 border-warning-200',
  info: 'bg-blue-50 text-blue-900 border-blue-200'
}

const iconStyles: Record<ToastType, any> = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 text-danger-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-warning-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm sm:w-auto sm:min-w-[320px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 p-4 rounded-xl border shadow-lg
            transform transition-all duration-300 animate-in slide-in-from-top-2 fade-in
            ${toastStyles[toast.type]}
          `}
        >
          <div className="shrink-0 mt-0.5">
            {iconStyles[toast.type]}
          </div>
          <div className="flex-1 text-sm font-medium pt-0.5 leading-tight">
            {toast.message}
          </div>
          <button 
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
