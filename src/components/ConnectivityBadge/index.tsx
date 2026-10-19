import { useEffect, useRef, useState } from 'react';
import { useIsMutating, useMutationState } from '@tanstack/react-query';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Badge de conectividad — icono informativo, SIN acciones del usuario.
 *
 * Estados:
 *  - Offline: ámbar persistente. Las escrituras quedan en pausa y se
 *    completan solas al reconectar (React Query networkMode:'online').
 *  - Recuperación: verde por 3s tras volver la conexión.
 *  - Guardando (mutation en vuelo): azul sutil.
 *  - Online en reposo: no renderiza nada.
 *
 * Detección 100% pasiva (eventos del browser + estado de React Query).
 * PROHIBIDO agregar health-pings acá (romperían Railway App Sleep).
 */
export function ConnectivityBadge() {
  const online = useOnlineStatus();
  const pendingMutations = useIsMutating();
  // Mutation pausada = la request falló por red y React Query la reintentará
  // sola al reconectar. Hay que decirlo claramente: NO es que "no pasa nada".
  const pausedMutations = useMutationState({
    select: mutation => mutation.state.isPaused,
  }).filter(Boolean).length;
  const [justRecovered, setJustRecovered] = useState(false);
  const wasOfflineRef = useRef(!online);

  useEffect(() => {
    if (online && wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setJustRecovered(true);
      const timeout = setTimeout(() => setJustRecovered(false), 3_000);
      return () => clearTimeout(timeout);
    }
    if (!online) wasOfflineRef.current = true;
    return undefined;
  }, [online]);

  if (!online) {
    return (
      <output
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-white" />
        Sin conexión — se completa solo al reconectar
      </output>
    );
  }

  if (justRecovered) {
    return (
      <output
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-white" />
        Conexión recuperada
      </output>
    );
  }

  if (pendingMutations > 0) {
    return (
      <output
        aria-live="polite"
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-lg ${
          pausedMutations > 0 ? 'bg-amber-500' : 'bg-sky-600'
        }`}
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
        {pausedMutations > 0 ? 'Guardando — se enviará solo al recuperar conexión' : 'Guardando…'}
      </output>
    );
  }

  return null;
}
