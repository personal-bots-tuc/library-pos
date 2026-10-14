import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './useToast';

function Probe() {
  const toast = useToast();
  return (
    <div>
      <button data-testid="ok" onClick={() => toast.success('Venta procesada correctamente')} />
      <button data-testid="err" onClick={() => toast.error('No se pudo confirmar la venta')} />
    </div>
  );
}

describe('ToastProvider viewport (los errores deben SER VISIBLES)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('los toasts se renderizan en el DOM (antes eran invisibles)', () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );

    act(() => {
      screen.getByTestId('ok').click();
      screen.getByTestId('err').click();
    });

    expect(screen.getByText('Venta procesada correctamente')).toBeInTheDocument();
    expect(screen.getByText('No se pudo confirmar la venta')).toBeInTheDocument();
  });

  it('los mensajes se auto-eliminan', () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );

    act(() => {
      screen.getByTestId('err').click();
    });
    expect(screen.getByText('No se pudo confirmar la venta')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4_200);
    });
    expect(screen.queryByText('No se pudo confirmar la venta')).not.toBeInTheDocument();
  });
});
