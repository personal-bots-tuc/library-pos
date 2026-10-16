import type { OperationMode } from '../../hooks/types';

export interface PaymentPanelProps {
  subtotal: number;
  discountValue: number;
  discountType: '$' | '%';
  setDiscountValue: (value: number) => void;
  setDiscountType: (type: '$' | '%') => void;
  paymentMethod: 'cash' | 'transfer' | 'credit';
  setPaymentMethod: (method: 'cash' | 'transfer' | 'credit') => void;
  amountReceived: string;
  setAmountReceived: (value: string) => void;
  change: number;
  discountAmount: number;
  /** Total con descuento aplicado (subtotal - discountAmount). Se muestra en el TOTAL grande. */
  total: number;
  onCheckout: () => void;
  loading: boolean;
  disabled?: boolean;
  operation: OperationMode;
}
