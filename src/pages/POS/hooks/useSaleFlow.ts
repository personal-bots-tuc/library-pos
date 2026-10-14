import { useCallback, useRef } from 'react';
import type { CartItem } from '../components/Cart/types';
import type { Client } from '../components/types';
import type { SaleLean, PreviewSaleResult, ReceiptData } from './types';

type PaymentMethod = 'cash' | 'transfer' | 'credit';

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

      // Validación de stock en el servidor antes de confirmar la venta
      const amountReceivedNum =
        paymentMethod === 'cash' || paymentMethod === 'transfer'
          ? parseFloat(amountReceived) || total
          : total;
      await previewSale({
        items,
        clientId: selectedClient?.id,
        discount: discountAmount,
        paymentMethod,
        amountReceived: amountReceivedNum,
      });

      const { sale } = await checkout({
        items,
        clientId: selectedClient?.id,
        discount: discountAmount,
        paymentMethod,
        amountReceived: amountReceivedNum,
        expectedTotal: total,
      });

      openReceipt(buildReceiptData(sale));
      clearCart();
      await refetchProducts();
      await refetchShift();
      showSuccess('Venta procesada correctamente');
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
