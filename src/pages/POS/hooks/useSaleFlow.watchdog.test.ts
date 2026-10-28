import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaleFlow, CHECKOUT_WATCHDOG_MS } from './useSaleFlow';
import { getHookWrapper } from '../../../test/utils';
import api from '../../../api/client';
import type { CartItem } from '../components/Cart/types';

const item: CartItem = {
  product: 'prod-1',
  name: 'Cuaderno',
  type: 'product',
  quantity: 1,
  unitPrice: 1000,
  subtotal: 1000,
  stock: 5,
};

function makeDeps(overrides: Partial<Parameters<typeof useSaleFlow>[0]> = {}) {
  return {
    activeShift: { id: 'shift-1' },
    cart: [item],
    selectedClient: null,
    discountAmount: 0,
    paymentMethod: 'cash' as const,
    amountReceived: '1000',
    subtotal: 1000,
    total: 1000,
    checkout: vi.fn().mockResolvedValue({ total: 1000, change: 0, sale: { id: 's1', number: 3 } }),
    previewSale: vi.fn().mockResolvedValue({ total: 1000 }),
    resetSale: vi.fn(),
    refetchProducts: vi.fn().mockResolvedValue(undefined),
    refetchShift: vi.fn().mockResolvedValue(undefined),
    showError: vi.fn(),
    showSuccess: vi.fn(),
    openReceipt: vi.fn(),
    ...overrides,
  };
}

describe('useSaleFlow watchdog (POS bloqueado cuando la API no responde)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', schoolId: 'school-1' }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('si el cobro no responde en 30s y la venta NO existe → error visible y flujo liberado', async () => {
    const deps = makeDeps({
      checkout: vi.fn().mockImplementation(() => new Promise(() => {})), // nunca resuelve
    });
    vi.mocked(api.get).mockResolvedValue({ data: { items: [] } } as never);

    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    let firstCall: Promise<void> | undefined;
    await act(async () => {
      firstCall = result.current.handleCheckout();
    });

    await act(async () => {
      vi.advanceTimersByTime(CHECKOUT_WATCHDOG_MS + 1000);
    });
    await act(async () => {
      await firstCall;
    });

    // Se reconcilió contra el server...
    expect(api.get).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({
        params: expect.objectContaining({ sellerId: 'seller-1' }),
      })
    );
    // ... no se encontró la venta → error CLARO y NO se limpió el carrito
    expect(deps.showError).toHaveBeenCalledWith(expect.stringContaining('No se pudo confirmar'));
    expect(deps.resetSale).not.toHaveBeenCalled();
    expect(deps.openReceipt).not.toHaveBeenCalled();

    // Flujo liberado: un segundo cobrar vuelve a intentar
    let secondCall: Promise<void> | undefined;
    await act(async () => {
      secondCall = result.current.handleCheckout();
    });
    await act(async () => {
      vi.advanceTimersByTime(CHECKOUT_WATCHDOG_MS + 1000);
      await secondCall;
    });
    expect(deps.checkout).toHaveBeenCalledTimes(2);
  });

  it('si el cobro no responde pero la venta SÍ se creó → se recupera el comprobante', async () => {
    const deps = makeDeps({
      checkout: vi.fn().mockImplementation(() => new Promise(() => {})),
    });
    const foundSale = {
      id: 'sale-x',
      number: 42,
      subtotal: 1000,
      discount: 0,
      total: 1000,
      amountReceived: 1000,
      change: 0,
      paymentMethod: 'cash' as const,
      type: 'sale' as const,
      client: null,
      seller: { id: 'seller-1', name: 'Ana', role: 'seller' },
      items: [
        {
          product: 'prod-1',
          name: 'Cuaderno',
          type: 'product' as const,
          quantity: 1,
          unitPrice: 1000,
          subtotal: 1000,
        },
      ],
      createdAt: new Date().toISOString(),
    };
    vi.mocked(api.get).mockResolvedValue({ data: { items: [foundSale] } } as never);

    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    let call: Promise<void> | undefined;
    await act(async () => {
      call = result.current.handleCheckout();
    });
    await act(async () => {
      vi.advanceTimersByTime(CHECKOUT_WATCHDOG_MS + 1000);
      await call;
    });

    expect(deps.openReceipt).toHaveBeenCalledWith(expect.objectContaining({ number: 42 }));
    expect(deps.resetSale).toHaveBeenCalled();
    expect(deps.showSuccess).toHaveBeenCalled();
  });

  it('cálculo normal rápido no dispara watchdog', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(deps.openReceipt).toHaveBeenCalled();
    expect(deps.showSuccess).toHaveBeenCalledWith('Venta procesada correctamente');
    expect(deps.showError).not.toHaveBeenCalled();
  });
});
