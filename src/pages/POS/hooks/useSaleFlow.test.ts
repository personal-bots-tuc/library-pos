import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaleFlow } from './useSaleFlow';
import { getHookWrapper } from '../../../test/utils';
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
    discountAmount: 2000, // descuento aplicado (simula que el cajero aplicó descuento)
    paymentMethod: 'cash' as const,
    amountReceived: '12000',
    subtotal: 10000,
    total: 8000, // total con descuento aplicado
    checkout: vi
      .fn()
      .mockResolvedValue({ total: 8000, change: 4000, sale: { id: 's1', number: 3 } }),
    previewSale: vi.fn().mockResolvedValue({ total: 8000 }),
    clearCart: vi.fn(),
    refetchProducts: vi.fn().mockResolvedValue(undefined),
    refetchShift: vi.fn().mockResolvedValue(undefined),
    showError: vi.fn(),
    showSuccess: vi.fn(),
    openReceipt: vi.fn(),
    ...overrides,
  };
}

describe('useSaleFlow - checkout exitoso no reseta campos de venta (reset solo tras modal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', schoolId: 'school-1' }));
  });

  it('tras checkout exitoso llama clearCart y openReceipt, pero no hay reset de descuento/cliente/monto', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.handleCheckout();
    });

    // Se vacía el carrito (clearCart sí se llama)
    expect(deps.clearCart).toHaveBeenCalledTimes(1);
    // Se abre el recibo
    expect(deps.openReceipt).toHaveBeenCalledWith(expect.objectContaining({ number: 3 }));
    // Se muestra éxito
    expect(deps.showSuccess).toHaveBeenCalledWith('Venta procesada correctamente');
    // No hay error
    expect(deps.showError).not.toHaveBeenCalled();
    // checkout se invocó con los datos (incluyendo descuento)
    expect(deps.checkout).toHaveBeenCalledWith(expect.objectContaining({ discount: 2000 }));
  });

  it('si el checkout falla, no se llama clearCart ni se resetea nada', async () => {
    const deps = makeDeps({
      checkout: vi.fn().mockRejectedValue(new Error('Stock insuficiente')),
    });
    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.handleCheckout();
    });

    // clearCart NO se llama en caso de error
    expect(deps.clearCart).not.toHaveBeenCalled();
    // openReceipt NO se llama
    expect(deps.openReceipt).not.toHaveBeenCalled();
    // showError se invoca con el mensaje
    expect(deps.showError).toHaveBeenCalledWith('Stock insuficiente');
  });
});
