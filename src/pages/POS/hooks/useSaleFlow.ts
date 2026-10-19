import { useCallback, useRef } from 'react';
import type { CartItem } from '../components/Cart/types';
import type { Client } from '../components/types';
import type { SaleLean, PreviewSaleResult, ReceiptData } from './types';
import { findMatchingSale, newSaleAttempt, type SaleAttempt } from './saleIntegrity';

/** Reloj de guardia del cobro: si pasan 30s sin respuesta (API dormida/caída),
 *  el flujo se destraba solo y reconcilia — jamás queda el POS bloqueado. */
export const CHECKOUT_WATCHDOG_MS = 30_000;
const WATCHDOG_SENTINEL = '__watchdog_timeout__' as const;

type PaymentMethod = 'cash' | 'transfer' | 'credit';

async function runCheckoutPipeline(input: {
  previewSale: (_params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    discount: number;
    paymentMethod: PaymentMethod;
    amountReceived?: number;
  }) => Promise<PreviewSaleResult>;
  checkout: SaleFlowDeps['checkout'];
  items: { product: string; quantity: number }[];
  clientId?: string;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  amountReceivedNum: number;
  total: number;
  attempt: SaleAttempt;
}) {
  // Validación de stock en el servidor antes de confirmar la venta
  await input.previewSale({
    items: input.items,
    clientId: input.clientId,
    discount: input.discountAmount,
    paymentMethod: input.paymentMethod,
    amountReceived: input.amountReceivedNum,
  });
  return input.checkout({
    items: input.items,
    clientId: input.clientId,
    discount: input.discountAmount,
    paymentMethod: input.paymentMethod,
    amountReceived: input.amountReceivedNum,
    expectedTotal: input.total,
    attempt: input.attempt,
  });
}

export interface SaleFlowDeps {
  activeShift: { id: string } | null;
  cart: CartItem[];
  selectedClient: Client | null;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  amountReceived: string;
  subtotal: number;
  total: number;
  checkout: (_params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    discount: number;
    paymentMethod: PaymentMethod;
    amountReceived: number;
    expectedTotal?: number;
    attempt?: SaleAttempt;
  }) => Promise<{ total: number; change: number; sale: SaleLean }>;
  previewSale: (_params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    discount: number;
    paymentMethod: PaymentMethod;
    amountReceived?: number;
  }) => Promise<PreviewSaleResult>;
  clearCart: () => void;
  refetchProducts: () => Promise<void>;
  refetchShift: () => Promise<void>;
  showError: (_msg: string) => void;
  showSuccess: (_msg: string) => void;
  openReceipt: (_data: ReceiptData) => void;
}

interface CheckoutInput {
  activeShift: { id: string } | null;
  cart: CartItem[];
  selectedClient: Client | null;
  paymentMethod: PaymentMethod;
  amountReceived: string;
  total: number;
}

function validateCheckoutInput(input: CheckoutInput): string | null {
  if (!input.activeShift) return 'Debe abrir un turno de caja primero';
  if (input.cart.length === 0) return 'empty-cart';
  if (input.paymentMethod === 'credit' && !input.selectedClient) {
    return 'Seleccione un cliente para venta a crédito';
  }
  if (input.paymentMethod === 'cash' || input.paymentMethod === 'transfer') {
    const received = input.amountReceived ? parseFloat(input.amountReceived) : input.total;
    if (received < input.total) return 'Monto recibido insuficiente';
  }
  return null;
}

function buildReceiptData(sale: SaleLean): ReceiptData {
  return {
    number: sale.number,
    type: 'sale',
    items: sale.items,
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    amountReceived: sale.amountReceived,
    change: sale.change,
    client: sale.client ?? null,
    seller: sale.seller,
    createdAt: sale.createdAt,
  };
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Error al procesar la venta';
}

type WatchdogOutcome = { ok: true; sale: SaleLean } | typeof WATCHDOG_SENTINEL;

async function settleCheckout(
  input: Parameters<typeof runCheckoutPipeline>[0]
): Promise<WatchdogOutcome> {
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<typeof WATCHDOG_SENTINEL>(resolve => {
    watchdog = setTimeout(() => resolve(WATCHDOG_SENTINEL), CHECKOUT_WATCHDOG_MS);
  });
  try {
    return await Promise.race([
      runCheckoutPipeline(input).then(r => ({ ok: true as const, sale: r.sale })),
      timeoutPromise,
    ]);
  } finally {
    if (watchdog) clearTimeout(watchdog);
  }
}

/** Tras el watchdog: si la venta se terminó creando en el server, se recupera;
 *  si no, el flow informa y libera. Nunca se reenvía a ciegas acá — eso ya lo
 *  resuelve la reconciliación interna de useSale. */
async function resolveAfterWatchdog(attempt: SaleAttempt): Promise<{ sale: SaleLean } | null> {
  const found = await findMatchingSale(attempt).catch(() => null);
  return found ? { sale: found } : null;
}

interface FinishDeps {
  openReceipt: (_data: ReceiptData) => void;
  clearCart: () => void;
  refetchProducts: () => Promise<void>;
  refetchShift: () => Promise<void>;
  showError: (_msg: string) => void;
  showSuccess: (_msg: string) => void;
}

async function completeSale(sale: SaleLean, helpers: FinishDeps) {
  helpers.openReceipt(buildReceiptData(sale));
  helpers.clearCart();
  await helpers.refetchProducts();
  await helpers.refetchShift();
  helpers.showSuccess('Venta procesada correctamente');
}

async function finishCheckout(outcome: WatchdogOutcome, attempt: SaleAttempt, helpers: FinishDeps) {
  if (outcome === WATCHDOG_SENTINEL) {
    // 30s sin respuesta: el POS no se queda bloqueado. Reconciliamos.
    helpers.showError(
      'La venta está tardando demasiado. Se está verificando si llegó a registrarse…'
    );
    const recovered = await resolveAfterWatchdog(attempt);
    if (recovered) {
      await completeSale(recovered.sale, helpers);
    } else {
      helpers.showError(
        'No se pudo confirmar la venta. Revisá el historial de ventas antes de volver a cobrar.'
      );
    }
    return;
  }
  await completeSale(outcome.sale, helpers);
}

export function useSaleFlow(deps: SaleFlowDeps) {
  const {
    activeShift,
    cart,
    selectedClient,
    discountAmount,
    paymentMethod,
    amountReceived,
    total,
    checkout,
    previewSale,
    clearCart,
    refetchProducts,
    refetchShift,
    showError,
    showSuccess,
    openReceipt,
  } = deps;

  // Lock sincrónico anti doble-submit: el state `loading` de React llega un
  // render tarde; dos eventos (click + F9) en el mismo frame pasarían los dos.
  const inFlightRef = useRef(false);

  const handleCheckout = useCallback(async () => {
    if (inFlightRef.current) return;

    const invalidReason = validateCheckoutInput({
      activeShift,
      cart,
      selectedClient,
      paymentMethod,
      amountReceived,
      total,
    });
    if (invalidReason === 'empty-cart') return;
    if (invalidReason) {
      showError(invalidReason);
      return;
    }

    inFlightRef.current = true;
    try {
      const items = cart.map(item => ({
        product: item.product,
        quantity: item.quantity,
      }));

      const attempt = newSaleAttempt(items, total);
      const amountReceivedNum =
        paymentMethod === 'cash' || paymentMethod === 'transfer'
          ? parseFloat(amountReceived) || total
          : total;

      const outcome = await settleCheckout({
        previewSale,
        checkout,
        items,
        clientId: selectedClient?.id,
        discountAmount,
        paymentMethod,
        amountReceivedNum,
        total,
        attempt,
      });

      await finishCheckout(outcome, attempt, {
        openReceipt,
        clearCart,
        refetchProducts,
        refetchShift,
        showError,
        showSuccess,
      });
    } catch (err) {
      showError(extractMessage(err));
    } finally {
      inFlightRef.current = false;
    }
  }, [
    activeShift,
    cart,
    selectedClient,
    discountAmount,
    paymentMethod,
    amountReceived,
    total,
    checkout,
    previewSale,
    clearCart,
    refetchProducts,
    refetchShift,
    showError,
    showSuccess,
    openReceipt,
  ]);

  return { handleCheckout };
}
