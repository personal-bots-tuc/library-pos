import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConnectivityBadge } from './index';
import { getHookWrapper } from '../../test/utils';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

describe('ConnectivityBadge', () => {
  beforeEach(() => setOnline(true));
  afterEach(() => setOnline(true));

  it('renders nothing when online and idle', () => {
    const { container } = render(<ConnectivityBadge />, { wrapper: getHookWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it('shows the offline badge (informational, no actions) when offline', () => {
    setOnline(false);
    render(<ConnectivityBadge />, { wrapper: getHookWrapper() });

    expect(screen.getByText(/Sin conexión/i)).toBeInTheDocument();
    // Sin botones: el sistema se recupera solo
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows recovery message when connection comes back', () => {
    setOnline(false);
    render(<ConnectivityBadge />, { wrapper: getHookWrapper() });
    expect(screen.getByText(/Sin conexión/i)).toBeInTheDocument();

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByText(/Conexión recuperada/i)).toBeInTheDocument();
  });
});
