import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useProducts } from './useProducts';
import { useShift } from './useShift';
import { useCart } from './useCart';
import { useSale } from './useSale';
import { useClient } from './useClient';
import { useCashMovements } from './useCashMovements';
import { useModals } from './useModals';
import { useSaleFlow } from './useSaleFlow';
import { useShiftManager } from './useShiftManager';
import { useQuoteFlow } from './useQuoteFlow';
import { useReturnFlow } from './useReturnFlow';
import { useClientSelector } from './useClientSelector';
import { useQuotes } from './useQuotes';
import { useReturn } from './useReturn';
import type { Client } from '../components/types';
import type { OperationMode } from './types';

function computeDiscountAmount(
  discountType: '$' | '%',
  discountValue: number,
  subtotal: number
): number {
  if (discountType === '%') return Math.round(subtotal * (discountValue / 100));
  return Math.min(discountValue, subtotal);
}

function computeChange(
  paymentMethod: 'cash' | 'transfer' | 'credit',
  amountReceived: string,
  total: number
): number {
  const received = parseFloat(amountReceived) || 0;
  if (paymentMethod === 'cash' || paymentMethod === 'transfer')
    return Math.max(0, received - total);
  return 0;
}

function computeAnyModalOpen(modals: ReturnType<typeof useModals>): boolean {
  return Boolean(
    modals.showOpenShift ||
    modals.showCloseShift ||
    modals.showShiftStatus ||
    modals.showNewClient ||
    modals.saleSuccess ||
    modals.showReceipt
  );
}

function computeLoading(...flags: boolean[]): boolean {
  return flags.some(Boolean);
}

export function usePOSPage() {
  const { logout } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  // Operation mode state
  const [operation, setOperation] = useState<OperationMode>('sale');

  // UI State - search must be declared before useProducts
  const [search, setSearch] = useState('');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'$' | '%'>('$');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [savingClient, setSavingClient] = useState(false);

  // Core hooks
  // La búsqueda filtra client-side (ProductSearch); sin request por tecla.
  const { products, refetch: refetchProducts } = useProducts(100);
  const {
    activeShift,
    shiftStats,
    openShift,
    closeShift,
    loading: shiftLoading,
    refetch: refetchShift,
  } = useShift();
  const { cart, addToCart, updateQuantity, removeItem, clearCart, subtotal } = useCart(products);
  const { checkout, previewSale, loading: saleLoading } = useSale();
  const { createClient, loading: clientLoading } = useClient();
  const { createMovement: handleCreateCashMovement } = useCashMovements(activeShift?.id ?? null);
  const { createQuote, loading: quoteLoading } = useQuotes();
  const { createReturn, loading: returnLoading } = useReturn();

  // Modals
  const modals = useModals();

  // Computed
  const discountAmount = useMemo(
    () => computeDiscountAmount(discountType, discountValue, subtotal),
    [subtotal, discountValue, discountType]
  );
  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);
  const change = useMemo(
    () => computeChange(paymentMethod, amountReceived, total),
    [paymentMethod, amountReceived, total]
  );

  const anyModalOpen = computeAnyModalOpen(modals);
  const hasCartItems = cart.length > 0;
  const loading = computeLoading(
    saleLoading,
    clientLoading,
    savingClient,
    quoteLoading,
    returnLoading
  );

  // Quote and return flows extracted to their own hooks (one-file-per-hook)
  const { handleCheckoutQuote } = useQuoteFlow({
    cart,
    subtotal,
    discountAmount,
    selectedClient,
    createQuote,
    clearCart,
    refetchProducts,
    openReceipt: modals.openReceipt,
    showError,
    showSuccess,
  });

  const { handleCheckoutReturn } = useReturnFlow({
    activeShift,
    cart,
    paymentMethod,
    selectedClient,
    createReturn,
    clearCart,
    refetchProducts,
    refetchShift,
    openReceipt: modals.openReceipt,
    showError,
    showSuccess,
  });

  // Composed hooks - useSaleFlow now receives operation-aware checkout
  const { handleCheckout } = useSaleFlow({
    activeShift,
    cart,
    selectedClient,
    discountAmount,
    paymentMethod,
    amountReceived,
    subtotal,
    total,
    checkout,
    previewSale,
    clearCart,
    refetchProducts,
    refetchShift,
    showError,
    showSuccess,
    openReceipt: modals.openReceipt,
  });

  const { handleOpenShift, handleCloseShift } = useShiftManager({
    activeShift,
    openShift,
    closeShift,
    showError,
    showSuccess,
    closeOpenShiftModal: modals.closeOpenShift,
    closeCloseShiftModal: modals.closeCloseShift,
  });

  const { handleCreateClient } = useClientSelector({
    selectedClient,
    setSelectedClient,
    createClient,
    showError,
    showSuccess,
    closeNewClientModal: modals.closeNewClient,
    setSavingClient,
  });

  // Clear sale - also resets operation to default
  const clearSale = useCallback(() => {
    clearCart();
    setDiscountValue(0);
    setDiscountType('$');
    setAmountReceived('');
    setPaymentMethod('cash');
    setSelectedClient(null);
    setSearch('');
    setOperation('sale');
  }, [clearCart]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => document.getElementById('product-search')?.focus(),
    onDiscount: () => document.getElementById('discount-input')?.focus(),
    onAmountReceived: () => {
      if (paymentMethod === 'cash' || paymentMethod === 'transfer') {
        document.getElementById('amount-received')?.focus();
      }
    },
    onNewClient: modals.openNewClient,
    onCheckout: () => {
      if (!loading && hasCartItems) {
        switch (operation) {
          case 'sale':
            handleCheckout();
            break;
          case 'quote':
            handleCheckoutQuote();
            break;
          case 'return':
            handleCheckoutReturn();
            break;
        }
      }
    },
    onClearSale: () => {
      if (!anyModalOpen && hasCartItems) clearSale();
    },
    onCloseModals: modals.closeAll,
    isModalOpen: anyModalOpen,
    hasCartItems,
    isLoading: loading,
  });

  return {
    // Operation mode
    operation,
    setOperation,
    // Core hooks data
    products,
    refetchProducts,
    activeShift,
    shiftStats,
    shiftLoading,
    cart,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    saleLoading,
    clientLoading,
    quoteLoading,
    returnLoading,
    handleCreateCashMovement,
    // UI State
    discountValue,
    setDiscountValue,
    discountType,
    setDiscountType,
    paymentMethod,
    setPaymentMethod,
    amountReceived,
    setAmountReceived,
    search,
    setSearch,
    selectedClient,
    setSelectedClient,
    savingClient,
    setSavingClient,
    // Modals
    ...modals,
    // Computed
    discountAmount,
    total,
    change,
    anyModalOpen,
    hasCartItems,
    loading,
    // Actions
    handleCheckout,
    handleCheckoutQuote,
    handleCheckoutReturn,
    handleOpenShift,
    handleCloseShift,
    handleCreateClient,
    clearSale,
    logout,
    // Receipt modal
    onCloseReceipt: modals.closeReceipt,
    onConfirmReceipt: modals.closeReceipt,
  };
}
