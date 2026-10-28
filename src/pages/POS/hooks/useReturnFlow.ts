import { useCallback } from 'react';
import type { CartItem } from '../components/Cart/types';
import type { Client } from '../components/types';
import type { ReceiptData, SaleLean } from './types';

type PaymentMethod = 'cash' | 'transfer' | 'credit';

export interface ReturnFlowDeps {
  activeShift: { id: string } | null;
  cart: CartItem[];
  paymentMethod: PaymentMethod;
  selectedClient: Client | null;
  createReturn: (_params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    method: PaymentMethod;
  }) => Promise<{ sale: SaleLean }>;
  resetSale: () => void;
  refetchProducts: () => Promise<void>;
  refetchShift: () => Promise<void>;
  openReceipt: (_data: ReceiptData) => void;
  showError: (_msg: string) => void;
  showSuccess: (_msg: string) => void;
}

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function useReturnFlow(deps: ReturnFlowDeps) {
  const {
    activeShift,
    cart,
    paymentMethod,
    selectedClient,
    createReturn,
    resetSale,
    refetchProducts,
    refetchShift,
    openReceipt,
    showError,
    showSuccess,
  } = deps;

  const handleCheckoutReturn = useCallback(async () => {
    if (!activeShift) {
      showError('Debe abrir un turno de caja primero');
      return;
    }
    if (cart.length === 0) return;
    if (paymentMethod === 'credit' && !selectedClient) {
      showError('Seleccione un cliente para devolución a crédito');
      return;
    }

    try {
      const items = cart.map(item => ({
        product: item.product,
        quantity: item.quantity,
      }));

      const { sale } = await createReturn({
        items,
        clientId: selectedClient?.id,
        method: paymentMethod,
      });

      openReceipt({
        number: sale.number,
        type: 'return',
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
      });
      resetSale();
      await refetchProducts();
      await refetchShift();
      showSuccess('Devolución procesada correctamente');
    } catch (err) {
      showError(messageOf(err, 'Error al procesar la devolución'));
    }
  }, [
    activeShift,
    cart,
    paymentMethod,
    selectedClient,
    createReturn,
    resetSale,
    refetchProducts,
    refetchShift,
    openReceipt,
    showError,
    showSuccess,
  ]);

  return { handleCheckoutReturn };
}
