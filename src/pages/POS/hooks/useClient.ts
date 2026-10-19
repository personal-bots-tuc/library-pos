import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import type { UseClientResult } from './types';
import type { Client, ClientListResponse } from '../components/types';

function errorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

const CLIENTS_KEY = 'clients';

/**
 * Clientes — búsquedas pasan por el query cache (dedup + staleTime 30s,
 * evita requests repetidos por la misma búsqueda) y la primera página se
 * persiste en IndexedDB como fallback offline de lectura.
 * Las escrituras (createClient) van online y revalidan el cache.
 */
export function useClient(): UseClientResult {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { fullName: string; dni: string; phone?: string }) => {
      const { data: client } = await api.post('/clients', {
        fullName: data.fullName.trim(),
        dni: data.dni.trim(),
        phone: data.phone?.trim() || undefined,
      });
      return client as Client;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] }),
  });

  const listClients = async (params?: { search?: string; page?: number; limit?: number }) => {
    return queryClient
      .fetchQuery<ClientListResponse>({
        queryKey: [
          CLIENTS_KEY,
          'list',
          params?.search ?? '',
          params?.page ?? 1,
          params?.limit ?? 20,
        ],
        staleTime: 30_000,
        queryFn: async () => {
          const queryParams = new URLSearchParams();
          if (params?.search) queryParams.set('search', params.search);
          if (params?.page) queryParams.set('page', params.page.toString());
          if (params?.limit) queryParams.set('limit', params.limit.toString());
          const { data } = await api.get(`/clients?${queryParams.toString()}`);
          return data as ClientListResponse;
        },
      })
      .catch(err => {
        throw new Error(errorMessage(err, 'Error al cargar clientes'), { cause: err });
      });
  };

  const searchClients = async (query: string): Promise<Client[]> => {
    if (!query.trim()) return [];
    try {
      return await queryClient.fetchQuery<Client[]>({
        queryKey: [CLIENTS_KEY, 'search', query.trim()],
        staleTime: 30_000,
        queryFn: async () => {
          const { data } = await api.get('/clients', {
            params: { search: query, limit: 10, page: 1 },
          });
          return (data.items || []) as Client[];
        },
      });
    } catch (err) {
      throw new Error(errorMessage(err, 'Error al buscar clientes'), { cause: err });
    }
  };

  const createClient = async (data: { fullName: string; dni: string; phone?: string }) => {
    try {
      return await createMutation.mutateAsync(data);
    } catch (err) {
      throw new Error(errorMessage(err, 'Error al crear el cliente'), { cause: err });
    }
  };

  const mutationError = createMutation.error;

  return {
    createClient,
    listClients,
    searchClients,
    loading: createMutation.isPending,
    error: mutationError ? errorMessage(mutationError, 'Error al crear el cliente') : null,
  };
}
