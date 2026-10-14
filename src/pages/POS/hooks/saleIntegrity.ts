import api from '../../../api/client';
import { STORAGE_KEYS } from '@/hooks/authService';
import type { SaleLean } from './types';

/**
 * Integridad de ventas (anti-duplicados) — lado cliente.
 *
 * Contexto: el backend (api.old y api/) aún NO implementa idempotency key,
 * pero sus schemas Zod no son `.strict()`, así que enviamos `idempotencyKey`
 * desde ya: hoy se descarta silenciosamente y cuando el team back lo soporte
 * la deduplicación se activa sin cambios de front.
 *
 * Mientras tanto, ante un resultado INCIERTO (request enviado, respuesta
 * perdida) JAMÁS se reenvía a ciegas: primero se reconcilia contra
 * GET /sales del vendedor. Ver docs/agent/traps.md.
 */

export interface SaleAttempt {
  idempotencyKey: string;
  startedAt: number;
  items: { product: string; quantity: number }[];
  expectedTotal: number;
}

export function newSaleAttempt(
  items: { product: string; quantity: number }[],
  expectedTotal: number
): SaleAttempt {
  const key =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { idempotencyKey: key, startedAt: Date.now(), items, expectedTotal };
}

/** Error con `response` = el servidor respondió (rechazo real, NO duplica). */
export function isDefiniteServerError(err: unknown): boolean {
  return !!(err as { response?: unknown })?.response;
}

function currentSellerId(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    const user = raw ? (JSON.parse(raw) as { id?: string }) : null;
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function itemsSignature(items: { product: string; quantity: number }[]): string {
  return [...items]
    .map(i => `${i.product}:${i.quantity}`)
    .sort()
    .join('|');
}

interface ListSalesResponse {
  items?: SaleLean[];
  sales?: SaleLean[];
}

/**
 * Busca en las ventas recientes del vendedor una venta que matchee el intento
 * (mismo total, mismos ítems, creada desde que arrancó el intento).
 * Devuelve null si no hay coincidencia clara.
 */
export async function findMatchingSale(attempt: SaleAttempt): Promise<SaleLean | null> {
  const sellerId = currentSellerId();
  if (!sellerId) return null;

  const fromDate = new Date(attempt.startedAt - 5_000).toISOString();
  const { data } = await api.get('/sales', {
    params: {
      sellerId,
      fromDate,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  });

  const list: SaleLean[] =
    (data as ListSalesResponse)?.items ?? (data as ListSalesResponse)?.sales ?? [];
  const attemptSignature = itemsSignature(attempt.items);
  const notBefore = attempt.startedAt - 5_000;

  return (
    list.find(sale => {
      if (sale.type !== 'sale') return false;
      if (Math.abs(sale.total - attempt.expectedTotal) > 0.01) return false;
      if (new Date(sale.createdAt).getTime() < notBefore) return false;
      const saleSignature = itemsSignature(
        sale.items.map(i => ({ product: i.product, quantity: i.quantity }))
      );
      return saleSignature === attemptSignature;
    }) ?? null
  );
}
