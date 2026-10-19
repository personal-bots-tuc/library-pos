import { useMemo, type PropsWithChildren } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useAuth } from '../hooks/useAuth';
import { createQueryClient, shouldPersistQuery } from '../lib/queryClient';
import { createCachePersister, PERSIST_MAX_AGE } from '../lib/persistence';

/**
 * Provider raíz de datos. Se remonta cuando cambia la identidad
 * (schoolId:userId) para que cada usuario/tenant trabaje sobre su propio
 * cache persistido y nunca vea datos del usuario anterior en la misma PC.
 */
export function QueryProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const schoolId = user?.schoolId;
  const userId = user?.id;

  // Se recrea por identidad: al cambiar, se crea un QueryClient nuevo y el
  // anterior se descarta completo (cache en memoria incluido).
  const query = useMemo(() => {
    const identityKey = schoolId && userId ? `${schoolId}:${userId}` : 'anon';
    return {
      identityKey,
      client: createQueryClient(),
      persister: createCachePersister(identityKey),
    };
  }, [schoolId, userId]);

  return (
    <PersistQueryClientProvider
      key={query.identityKey}
      client={query.client}
      persistOptions={{
        persister: query.persister,
        maxAge: PERSIST_MAX_AGE,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
          // NUNCA persistir mutations: una mutation pausada restaurada tras
          // recargar se reintenta y se vuelve a persistir → venta "colgada"
          // eterna. Las escrituras son transitorias por diseño.
          shouldDehydrateMutation: () => false,
        },
      }}
      onSuccess={() => {
        // Cache hidratado: reanudar mutations pausadas por falta de red.
        void query.client.getMutationCache().resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
