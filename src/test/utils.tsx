import React from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../hooks/useToast';
import { SchoolProvider } from '../hooks/useSchool';

interface WrapperProps {
  children: React.ReactNode;
}

/**
 * QueryClient para tests: networkMode 'always' (no pausa por conectividad),
 * sin retries, cache infinito para aislar cada test.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        networkMode: 'always',
        refetchOnWindowFocus: false,
        gcTime: Infinity,
      },
      mutations: { retry: 0, networkMode: 'always' },
    },
  });
}

export function getHookWrapper(client?: QueryClient) {
  const queryClient = client ?? createTestQueryClient();
  return function HookWrapper({ children }: WrapperProps) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const AllProviders: React.FC<WrapperProps> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SchoolProvider fallbackName="Test">
          <ToastProvider>{children}</ToastProvider>
        </SchoolProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
