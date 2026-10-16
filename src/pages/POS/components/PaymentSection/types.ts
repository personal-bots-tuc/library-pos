import type { OperationMode } from '../../hooks/types';

export interface PaymentSectionProps {
  subtotal: number;
  discountValue: number;
  discountType: '$' | '%';
  setDiscountValue: (_v: number) => void;
  setDiscountType: (_t: '$' | '%') => void;
  paymentMethod: 'cash' | 'transfer' | 'credit';
  setPaymentMethod: (_m: 'cash' | 'transfer' | 'credit') => void;
  amountReceived: string;
  setAmountReceived: (_v: string) => void;
  change: number;
  discountAmount: number;
  /** Total con descuento aplicado (subtotal - discountAmount). */
  total: number;
  onCheckout: () => void;
  loading: boolean;
  disabled: boolean;
  operation: OperationMode;
}
