import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SchoolProvider, useSchool } from './index';
import { STORAGE_KEYS } from '../authService';
import api from '@/api/client';

function Probe() {
  const { school, schoolName, loading, error } = useSchool();
  return (
    <div>
      <output data-testid="name">{schoolName}</output>
      <output data-testid="id">{school?.id ?? 'none'}</output>
      <output data-testid="loading">{loading ? 'loading' : 'idle'}</output>
      <output data-testid="error">{error ?? 'no-error'}</output>
    </div>
  );
}

describe('SchoolProvider / useSchool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('carga el negocio guardado por slug', async () => {
    localStorage.setItem(STORAGE_KEYS.POS_APP_SLUG, 'libreria-centro');
    vi.mocked(api.get).mockResolvedValue({
      data: { id: 's1', name: 'Librería Centro', slug: 'libreria-centro' },
    });

    render(
      <SchoolProvider fallbackName="Sistema">
        <Probe />
      </SchoolProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('idle'));
    expect(screen.getByTestId('name')).toHaveTextContent('Librería Centro');
    expect(screen.getByTestId('id')).toHaveTextContent('s1');
    expect(api.get).toHaveBeenCalledWith('/schools/public/libreria-centro');
  });

  it('usa el fallback cuando no hay slug guardado', async () => {
    render(
      <SchoolProvider fallbackName="Sistema">
        <Probe />
      </SchoolProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('idle'));
    expect(screen.getByTestId('name')).toHaveTextContent('Sistema');
    expect(screen.getByTestId('id')).toHaveTextContent('none');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('expone error cuando el fetch falla', async () => {
    localStorage.setItem(STORAGE_KEYS.POS_APP_SLUG, 'roto');
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    render(
      <SchoolProvider fallbackName="Sistema">
        <Probe />
      </SchoolProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('idle'));
    expect(screen.getByTestId('error')).toHaveTextContent('Network error');
    expect(screen.getByTestId('name')).toHaveTextContent('Sistema');
  });

  it('setSchoolFromLogin puebla el contexto sin fetch y refetch vuelve a pedir', async () => {
    localStorage.setItem(STORAGE_KEYS.POS_APP_SLUG, 'abcde');
    vi.mocked(api.get).mockResolvedValue({
      data: { id: 's2', name: 'Actualizada', slug: 'abcde' },
    });

    function ProbeActions() {
      const { setSchoolFromLogin, refetch, schoolName } = useSchool();
      return (
        <div>
          <output data-testid="name">{schoolName}</output>
          <button
            data-testid="set"
            onClick={() =>
              setSchoolFromLogin({ id: 'sx', name: 'Directa', slug: 'abcde', active: true })
            }
          />
          <button data-testid="refetch" onClick={() => void refetch()} />
        </div>
      );
    }

    render(
      <SchoolProvider fallbackName="Sistema">
        <ProbeActions />
      </SchoolProvider>
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    await act(async () => {
      screen.getByTestId('set').click();
    });
    expect(screen.getByTestId('name')).toHaveTextContent('Directa');

    await act(async () => {
      screen.getByTestId('refetch').click();
    });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Actualizada'));
  });

  it('useSchool fuera del provider lanza error', () => {
    const Broken = () => {
      useSchool();
      return null;
    };
    expect(() => render(<Broken />)).toThrow('SchoolProvider');
  });
});
