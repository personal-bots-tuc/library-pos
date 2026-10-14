import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClient } from './useClient';
import { getHookWrapper } from '../../../test/utils';
import api from '../../../api/client';
import type { Client, ClientListResponse } from '../components/types';

const mockClient: Client = {
  id: 'client-1',
  fullName: 'Juan Pérez',
  dni: '12345678',
  phone: '1122334455',
  isDefault: false,
  balance: 0,
  active: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const mockClientList: ClientListResponse = {
  items: [mockClient],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

describe('useClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create client successfully', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: mockClient });

    const { result } = renderHook(() => useClient(), { wrapper: getHookWrapper() });

    let createdClient: typeof mockClient | null = null;

    await act(async () => {
      createdClient = await result.current.createClient({
        fullName: 'Juan Pérez',
        dni: '12345678',
        phone: '1122334455',
      });
    });

    expect(createdClient).toEqual(mockClient);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(api.post).toHaveBeenCalledWith('/clients', {
      fullName: 'Juan Pérez',
      dni: '12345678',
      phone: '1122334455',
    });
  });

  it('should trim whitespace from input', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: mockClient });

    const { result } = renderHook(() => useClient(), { wrapper: getHookWrapper() });

    await act(async () => {
      await result.current.createClient({
        fullName: '  Juan Pérez  ',
        dni: '  12345678  ',
        phone: '  1122334455  ',
      });
    });

    expect(api.post).toHaveBeenCalledWith('/clients', {
      fullName: 'Juan Pérez',
      dni: '12345678',
      phone: '1122334455',
    });
  });

  it('should handle create client error', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { message: 'DNI ya existe' } },
    });

    const { result } = renderHook(() => useClient(), { wrapper: getHookWrapper() });

    await expect(
      act(async () => {
        await result.current.createClient({
          fullName: 'Juan Pérez',
          dni: '12345678',
        });
      })
    ).rejects.toThrow('DNI ya existe');
  });

  it('should list clients with pagination', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockClientList });

    const { result } = renderHook(() => useClient(), { wrapper: getHookWrapper() });

    let clientList: typeof mockClientList | null = null;

    await act(async () => {
      clientList = await result.current.listClients({ page: 2, limit: 20, search: 'Juan' });
    });

    expect(clientList).toEqual(mockClientList);
    expect(api.get).toHaveBeenCalledWith('/clients?search=Juan&page=2&limit=20');
  });

  it('should search clients', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [mockClient] } });

    const { result } = renderHook(() => useClient(), { wrapper: getHookWrapper() });

    let clients: (typeof mockClient)[] | null = null;

    await act(async () => {
      clients = await result.current.searchClients('Juan');
    });

    expect(clients).toEqual([mockClient]);
    expect(api.get).toHaveBeenCalledWith('/clients', {
      params: { search: 'Juan', limit: 10, page: 1 },
    });
  });

  it('should return empty array for empty search query', async () => {
    const { result } = renderHook(() => useClient(), { wrapper: getHookWrapper() });

    let clients: (typeof mockClient)[] | null = null;

    await act(async () => {
      clients = await result.current.searchClients('');
    });

    expect(clients).toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should handle list clients error', async () => {
    vi.mocked(api.get).mockRejectedValue({
      response: { data: { message: 'Error al cargar' } },
    });

    const { result } = renderHook(() => useClient(), { wrapper: getHookWrapper() });

    await expect(
      act(async () => {
        await result.current.listClients();
      })
    ).rejects.toThrow('Error al cargar');
  });
});
