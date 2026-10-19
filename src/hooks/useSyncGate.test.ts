import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncGate, __resetSyncGateForTests, INACTIVITY_LIMIT_MS } from './useSyncGate';

function setVisibilityState(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value, configurable: true });
}

describe('useSyncGate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibilityState('visible');
    __resetSyncGateForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibilityState('visible');
    __resetSyncGateForTests();
  });

  it('is true when visible with recent activity', () => {
    const { result } = renderHook(() => useSyncGate());
    expect(result.current).toBe(true);
  });

  it('becomes false when the tab is hidden and true again when visible', () => {
    const { result } = renderHook(() => useSyncGate());
    expect(result.current).toBe(true);

    setVisibilityState('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe(false);

    setVisibilityState('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe(true);
  });

  it('becomes false after INACTIVITY_LIMIT_MS without user activity', () => {
    const { result } = renderHook(() => useSyncGate());
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(INACTIVITY_LIMIT_MS + 20_000);
    });
    expect(result.current).toBe(false);
  });

  it('reactivates on user activity even without interval tick', () => {
    const { result } = renderHook(() => useSyncGate());

    act(() => {
      vi.advanceTimersByTime(INACTIVITY_LIMIT_MS + 20_000);
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(result.current).toBe(true);
  });

  it('shares a single store between multiple consumers', () => {
    const a = renderHook(() => useSyncGate());
    const b = renderHook(() => useSyncGate());

    setVisibilityState('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(a.result.current).toBe(false);
    expect(b.result.current).toBe(false);
  });
});
