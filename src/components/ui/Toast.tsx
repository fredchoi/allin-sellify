import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from '../icons'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 5
const AUTO_DISMISS_MS = 4000

const toastConfig: Record<ToastType, { icon: typeof CheckCircle; bg: string; border: string; iconColor: string }> = {
  success: { icon: CheckCircle, bg: 'bg-green-50', border: 'border-green-200', iconColor: 'text-green-500' },
  error: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', iconColor: 'text-red-500' },
  info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-500' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-500' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    counterRef.current += 1
    const id = `toast-${counterRef.current}`
    const newToast: Toast = { ...toast, id }

    setToasts((prev) => {
      const next = [...prev, newToast]
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next
    })

    setTimeout(() => removeToast(id), AUTO_DISMISS_MS)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* 토스트 컨테이너 */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const config = toastConfig[toast.type]
            const Icon = config.icon

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`pointer-events-auto flex w-80 items-start gap-3 rounded-xl border p-4 shadow-lg ${config.bg} ${config.border}`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                  {toast.message && (
                    <p className="mt-0.5 text-sm text-slate-600">{toast.message}</p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 rounded-md p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast는 ToastProvider 내부에서 사용해야 합니다')
  }
  return context
}
