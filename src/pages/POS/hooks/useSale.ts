import { useMutation } from '@tanstack/react-query';
import api from '../../../api/client';
import type { UseSaleResult, SaleLean, PreviewSaleResult } from './types';
import {
  findMatchingSale,
  isDefiniteServerError,
  newSaleAttempt,
  type SaleAttempt,
} from './saleIntegrity';

interface CheckoutParams {
  items: { product: string; quantity: number }[];
  clientId?: string;
  discount: number;
  paymentMethod: 'cash' | 'transfer' | 'credit';
  amountReceived: number;
  /** Total esperado calculado en cliente; solo se usa para reconciliación. */
  expectedTotal?: number;
  /** Attempt compartido con el flujo (watchdog/reconciliación reutilizan key). */
  attempt?: SaleAttempt;
}

interface PreviewParams {
  items: { product: string; quantity: number }[];
  clientId?: string;
  discount: number;
  paymentMethod: 'cash' | 'transfer' | 'credit';
  amountReceived?: number;
}

function extractMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

async function postSale(
  payload: Record<string, unknown>
): Promise<{ total: number; change: number; sale: SaleLean }> {
  const { data } = await api.post('/sales', payload);
  return { total: data.sale.total, change: data.sale.change, sale: data.sale as SaleLean };
}

function buildPayload(params: CheckoutParams, idempotencyKey: string) {
  return {
    items: params.items,
    clientId: params.clientId,
    discount: params.discount,
    paymentMethod: params.paymentMethod,
    amountReceived:
      params.paymentMethod === 'cash' || params.paymentMethod === 'transfer'
        ? params.amountReceived
        : undefined,
    // Viaja desde ya; hoy el back lo descarta (Zod sin .strict()). Cuando el
    // team back lo soporte, la deduplicación se activa sin cambios aquí.
    idempotencyKey,
  };
}

/**
 * venta con protección anti-duplicados:
 *  1. mutation retry:0 (default del client) — nunca reintenta a ciegas
 *  2. idempotencyKey estable por intento
 *  3. resultado incierto (red cortada a mitad del POST) → reconcilia contra
 *     GET /sales antes de reenviar el mismo idempotencyKey
 *  4. offline → la mutation queda pausada y se dispara sola al reconectar
 *     (networkMode:'online'), sin ninguna acción del cajero
 */
export function useSale(): UseSaleResult {
  const checkoutMutation = useMutation({
    mutationFn: async (params: CheckoutParams) => {
      const attempt =
        params.attempt ??
        newSaleAttempt(params.items, params.expectedTotal ?? params.amountReceived);
      const payload = buildPayload(params, attempt.idempotencyKey);

      try {
        return await postSale(payload);
      } catch (firstErr) {
        // Rechazo real del servidor (validación, stock, etc.): la venta NO se
        // creó; propagar sin reintentar.
        if (isDefiniteServerError(firstErr)) throw firstErr;

        // Resultado incierto: el server pudo haber creado la venta pero la
        // respuesta se perdió. Reconciliar ANTES de cualquier reenvío.
        const existing = await findMatchingSale(attempt).catch(() => null);
        if (existing) {
          return { total: existing.total, change: existing.change, sale: existing };
        }

        // No existe: es seguro reenviar UNA vez con el mismo idempotencyKey.
        try {
          return await postSale(payload);
        } catch (secondErr) {
          if (isDefiniteServerError(secondErr)) throw secondErr;
          const afterRetry = await findMatchingSale(attempt).catch(() => null);
          if (afterRetry) {
            return { total: afterRetry.total, change: afterRetry.change, sale: afterRetry };
          }
          throw new Error(
            'Sin conexión estable. La venta no se pudo confirmar; verifique el listado de ventas antes de reintentar.',
            { cause: secondErr }
          );
        }
      }
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (params: PreviewParams) => {
      const { data } = await api.post('/sales/preview', {
        items: params.items,
        clientId: params.clientId,
        discount: params.discount,
        paymentMethod: params.paymentMethod,
        amountReceived: params.amountReceived,
      });
      return data as PreviewSaleResult;
    },
  });

  const checkout = async (params: CheckoutParams) => {
    try {
      return await checkoutMutation.mutateAsync(params);
    } catch (err) {
      throw new Error(
        extractMessage(err, (err as Error)?.message || 'Error al procesar la venta'),
        { cause: err }
      );
    }
  };

  const previewSale = async (params: PreviewParams): Promise<PreviewSaleResult> => {
    try {
      return await previewMutation.mutateAsync(params);
    } catch (err) {
      throw new Error(extractMessage(err, 'Error al validar la venta'), { cause: err });
    }
  };

  const mutationError = checkoutMutation.error ?? previewMutation.error;

  return {
    checkout,
    previewSale,
    loading: checkoutMutation.isPending || previewMutation.isPending,
    error: mutationError ? extractMessage(mutationError, 'Error al procesar la venta') : null,
  };
}
