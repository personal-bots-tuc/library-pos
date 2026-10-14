import { useMutation } from '@tanstack/react-query';
import api from '../../../api/client';
import type { UseQuotesResult, QuoteLean } from './types';

function errorMessage(err: unknown): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    'Error al generar el presupuesto'
  );
}

export function useQuotes(): UseQuotesResult {
  const mutation = useMutation({
    mutationFn: async (params: {
      items: { product: string; quantity: number }[];
      clientId?: string;
      discount: number;
    }) => {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `quote-${Date.now()}`;
      const { data } = await api.post('/quotes', {
        items: params.items,
        clientId: params.clientId,
        discount: params.discount,
        // Hoy el back lo descarta (Zod sin .strict()); activa deduplicación
        // cuando el team back lo soporte.
        idempotencyKey,
      });
      return data.quote as QuoteLean;
    },
  });

  const createQuote = async (params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    discount: number;
  }) => {
    try {
      return await mutation.mutateAsync(params);
    } catch (err) {
      throw new Error(errorMessage(err), { cause: err });
    }
  };

  return {
    createQuote,
    loading: mutation.isPending,
    error: mutation.error ? errorMessage(mutation.error) : null,
  };
}
