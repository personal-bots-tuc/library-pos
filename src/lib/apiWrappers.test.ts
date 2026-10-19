import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginWithPin, loginWithEmail } from '../api/auth';
import { getPublicSchoolBySlug } from '../api/schools';
import api from '../api/client';
import { authService, STORAGE_KEYS } from '../hooks/authService';

describe('api/auth + api/schools (wrappers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('loginWithPin hace POST a /auth/login-pin', async () => {
    const payload = { accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } };
    vi.mocked(api.post).mockResolvedValue({ data: payload });

    const res = await loginWithPin('1234', 'school-1');

    expect(res).toEqual(payload);
    expect(api.post).toHaveBeenCalledWith('/auth/login-pin', { pin: '1234', schoolId: 'school-1' });
  });

  it('loginWithEmail hace POST a /auth/login-email', async () => {
    const payload = { accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } };
    vi.mocked(api.post).mockResolvedValue({ data: payload });

    await loginWithEmail('ana@test.com', 'secret');

    expect(api.post).toHaveBeenCalledWith('/auth/login-email', {
      email: 'ana@test.com',
      password: 'secret',
    });
  });

  it('getPublicSchoolBySlug hace GET al endpoint público', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { id: 's1', name: 'X', slug: 'x' } });

    const school = await getPublicSchoolBySlug('x');

    expect(school.id).toBe('s1');
    expect(api.get).toHaveBeenCalledWith('/schools/public/x');
  });

  it('authService.loginPin persiste tokens y usuario', async () => {
    const user = { id: 'u9', name: 'A', role: 'seller' as const, schoolId: 's9' };
    vi.mocked(api.post).mockResolvedValue({
      data: { accessToken: 'ta', refreshToken: 'tb', user },
    });

    const result = await authService.loginPin('1111', 's9');

    expect(result).toEqual(user);
    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN, 'ta');
    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER, JSON.stringify(user));
    expect(authService.getAccessToken()).toBe('ta');
    expect(authService.getStoredUser()).toEqual(user);
  });

  it('authService.logout limpia tokens pero conserva posAppSlug', () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'ta');
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'tb');
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ id: 'u' }));
    localStorage.setItem(STORAGE_KEYS.POS_APP_SLUG, 'libreria-x');

    authService.logout();

    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.POS_APP_SLUG)).toBe('libreria-x');
  });
});
