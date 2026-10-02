import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ToastProvider } from './hooks/useToast.tsx'
import { SchoolProvider } from './hooks/useSchool'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SchoolProvider fallbackName="Punto de Venta">
      <ToastProvider>
        <App />
      </ToastProvider>
    </SchoolProvider>
  </StrictMode>,
)
