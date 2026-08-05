'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

type ToastType = 'success' | 'error' | 'info'
type ToastItem = { id: number; type: ToastType; message: string }

type ToastContextValue = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  success: () => {},
  error: () => {},
  info: () => {},
})

export const useToast = () => useContext(ToastContext)

let nextId = 1

const STYLES: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', icon: '✓' },
  error: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', icon: '✕' },
  info: { bg: '#fdf3e7', border: '#f5dcb8', color: '#c17f3e', icon: 'ℹ' },
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const recentRef = useRef(new Map<string, number>())

  const remove = useCallback((id: number) => {
    setToasts(previous => previous.filter(toast => toast.id !== id))
  }, [])

  const push = useCallback((type: ToastType, message: string) => {
    const now = Date.now()
    const key = `${type}:${message}`
    const previousTime = recentRef.current.get(key) || 0

    // Не складываем одинаковые ошибки друг на друга при повторном запросе.
    if (now - previousTime < 2500) return
    recentRef.current.set(key, now)

    const id = nextId++
    setToasts(previous => [
      ...previous.slice(-3),
      { id, type, message },
    ])

    window.setTimeout(() => remove(id), 4000)
  }, [remove])

  const success = useCallback((message: string) => {
    push('success', message)
  }, [push])

  const error = useCallback((message: string) => {
    push('error', message)
  }, [push])

  const info = useCallback((message: string) => {
    push('info', message)
  }, [push])

  const value = useMemo<ToastContextValue>(() => ({
    success,
    error,
    info,
  }), [success, error, info])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', zIndex:2000, display:'flex', flexDirection:'column', gap:'8px', width:'min(420px, calc(100vw - 32px))', pointerEvents:'none' }}>
        {toasts.map(toast => {
          const style = STYLES[toast.type]
          return (
            <div key={toast.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px', background:style.bg, border:`1px solid ${style.border}`, borderRadius:'12px', color:style.color, fontSize:'14px', fontWeight:500, boxShadow:'0 4px 16px rgba(0,0,0,0.08)', pointerEvents:'auto' }}>
              <span style={{ fontSize:'15px', flexShrink:0 }}>{style.icon}</span>
              <span style={{ flex:1 }}>{toast.message}</span>
              <button onClick={() => remove(toast.id)} aria-label="Закрыть" style={{ background:'none', border:'none', cursor:'pointer', color:style.color, fontSize:'18px', padding:0, lineHeight:1, opacity:0.5, flexShrink:0 }}>×</button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
