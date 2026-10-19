import { useMutation } from '@tanstack/react-query';
import api from '../../../api/client';
import type { UseReturnResult, SaleLean } from './types';

function errorMessage(err: unknown): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    'Error al procesar la devolución'
  );
}

/** Contrato del API: items viajan como `{ productId, quantity }`. */
function toWireItems(
  items: { product: string; quantity: number }[]
): { productId: string; quantity: number }[] {
  return items.map(i => ({ productId: i.product, quantity: i.quantity }));
}

export function useReturn(): UseReturnResult {
  const mutation = useMutation({
    mutationFn: async (params: {
      items: { product: string; quantity: number }[];
      clientId?: string;
      method: 'cash' | 'transfer' | 'credit';
    }) => {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `return-${Date.now()}`;
      const { data } = await api.post('/sales/returns', {
        items: toWireItems(params.items),
        clientId: params.clientId,
        method: params.method,
        // Hoy el back lo descarta (Zod sin .strict()); activa deduplicación
        // cuando el team back lo soporte.
        idempotencyKey,
      });
      return { sale: data.sale as SaleLean };
    },
  });

  const createReturn = async (params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    method: 'cash' | 'transfer' | 'credit';
  }) => {
    try {
      return await mutation.mutateAsync(params);
    } catch (err) {
      throw new Error(errorMessage(err), { cause: err });
    }
  };

  return {
    createReturn,
    loading: mutation.isPending,
    error: mutation.error ? errorMessage(mutation.error) : null,
  };
}
