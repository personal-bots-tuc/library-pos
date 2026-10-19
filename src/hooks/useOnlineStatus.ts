import { useEffect, useState } from 'react';

/**
 * Detección PASIVA de conectividad (eventos del browser + navigator.onLine).
 * PROHIBIDO hacer pings periódicos al backend para detectar conexión:
 * un health-ping mantiene despiertos los servicios con App Sleep.
 */

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
