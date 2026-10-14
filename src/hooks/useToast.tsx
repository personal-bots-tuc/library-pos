import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Toast from '../components/Toast/Toast';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
}

interface ToastContextValue {
  success: (_message: string) => void;
  error: (_message: string) => void;
  warning: (_message: string) => void;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = (message: string, type: ToastItem['type']) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  return (
    <ToastContext.Provider
      value={{
        success: message => addToast(message, 'success'),
        error: message => addToast(message, 'error'),
        warning: message => addToast(message, 'warning'),
        toasts,
      }}
    >
      {children}
      {/* Viewport: sin esto los toasts se agregaban al estado pero NUNCA se
          renderizaban — todos los errores del POS eran invisibles (POS-108). */}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col items-end gap-2">
        {toasts.map(t => (
          <Toast key={t.id} kind={t.type} message={t.message} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
