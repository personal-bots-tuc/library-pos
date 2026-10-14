import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockUser = {
  id: 'user-1',
  name: 'Juan Pérez',
  role: 'seller' as const,
  schoolId: 'school-1',
  posId: 'pos-1',
};

const mockAuthResponse = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-123',
  user: mockUser,
};

vi.mock('../api/auth', () => ({
  loginWithPin: vi.fn(),
  loginWithEmail: vi.fn(),
}));

import { AuthProvider, useAuth } from './useAuth';
import { loginWithPin, loginWithEmail } from '../api/auth';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with null user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should load user from localStorage on mount', async () => {
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('accessToken', 'token-123');

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should not load user if no token', async () => {
    localStorage.setItem('user', JSON.stringify(mockUser));
    // No accessToken

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should login with PIN', async () => {
    vi.mocked(loginWithPin).mockResolvedValue(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.loginPin('1234', 'school-1');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('access-token-123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token-123');
    expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
  });

  it('should login with email', async () => {
    vi.mocked(loginWithEmail).mockResolvedValue(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.loginEmail('juan@test.com', 'password123');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(loginWithEmail).toHaveBeenCalledWith('juan@test.com', 'password123');
  });

  it('should handle login error', async () => {
    vi.mocked(loginWithPin).mockRejectedValue(new Error('PIN incorrecto'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.loginPin('wrong', 'school-1');
      })
    ).rejects.toThrow('PIN incorrecto');

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should logout and clear storage but keep pos app slug', async () => {
    vi.mocked(loginWithPin).mockResolvedValue(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.loginPin('1234', 'school-1');
    });

    localStorage.setItem('posAppSlug', 'menta-dev');

    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      result.current.logout();
    });

    // logout purga el cache persistido (async) antes de limpiar el storage
    await waitFor(() => expect(localStorage.getItem('accessToken')).toBeNull());
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('posAppSlug')).toBe('menta-dev');
  });

  it('should detect admin role', async () => {
    const adminUser = { ...mockUser, role: 'admin' as const };
    vi.mocked(loginWithPin).mockResolvedValue({ ...mockAuthResponse, user: adminUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.loginPin('1234', 'school-1');
    });

    expect(result.current.isAdmin).toBe(true);
  });

  it('should throw if used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });
});
