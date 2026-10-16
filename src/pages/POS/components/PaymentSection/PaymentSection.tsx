import { PaymentPanel } from '@/pages/POS/components/PaymentPanel/PaymentPanel.tsx';
import type { PaymentSectionProps } from './types';

export function PaymentSection({
  subtotal,
  discountValue,
  discountType,
  setDiscountValue,
  setDiscountType,
  paymentMethod,
  setPaymentMethod,
  amountReceived,
  setAmountReceived,
  change,
  discountAmount,
  total,
  onCheckout,
  loading,
  disabled,
  operation,
}: PaymentSectionProps) {
  return (
    <PaymentPanel
      subtotal={subtotal}
      discountValue={discountValue}
      discountType={discountType}
      setDiscountValue={setDiscountValue}
      setDiscountType={setDiscountType}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      amountReceived={amountReceived}
      setAmountReceived={setAmountReceived}
      change={change}
      discountAmount={discountAmount}
      total={total}
      onCheckout={onCheckout}
      loading={loading}
      disabled={disabled}
      operation={operation}
    />
  );
}
