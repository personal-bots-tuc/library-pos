import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import { useSyncGate } from '@/hooks/useSyncGate';
import type { UseShiftResult } from './types';
import type { CashShift, ShiftAggregated } from '../components/types';
import type { CashMovementAggregated } from '../components/CashMovementModal/types';

export const SHIFT_QUERY_KEY = ['cash-shifts', 'active'] as const;
/** Turno activo: poll cada 60s solo con turno abierto + compuertas (aprobado). */
export const SHIFT_POLL_INTERVAL_MS = 60_000;

interface ActiveShiftResponse {
  cashShift: CashShift | null;
  aggregated: ShiftAggregated | null;
}

function toMessage(err: unknown): string | null {
  if (!err) return null;
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    'Error de red al operar turno'
  );
}

/**
 * Turno de caja — query NO persistida (dato volátil de negocio).
 * Poll de 60s solo cuando: hay turno abierto ∧ pestaña visible ∧ usuario
 * activo en los últimos 10 min. El foco de la ventana dispara refetch
 * inmediato (refetchOnWindowFocus), cubriendo el cierre remoto desde admin.
 */
export function useShift(): UseShiftResult {
  const queryClient = useQueryClient();
  const syncAllowed = useSyncGate();

  const query = useQuery({
    queryKey: SHIFT_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get('/cash-shifts/active');
      return data as ActiveShiftResponse;
    },
    staleTime: 0,
    refetchInterval: q => (syncAllowed && q.state.data?.cashShift ? SHIFT_POLL_INTERVAL_MS : false),
  });

  const openMutation = useMutation({
    mutationFn: async (openingAmount: number) => {
      await api.post('/cash-shifts/open', { openingAmount });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY }),
  });

  const closeMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      closingAmount: number;
      note?: string;
      aggregated?: CashMovementAggregated;
    }) => {
      await api.post(`/cash-shifts/${params.id}/close`, {
        closingAmount: params.closingAmount,
        note: params.note || '',
        aggregated: params.aggregated,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY }),
  });

  const activeShift = query.data?.cashShift ?? null;

  const openShift = async (openingAmount: number) => {
    await openMutation.mutateAsync(openingAmount);
  };

  const closeShift = async (
    closingAmount: number,
    note?: string,
    aggregated?: CashMovementAggregated
  ) => {
    if (!activeShift) return;
    await closeMutation.mutateAsync({
      id: activeShift.id,
      closingAmount,
      note,
      aggregated,
    });
  };

  return {
    activeShift,
    shiftStats: query.data?.aggregated ?? null,
    loading: query.isPending,
    error: toMessage(query.error ?? openMutation.error ?? closeMutation.error),
    openShift,
    closeShift,
    refetch: async () => {
      await query.refetch();
    },
  };
}
