import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';
import { useSyncGate } from '@/hooks/useSyncGate';
import type { UseProductsResult } from './types';
import type { Product } from '../components/types';

export const PRODUCTS_QUERY_KEY = 'products';
/** Catálogo: sync cada 10 min con compuertas abiertas (parámetro aprobado). */
export const PRODUCTS_SYNC_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Catálogo de productos — query PERSISTIDA en IndexedDB.
 * La búsqueda se filtra client-side (ProductSearch ya lo hace): no se envía
 * `search` al servidor, eliminando un request por tecla.
 */
export function useProducts(limit = 100): UseProductsResult {
  const syncAllowed = useSyncGate();

  const query = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, 'list', limit],
    queryFn: async () => {
      const { data } = await api.get('/products', { params: { limit } });
      return (data.items ?? []) as Product[];
    },
    staleTime: 5 * 60_000,
    refetchInterval: syncAllowed ? PRODUCTS_SYNC_INTERVAL_MS : false,
    // refetchIntervalInBackground: false (default del client) — jamás en tab oculta.
  });

  return {
    products: query.data ?? [],
    loading: query.isPending,
    error: query.error
      ? ((query.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al cargar productos')
      : null,
    refetch: async () => {
      await query.refetch();
    },
  };
}
