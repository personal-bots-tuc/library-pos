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
    resetSale: vi.fn(),
    refetchProducts: vi.fn().mockResolvedValue(undefined),
    refetchShift: vi.fn().mockResolvedValue(undefined),
    showError: vi.fn(),
    showSuccess: vi.fn(),
    openReceipt: vi.fn(),
    ...overrides,
  };
}

describe('useSaleFlow - checkout exitoso resetea la venta completa (POS-204)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', schoolId: 'school-1' }));
  });

  it('tras checkout exitoso llama resetSale (no solo clearCart) y abre el recibo', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.handleCheckout();
    });

    // El reset completo corre al confirmar la venta, no al cerrar un modal
    expect(deps.resetSale).toHaveBeenCalledTimes(1);
    // Se abre el recibo
    expect(deps.openReceipt).toHaveBeenCalledWith(expect.objectContaining({ number: 3 }));
    // Se muestra éxito
    expect(deps.showSuccess).toHaveBeenCalledWith('Venta procesada correctamente');
    // No hay error
    expect(deps.showError).not.toHaveBeenCalled();
    // checkout se invocó con los datos (incluyendo descuento)
    expect(deps.checkout).toHaveBeenCalledWith(expect.objectContaining({ discount: 2000 }));
  });

  it('si el checkout falla, no se llama resetSale ni se resetea nada', async () => {
    const deps = makeDeps({
      checkout: vi.fn().mockRejectedValue(new Error('Stock insuficiente')),
    });
    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.handleCheckout();
    });

    // resetSale NO se llama en caso de error (el cajero puede reintentar con los mismos datos)
    expect(deps.resetSale).not.toHaveBeenCalled();
    // openReceipt NO se llama
    expect(deps.openReceipt).not.toHaveBeenCalled();
    // showError se invoca con el mensaje
    expect(deps.showError).toHaveBeenCalledWith('Stock insuficiente');
  });

  it('con carrito vacío no llama checkout ni resetSale (early return)', async () => {
    const deps = makeDeps({ cart: [] });
    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.handleCheckout();
    });

    // Carrito vacío: retorna temprano sin llamar checkout
    expect(deps.checkout).not.toHaveBeenCalled();
    expect(deps.resetSale).not.toHaveBeenCalled();
    expect(deps.openReceipt).not.toHaveBeenCalled();
    expect(deps.showError).not.toHaveBeenCalled();
  });

  it('con error de validación (cliente requerido para crédito) llama showError y no avanza', async () => {
    const deps = makeDeps({
      paymentMethod: 'credit' as const,
      selectedClient: null,
      amountReceived: '0',
    });
    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.handleCheckout();
    });

    // Validación falla: cliente requerido para crédito
    expect(deps.checkout).not.toHaveBeenCalled();
    expect(deps.resetSale).not.toHaveBeenCalled();
    expect(deps.showError).toHaveBeenCalledWith('Seleccione un cliente para venta a crédito');
  });

  it('con error no-Error (string), showError muestra mensaje genérico', async () => {
    const deps = makeDeps({
      checkout: vi.fn().mockRejectedValue('Error de red simple'),
    });
    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(deps.showError).toHaveBeenCalledWith('Error al procesar la venta');
    expect(deps.resetSale).not.toHaveBeenCalled();
  });

  it('sin turno activo (activeShift null) retorna error y no avanza', async () => {
    const deps = makeDeps({ activeShift: null });
    const { result } = renderHook(() => useSaleFlow(deps), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(deps.checkout).not.toHaveBeenCalled();
    expect(deps.resetSale).not.toHaveBeenCalled();
    expect(deps.showError).toHaveBeenCalledWith('Debe abrir un turno de caja primero');
  });
});
