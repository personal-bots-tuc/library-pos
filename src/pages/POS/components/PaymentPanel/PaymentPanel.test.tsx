import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PaymentPanel } from './PaymentPanel';
import type { PaymentPanelProps } from './types';

const baseProps: PaymentPanelProps = {
  subtotal: 12000,
  discountValue: 2000,
  discountType: '$',
  setDiscountValue: vi.fn(),
  setDiscountType: vi.fn(),
  paymentMethod: 'cash',
  setPaymentMethod: vi.fn(),
  amountReceived: '',
  setAmountReceived: vi.fn(),
  change: 0,
  discountAmount: 2000,
  onCheckout: vi.fn(),
  loading: false,
  disabled: false,
  operation: 'sale',
  total: 10000,
};

function getTotalValue(): HTMLElement {
  const totalLabel = screen.getByText('TOTAL');
  const totalRow = totalLabel.closest('div');
  if (!totalRow) throw new Error('No se encontró la fila TOTAL');
  return within(totalRow).getByText(/\$\d[\d.]*/) as HTMLElement;
}

describe('PaymentPanel - visualización del descuento en TOTAL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mostrar el total con descuento aplicado en el TOTAL grande, no el subtotal', () => {
    render(<PaymentPanel {...baseProps} />);

    const totalValue = getTotalValue();
    // El TOTAL grande debe mostrar 10.000 (subtotal 12.000 - descuento 2.000)
    expect(totalValue.textContent).toBe('$10.000');
    // El subtotal sigue mostrando 12.000 (es correcto, es una línea distinta)
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
  });

  it('debe mostrar el subtotal como TOTAL cuando no hay descuento', () => {
    render(<PaymentPanel {...baseProps} discountAmount={0} total={12000} />);

    const totalValue = getTotalValue();
    expect(totalValue.textContent).toBe('$12.000');
  });
});
