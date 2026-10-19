import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import type {
  CashMovement,
  CashMovementAggregated,
  CashMovementType,
  CashMovementCategory,
} from '../components/CashMovementModal/types';

interface UseCashMovementsResult {
  movements: CashMovement[];
  aggregated: CashMovementAggregated | null;
  loading: boolean;
  error: string | null;
  createMovement: (_data: {
    type: CashMovementType;
    category: CashMovementCategory;
    amount: number;
    description: string;
  }) => Promise<void>;
  fetchMovements: () => Promise<void>;
  fetchAggregated: () => Promise<void>;
}

function toMessage(err: unknown): string | null {
  if (!err) return null;
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    'Error de red en movimientos de caja'
  );
}

export function useCashMovements(shiftId: string | null): UseCashMovementsResult {
  const queryClient = useQueryClient();
  const baseKey = ['cash-shifts', shiftId, 'movements'] as const;

  const movementsQuery = useQuery({
    queryKey: baseKey,
    queryFn: async () => {
      const { data } = await api.get(`/cash-shifts/${shiftId}/movements`);
      return data as CashMovement[];
    },
    enabled: !!shiftId,
  });

  const aggregatedQuery = useQuery({
    queryKey: [...baseKey, 'aggregated'] as const,
    queryFn: async () => {
      const { data } = await api.get(`/cash-shifts/${shiftId}/movements/aggregated`);
      return data as CashMovementAggregated;
    },
    enabled: !!shiftId,
  });

  const createMutation = useMutation({
    mutationFn: async (movementData: {
      type: CashMovementType;
      category: CashMovementCategory;
      amount: number;
      description: string;
    }) => {
      await api.post(`/cash-shifts/${shiftId}/movements`, movementData);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: baseKey }),
        queryClient.invalidateQueries({ queryKey: [...baseKey, 'aggregated'] }),
      ]);
    },
  });

  const createMovement = async (movementData: {
    type: CashMovementType;
    category: CashMovementCategory;
    amount: number;
    description: string;
  }) => {
    if (!shiftId) throw new Error('No hay turno activo');
    await createMutation.mutateAsync(movementData);
  };

  return {
    movements: movementsQuery.data ?? [],
    aggregated: aggregatedQuery.data ?? null,
    loading: movementsQuery.isPending || createMutation.isPending,
    error: toMessage(movementsQuery.error ?? createMutation.error),
    createMovement,
    fetchMovements: async () => {
      if (shiftId) await movementsQuery.refetch();
    },
    fetchAggregated: async () => {
      if (shiftId) await aggregatedQuery.refetch();
    },
  };
}
