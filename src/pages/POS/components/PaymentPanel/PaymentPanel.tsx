import type { PaymentPanelProps } from './types';
import type { OperationMode } from '../../hooks/types';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: 'payments' },
  { value: 'transfer', label: 'Transferencia', icon: 'account_balance' },
  { value: 'credit', label: 'Crédito', icon: 'credit_card' },
] as const;

function DiscountRow({
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  subtotal,
}: {
  discountType: '$' | '%';
  setDiscountType: (type: '$' | '%') => void;
  discountValue: number;
  setDiscountValue: (value: number) => void;
  subtotal: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-neutral-500 uppercase tracking-wide text-xs font-semibold">
        Descuento
      </span>
      <div className="flex items-center gap-1.5">
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
          <button
            onClick={() => setDiscountType('$')}
            className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              discountType === '$'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            $
          </button>
          <button
            onClick={() => setDiscountType('%')}
            className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              discountType === '%'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            %
          </button>
        </div>
        <input
          id="discount-input"
          type="number"
          min={0}
          max={discountType === '%' ? 100 : subtotal}
          value={discountValue || ''}
          onChange={e => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-24 px-2 py-1.5 rounded-lg border border-neutral-200 text-sm text-right focus:border-primary-500 focus:outline-none"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

function DiscountAppliedRow({ discountAmount }: { discountAmount: number }) {
  return (
    <div className="flex justify-between text-xs text-neutral-500">
      <span>Descuento aplicado</span>
      <span>−${discountAmount.toLocaleString('es-AR')}</span>
    </div>
  );
}

function TotalRow({ total }: { total: number }) {
  return (
    <div className="flex justify-between items-baseline pt-2">
      <span className="text-lg font-bold text-primary-600">TOTAL</span>
      <span className="text-3xl font-extrabold text-primary-600">
        ${total.toLocaleString('es-AR')}
      </span>
    </div>
  );
}

function AmountReceivedRow({
  paymentMethod,
  amountReceived,
  setAmountReceived,
  change,
}: {
  paymentMethod: 'cash' | 'transfer' | 'credit';
  amountReceived: string;
  setAmountReceived: (value: string) => void;
  change: number;
}) {
  const showAmountReceived = paymentMethod === 'cash' || paymentMethod === 'transfer';
  const received = parseFloat(amountReceived) || 0;

  if (!showAmountReceived) return null;

  return (
    <div className="border-t border-neutral-200 pt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-neutral-500 flex items-center gap-2">
          Monto recibido
          <kbd className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200">
            F4
          </kbd>
        </span>
        <div className="flex items-center gap-1">
          <span className="text-sm text-neutral-400">$</span>
          <input
            id="amount-received"
            type="number"
            min={0}
            value={amountReceived}
            onChange={e => setAmountReceived(e.target.value)}
            className="w-28 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-right focus:border-primary-500 focus:outline-none"
            placeholder="0"
          />
        </div>
      </div>
      {received > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-success-600 font-medium">Vuelto</span>
          <span className="font-bold text-success-600">${change.toLocaleString('es-AR')}</span>
        </div>
      )}
    </div>
  );
}

function PaymentMethodRow({
  paymentMethod,
  setPaymentMethod,
  operation,
}: {
  paymentMethod: 'cash' | 'transfer' | 'credit';
  setPaymentMethod: (method: 'cash' | 'transfer' | 'credit') => void;
  operation: OperationMode;
}) {
  const isSale = operation === 'sale';
  const isReturn = operation === 'return';

  if (!isSale || isReturn) return null;

  return (
    <div className="space-y-3">
      <span className="text-neutral-500 uppercase tracking-wide text-xs font-semibold block">
        Método de pago
      </span>
      <div className="grid grid-cols-3 gap-2">
        {PAYMENT_METHODS.map(method => (
          <button
            key={method.value}
            onClick={() => setPaymentMethod(method.value)}
            className={`px-2 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all flex flex-col items-center gap-1 ${
              paymentMethod === method.value
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <span className="material-icons text-lg">{method.icon}</span>
            <span>{method.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionButtons({
  loading,
  disabled,
  operation,
  onCheckout,
}: {
  loading: boolean;
  disabled: boolean;
  operation: OperationMode;
  onCheckout: () => void;
}) {
  const getButtonLabel = (op: OperationMode): string => {
    switch (op) {
      case 'sale':
        return 'COBRAR';
      case 'quote':
        return 'GENERAR PRESUPUESTO';
      case 'return':
        return 'CONFIRMAR DEVOLUCIÓN';
    }
  };

  const getShortcutKey = (op: OperationMode): string => {
    switch (op) {
      case 'sale':
        return 'F9';
      case 'quote':
        return 'F9';
      case 'return':
        return 'F9';
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={() => {}}
        className="flex-1 py-3.5 rounded-xl bg-danger-600 text-white font-bold hover:bg-danger-700 transition-colors flex items-center justify-center gap-2"
      >
        ANULAR
        <kbd className="text-xs bg-white/20 px-1.5 py-0.5 rounded">ESC</kbd>
      </button>
      <button
        onClick={onCheckout}
        disabled={loading || disabled}
        className="flex-1 py-3.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {getButtonLabel(operation)}
        <kbd className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{getShortcutKey(operation)}</kbd>
      </button>
    </div>
  );
}

export function PaymentPanel({
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
}: PaymentPanelProps) {
  const isReturn = operation === 'return';

  return (
    <div className="w-[380px] flex flex-col gap-4 shrink-0">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500 uppercase tracking-wide text-xs font-semibold self-center">
            Subtotal
          </span>
          <span className="font-semibold text-neutral-900">
            ${subtotal.toLocaleString('es-AR')}
          </span>
        </div>

        {!isReturn && (
          <DiscountRow
            discountType={discountType}
            setDiscountType={setDiscountType}
            discountValue={discountValue}
            setDiscountValue={setDiscountValue}
            subtotal={subtotal}
          />
        )}

        {discountAmount > 0 && !isReturn && <DiscountAppliedRow discountAmount={discountAmount} />}

        <TotalRow total={total} />

        <AmountReceivedRow
          paymentMethod={paymentMethod}
          amountReceived={amountReceived}
          setAmountReceived={setAmountReceived}
          change={change}
        />

        <PaymentMethodRow
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          operation={operation}
        />
      </div>

      <ActionButtons
        loading={loading}
        disabled={disabled ?? false}
        operation={operation}
        onCheckout={onCheckout}
      />
    </div>
  );
}
