import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ToastProvider, useToast } from './useToast';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('agrega toasts de success/error/warning', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.success('ok');
      result.current.error('mal');
      result.current.warning('ojo');
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts.map(t => t.type)).toEqual(['success', 'error', 'warning']);
  });

  it('los toasts se auto-eliminan a los 4s', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.success('temporal');
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(4_100);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('lanza error fuera del provider', () => {
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used within ToastProvider'
    );
  });
});
