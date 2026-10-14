import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api/client';
import {
  newSaleAttempt,
  isDefiniteServerError,
  findMatchingSale,
} from '../pages/POS/hooks/saleIntegrity';

const saleMatch = {
  id: 'sale-9',
  number: 42,
  total: 10000,
  change: 0,
  subtotal: 10000,
  discount: 0,
  paymentMethod: 'cash',
  type: 'sale' as const,
  amountReceived: 10000,
  client: null,
  seller: { id: 'seller-1', name: 'Ana', role: 'seller' },
  items: [
    {
      product: 'prod-1',
      name: 'Cuaderno',
      type: 'product' as const,
      quantity: 2,
      unitPrice: 5000,
      subtotal: 10000,
    },
  ],
  createdAt: new Date().toISOString(),
};

describe('saleIntegrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('generates unique idempotency keys per attempt', () => {
    const a = newSaleAttempt([{ product: 'p1', quantity: 1 }], 100);
    const b = newSaleAttempt([{ product: 'p1', quantity: 1 }], 100);
    expect(a.idempotencyKey).toBeTruthy();
    expect(b.idempotencyKey).toBeTruthy();
    expect(a.idempotencyKey).not.toBe(b.idempotencyKey);
  });

  it('classifies errors with response as definite server errors', () => {
    expect(isDefiniteServerError({ response: { status: 422 } })).toBe(true);
    expect(isDefiniteServerError(new Error('Network Error'))).toBe(false);
  });

  it('findMatchingSale returns null without a seller in storage (no api call)', async () => {
    const attempt = newSaleAttempt([{ product: 'prod-1', quantity: 2 }], 10000);
    const found = await findMatchingSale(attempt);
    expect(found).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('findMatchingSale matches by seller + window + total + items signature', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', schoolId: 'school-1' }));
    vi.mocked(api.get).mockResolvedValue({ data: { items: [saleMatch] } });

    const attempt = newSaleAttempt([{ product: 'prod-1', quantity: 2 }], 10000);
    const found = await findMatchingSale(attempt);

    expect(found?.id).toBe('sale-9');
    expect(api.get).toHaveBeenCalledWith('/sales', {
      params: expect.objectContaining({ sellerId: 'seller-1' }),
    });
  });

  it('findMatchingSale ignores sales with different totals', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', schoolId: 'school-1' }));
    vi.mocked(api.get).mockResolvedValue({ data: { items: [saleMatch] } });

    const attempt = newSaleAttempt([{ product: 'prod-1', quantity: 2 }], 9999);
    const found = await findMatchingSale(attempt);
    expect(found).toBeNull();
  });

  it('findMatchingSale ignores sales with different item quantities', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', schoolId: 'school-1' }));
    vi.mocked(api.get).mockResolvedValue({ data: { items: [saleMatch] } });

    const attempt = newSaleAttempt([{ product: 'prod-1', quantity: 3 }], 10000);
    const found = await findMatchingSale(attempt);
    expect(found).toBeNull();
  });

  it('findMatchingSale handles alternate list payload shape', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', schoolId: 'school-1' }));
    vi.mocked(api.get).mockResolvedValue({ data: { sales: [saleMatch] } });

    const attempt = newSaleAttempt([{ product: 'prod-1', quantity: 2 }], 10000);
    const found = await findMatchingSale(attempt);
    expect(found?.id).toBe('sale-9');
  });
});
