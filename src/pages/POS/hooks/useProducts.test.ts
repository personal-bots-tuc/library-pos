import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProducts } from './useProducts';
import { getHookWrapper } from '../../../test/utils';
import api from '../../../api/client';

const mockProducts = [
  {
    id: '1',
    name: 'Café',
    type: 'product' as const,
    price: 1500,
    stock: 10,
    active: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: '2',
    name: 'Corte',
    type: 'service' as const,
    price: 5000,
    stock: 0,
    active: true,
    createdAt: '',
    updatedAt: '',
  },
];

describe('useProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch products on mount', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: mockProducts } });

    const { result } = renderHook(() => useProducts(100), { wrapper: getHookWrapper() });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.products).toEqual(mockProducts);
    expect(result.current.error).toBeNull();
    expect(api.get).toHaveBeenCalledWith('/products', { params: { limit: 100 } });
  });

  it('should handle fetch error', async () => {
    vi.mocked(api.get).mockRejectedValue({
      response: { data: { message: 'Error del servidor' } },
    });

    const { result } = renderHook(() => useProducts(100), { wrapper: getHookWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBe('Error del servidor');
  });

  it('should handle network error without response', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useProducts(100), { wrapper: getHookWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Error al cargar productos');
  });

  it('should refetch products when refetch is called', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: mockProducts } });

    const { result } = renderHook(() => useProducts(100), { wrapper: getHookWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const newProducts = [
      {
        id: '3',
        name: 'Agua',
        type: 'product' as const,
        price: 800,
        stock: 5,
        active: true,
        createdAt: '',
        updatedAt: '',
      },
    ];
    vi.mocked(api.get).mockResolvedValue({ data: { items: newProducts } });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.products).toEqual(newProducts));
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('should use default limit of 100 and never send search to the server', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [] } });

    const { result } = renderHook(() => useProducts(), { wrapper: getHookWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith('/products', { params: { limit: 100 } });
    const callParams = vi.mocked(api.get).mock.calls[0][1] as { params: Record<string, unknown> };
    expect(callParams.params).not.toHaveProperty('search');
  });
});
