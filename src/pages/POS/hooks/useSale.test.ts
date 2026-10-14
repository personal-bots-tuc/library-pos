import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSale } from './useSale';
import { getHookWrapper } from '../../../test/utils';
import api from '../../../api/client';

const baseSale = {
  id: 'sale-1',
  number: 1,
  total: 10000,
  change: 2000,
  subtotal: 10500,
  discount: 500,
  paymentMethod: 'cash',
  type: 'sale',
  client: { id: 'client-1', fullName: 'Test', balance: 0 } as {
    id: string;
    fullName: string;
    balance: number;
  },
  seller: { id: 'seller-1', name: 'Seller', role: 'seller' },
  items: [
    {
      product: 'prod-1',
      name: 'Product 1',
      type: 'product',
      quantity: 2,
      unitPrice: 5000,
      unitCost: 0,
      subtotal: 10000,
    },
  ],
  createdAt: new Date().toISOString(),
};

// Reconciliación usa sellerId del user en localStorage (mock global en setup)
function seedSeller() {
  localStorage.setItem('user', JSON.stringify({ id: 'seller-1', schoolId: 'school-1' }));
}

describe('useSale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    seedSeller();
  });

  it('should process checkout successfully with an idempotencyKey', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { sale: baseSale } });

    const { result } = renderHook(() => useSale(), { wrapper: getHookWrapper() });

    let checkoutResult: { total: number; change: number; sale: unknown } | null = null;

    await act(async () => {
      checkoutResult = await result.current.checkout({
        items: [{ product: 'prod-1', quantity: 2 }],
        clientId: 'client-1',
        discount: 500,
        paymentMethod: 'cash',
        amountReceived: 12000,
        expectedTotal: 10000,
      });
    });

    expect(checkoutResult).toEqual({ total: 10000, change: 2000, sale: baseSale });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/sales', {
      items: [{ product: 'prod-1', quantity: 2 }],
      clientId: 'client-1',
      discount: 500,
      paymentMethod: 'cash',
      amountReceived: 12000,
      idempotencyKey: expect.any(String),
    });
    // Éxito directo: no hay reconciliación
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should not send amountReceived for credit payment', async () => {
    const creditSale = {
      ...baseSale,
      id: 'sale-2',
      paymentMethod: 'credit' as const,
      change: 0,
      amountReceived: 0,
    };
    vi.mocked(api.post).mockResolvedValue({ data: { sale: creditSale } });

    const { result } = renderHook(() => useSale(), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.checkout({
        items: [{ product: 'prod-1', quantity: 1 }],
        clientId: 'client-1',
        discount: 0,
        paymentMethod: 'credit',
        amountReceived: 0,
      });
    });

    expect(api.post).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({
        paymentMethod: 'credit',
        amountReceived: undefined,
        idempotencyKey: expect.any(String),
      })
    );
  });

  it('should propagate definite server errors without reconciling (no double sale risk)', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { message: 'Stock insuficiente' } },
    });

    const { result } = renderHook(() => useSale(), { wrapper: getHookWrapper() });

    await expect(
      act(async () => {
        await result.current.checkout({
          items: [{ product: 'prod-1', quantity: 1 }],
          discount: 0,
          paymentMethod: 'cash',
          amountReceived: 1000,
          expectedTotal: 1000,
        });
      })
    ).rejects.toThrow('Stock insuficiente');

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should reconcile instead of re-posting when the response was lost but the sale exists', async () => {
    // Primer POST: resultado incierto (se cortó la red tras crear la venta)
    vi.mocked(api.post).mockRejectedValue(new Error('Network Error'));
    vi.mocked(api.get).mockResolvedValue({ data: { items: [baseSale] } });

    const { result } = renderHook(() => useSale(), { wrapper: getHookWrapper() });

    let checkoutResult: { total: number; change: number; sale: unknown } | null = null;
    await act(async () => {
      checkoutResult = await result.current.checkout({
        items: [{ product: 'prod-1', quantity: 2 }],
        clientId: 'client-1',
        discount: 500,
        paymentMethod: 'cash',
        amountReceived: 12000,
        expectedTotal: 10000,
      });
    });

    // La venta se recuperó por reconciliación: SIN segundo POST
    expect(checkoutResult).toEqual({ total: 10000, change: 2000, sale: baseSale });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({
        params: expect.objectContaining({ sellerId: 'seller-1' }),
      })
    );
  });

  it('should re-post once with the same idempotencyKey when reconciliation finds nothing', async () => {
    // Primer POST: incierto; reconciliación vacía; segundo POST: éxito
    vi.mocked(api.post)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: { sale: baseSale } });
    vi.mocked(api.get).mockResolvedValue({ data: { items: [] } });

    const { result } = renderHook(() => useSale(), { wrapper: getHookWrapper() });

    let checkoutResult: { total: number; change: number; sale: unknown } | null = null;
    await act(async () => {
      checkoutResult = await result.current.checkout({
        items: [{ product: 'prod-1', quantity: 2 }],
        discount: 500,
        paymentMethod: 'cash',
        amountReceived: 12000,
        expectedTotal: 10000,
      });
    });

    expect(checkoutResult).toEqual({ total: 10000, change: 2000, sale: baseSale });
    expect(api.post).toHaveBeenCalledTimes(2);
    const firstKey = (vi.mocked(api.post).mock.calls[0][1] as { idempotencyKey: string })
      .idempotencyKey;
    const secondKey = (vi.mocked(api.post).mock.calls[1][1] as { idempotencyKey: string })
      .idempotencyKey;
    expect(secondKey).toBe(firstKey);
  });

  it('should throw a safe error after two unknown outcomes with no match', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Network Error'));
    vi.mocked(api.get).mockResolvedValue({ data: { items: [] } });

    const { result } = renderHook(() => useSale(), { wrapper: getHookWrapper() });

    await expect(
      act(async () => {
        await result.current.checkout({
          items: [{ product: 'prod-1', quantity: 1 }],
          discount: 0,
          paymentMethod: 'cash',
          amountReceived: 1000,
          expectedTotal: 1000,
        });
      })
    ).rejects.toThrow('Sin conexión estable');

    // Dos intentos máximo; nunca más
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it('should preview a sale', async () => {
    const preview = {
      items: [],
      subtotal: 10000,
      discount: 0,
      total: 10000,
      paymentMethod: 'cash' as const,
    };
    vi.mocked(api.post).mockResolvedValue({ data: preview });

    const { result } = renderHook(() => useSale(), { wrapper: getHookWrapper() });

    let previewResult: unknown = null;
    await act(async () => {
      previewResult = await result.current.previewSale({
        items: [{ product: 'prod-1', quantity: 2 }],
        discount: 0,
        paymentMethod: 'cash',
        amountReceived: 10000,
      });
    });

    expect(previewResult).toEqual(preview);
    expect(api.post).toHaveBeenCalledWith(
      '/sales/preview',
      expect.objectContaining({
        paymentMethod: 'cash',
      })
    );
  });
});
