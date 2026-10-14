import { useCallback } from 'react';
import type { CartItem } from '../components/Cart/types';
import type { Client } from '../components/types';
import type { QuoteLean, ReceiptData } from './types';

export interface QuoteFlowDeps {
  cart: CartItem[];
  subtotal: number;
  discountAmount: number;
  selectedClient: Client | null;
  createQuote: (_params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    discount: number;
  }) => Promise<QuoteLean>;
  clearCart: () => void;
  refetchProducts: () => Promise<void>;
  openReceipt: (_data: ReceiptData) => void;
  showError: (_msg: string) => void;
  showSuccess: (_msg: string) => void;
}

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function useQuoteFlow(deps: QuoteFlowDeps) {
  const {
    cart,
    subtotal,
    discountAmount,
    selectedClient,
    createQuote,
    clearCart,
    refetchProducts,
    openReceipt,
    showError,
    showSuccess,
  } = deps;

  const handleCheckoutQuote = useCallback(async () => {
    if (cart.length === 0) return;
    if (discountAmount > subtotal) {
      showError('El descuento no puede ser mayor al subtotal');
      return;
    }

    try {
      const items = cart.map(item => ({
        product: item.product,
        quantity: item.quantity,
      }));

      const quote = await createQuote({
        items,
        clientId: selectedClient?.id,
        discount: discountAmount,
      });

      openReceipt({
        number: quote.number,
        type: 'quote',
        items: quote.items,
        subtotal: quote.subtotal,
        discount: quote.discount,
        total: quote.total,
        client: quote.client ?? null,
        seller: quote.seller,
        createdAt: quote.createdAt,
      });
      clearCart();
      await refetchProducts();
      showSuccess('Presupuesto generado correctamente');
    } catch (err) {
      showError(messageOf(err, 'Error al generar el presupuesto'));
    }
  }, [
    cart,
    subtotal,
    discountAmount,
    selectedClient,
    createQuote,
    clearCart,
    refetchProducts,
    openReceipt,
    showError,
    showSuccess,
  ]);

  return { handleCheckoutQuote };
}
