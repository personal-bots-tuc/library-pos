import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePOSPage } from './usePOSPage';
import { getHookWrapper } from '../../../test/utils';
import type { Client } from '../components/types';

// Mock de todas las dependencias de usePOSPage
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('./useKeyboardShortcuts', () => ({ useKeyboardShortcuts: vi.fn() }));
vi.mock('./useProducts', () => ({
  useProducts: () => ({ products: [], refetch: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('./useShift', () => ({
  useShift: () => ({
    activeShift: { id: 'shift-1', openingAmount: 0, openedAt: '' },
    shiftStats: null,
    shiftLoading: false,
    openShift: vi.fn(),
    closeShift: vi.fn(),
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock('./useCart', () => ({
  useCart: () => ({
    cart: [],
    addToCart: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    subtotal: 10000,
  }),
}));
vi.mock('./useSale', () => ({
  useSale: () => ({
    checkout: vi.fn().mockResolvedValue({ total: 1000, change: 0, sale: { id: 's1' } }),
    previewSale: vi.fn().mockResolvedValue({ total: 1000 }),
    loading: false,
  }),
}));
vi.mock('./useClient', () => ({ useClient: () => ({ createClient: vi.fn(), loading: false }) }));
vi.mock('./useCashMovements', () => ({ useCashMovements: () => ({ createMovement: vi.fn() }) }));
vi.mock('./useModals', () => ({
  useModals: () => ({
    showOpenShift: false,
    showCloseShift: false,
    showShiftStatus: false,
    showNewClient: false,
    saleSuccess: null,
    showReceipt: false,
    receiptData: null,
    closeSaleSuccess: vi.fn(),
    openSaleSuccess: vi.fn(),
    openReceipt: vi.fn(),
    closeReceipt: vi.fn(),
    closeOpenShift: vi.fn(),
    closeCloseShift: vi.fn(),
    closeShiftStatus: vi.fn(),
    closeNewClient: vi.fn(),
    openOpenShift: vi.fn(),
    openCloseShift: vi.fn(),
    openShiftStatus: vi.fn(),
    openNewClient: vi.fn(),
    closeAll: vi.fn(),
  }),
}));
// Capturan las deps que usePOSPage les pasa, para probar el cableado de resetSale
const capturedFlowDeps = vi.hoisted(() => ({
  sale: null as null | { resetSale: () => void },
  quote: null as null | { resetSale: () => void },
  ret: null as null | { resetSale: () => void },
}));
vi.mock('./useSaleFlow', () => ({
  useSaleFlow: (deps: { resetSale: () => void }) => {
    capturedFlowDeps.sale = deps;
    return { handleCheckout: vi.fn() };
  },
}));
vi.mock('./useShiftManager', () => ({
  useShiftManager: () => ({ handleOpenShift: vi.fn(), handleCloseShift: vi.fn() }),
}));
vi.mock('./useQuoteFlow', () => ({
  useQuoteFlow: (deps: { resetSale: () => void }) => {
    capturedFlowDeps.quote = deps;
    return { handleCheckoutQuote: vi.fn() };
  },
}));
vi.mock('./useReturnFlow', () => ({
  useReturnFlow: (deps: { resetSale: () => void }) => {
    capturedFlowDeps.ret = deps;
    return { handleCheckoutReturn: vi.fn() };
  },
}));
vi.mock('./useClientSelector', () => ({
  useClientSelector: () => ({ handleCreateClient: vi.fn() }),
}));
vi.mock('./useQuotes', () => ({ useQuotes: () => ({ createQuote: vi.fn(), loading: false }) }));
vi.mock('./useReturn', () => ({ useReturn: () => ({ createReturn: vi.fn(), loading: false }) }));

const mockClient: Client = {
  id: 'client-1',
  fullName: 'Juan Pérez',
  dni: '12345678',
  isDefault: false,
  balance: 0,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('usePOSPage - clearSale resetea todos los campos de venta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe resetear todos los campos al llamar clearSale desde valores modificados', () => {
    const { result } = renderHook(() => usePOSPage(), { wrapper: getHookWrapper() });

    // 1. Modificar todos los campos para que no estén en valores por defecto
    act(() => {
      result.current.setDiscountValue(5000);
      result.current.setDiscountType('%');
      result.current.setAmountReceived('12000');
      result.current.setPaymentMethod('transfer');
      result.current.setSelectedClient(mockClient);
      result.current.setSearch('buscar cliente');
      result.current.setOperation('return');
    });

    // Verificar que los campos tienen los valores modificados
    expect(result.current.discountValue).toBe(5000);
    expect(result.current.discountType).toBe('%');
    expect(result.current.amountReceived).toBe('12000');
    expect(result.current.paymentMethod).toBe('transfer');
    expect(result.current.selectedClient).toEqual(mockClient);
    expect(result.current.search).toBe('buscar cliente');
    expect(result.current.operation).toBe('return');
    // discountAmount y total son derivados y reflejan el descuento aplicado
    expect(result.current.discountAmount).toBeGreaterThan(0);

    // 2. Llamar clearSale
    act(() => {
      result.current.clearSale();
    });

    // 3. Verificar que todos los campos se resetean a valores iniciales
    expect(result.current.discountValue).toBe(0);
    expect(result.current.discountType).toBe('$');
    expect(result.current.amountReceived).toBe('');
    expect(result.current.paymentMethod).toBe('cash');
    expect(result.current.selectedClient).toBeNull();
    expect(result.current.search).toBe('');
    expect(result.current.operation).toBe('sale');
    // discountAmount se recalcula sobre valores reset (descuento = 0)
    expect(result.current.discountAmount).toBe(0);
    // clearCart también se invoca dentro de clearSale (resetea carrito/subtotal)
  });
});

describe('usePOSPage - resetSale que reciben los flujos de venta (POS-204)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFlowDeps.sale = null;
    capturedFlowDeps.quote = null;
    capturedFlowDeps.ret = null;
  });

  it('useSaleFlow recibe un resetSale que limpia el descuento de la venta anterior', () => {
    const { result } = renderHook(() => usePOSPage(), { wrapper: getHookWrapper() });

    act(() => {
      result.current.setDiscountValue(200);
    });
    expect(result.current.discountValue).toBe(200);

    // Simula el cobro exitoso: el flujo llama a resetSale al completar la venta
    act(() => {
      capturedFlowDeps.sale?.resetSale();
    });

    expect(result.current.discountValue).toBe(0);
    expect(result.current.discountType).toBe('$');
  });

  it('useQuoteFlow y useReturnFlow reciben el mismo reset completo', () => {
    const { result } = renderHook(() => usePOSPage(), { wrapper: getHookWrapper() });

    act(() => {
      result.current.setDiscountValue(15);
      result.current.setDiscountType('%');
    });

    act(() => {
      capturedFlowDeps.quote?.resetSale();
    });
    expect(result.current.discountValue).toBe(0);
    expect(result.current.discountType).toBe('$');

    act(() => {
      result.current.setDiscountValue(50);
    });
    act(() => {
      capturedFlowDeps.ret?.resetSale();
    });
    expect(result.current.discountValue).toBe(0);
  });
});
