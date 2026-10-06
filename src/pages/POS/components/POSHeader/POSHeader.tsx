import { useState } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useSchool } from '../../../../hooks/useSchool';
import { useCashMovements } from '../../hooks/useCashMovements';
import type { POSHeaderProps } from './types';
import { CashMovementModal } from '../CashMovementModal';
import { OperationSelector } from '../OperationSelector/OperationSelector.tsx';

function ShiftInfo({ activeShift }: { activeShift: POSHeaderProps['activeShift'] }) {
  return (
    <div className="text-sm">
      <div className="flex items-center gap-2">
        <span className="text-neutral-600">
          Turno #{activeShift?.id?.slice(-6)?.toUpperCase() || '—'}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">
          <span className="w-1.5 h-1.5 rounded-full bg-success-500"></span>
          ABIERTO
        </span>
      </div>
      <p className="text-xs text-neutral-400">
        Apertura{' '}
        {activeShift?.openedAt
          ? new Date(activeShift.openedAt).toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—'}{' '}
        · Cierre pendiente
      </p>
    </div>
  );
}

function VendedorInfo({ user }: { user: { name?: string } | null | undefined }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-600">
      <svg
        className="w-4 h-4 text-neutral-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
      Vendedor: <span className="font-semibold text-neutral-900">{user?.name}</span>
    </div>
  );
}

function HeaderActions({
  operation,
  setOperation,
  onShiftStatus,
  onCloseShift,
  onLogout,
  setMovementsOpen,
  unreadCount,
}: {
  operation: POSHeaderProps['operation'];
  setOperation: POSHeaderProps['setOperation'];
  onShiftStatus: POSHeaderProps['onShiftStatus'];
  onCloseShift: POSHeaderProps['onCloseShift'];
  onLogout: POSHeaderProps['onLogout'];
  setMovementsOpen: (open: boolean) => void;
  unreadCount: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <OperationSelector operation={operation} onChange={setOperation} />
      <button
        onClick={onShiftStatus}
        className="px-4 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
      >
        Estado del Turno
      </button>
      <button
        onClick={onCloseShift}
        className="px-4 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
      >
        Cerrar Turno
      </button>
      <button
        onClick={() => setMovementsOpen(true)}
        className="ml-2 px-4 py-2 rounded-lg bg-white border border-primary-500 text-primary-600 text-sm font-medium hover:bg-primary-50 hover:border-primary-600 transition-colors flex items-center gap-2"
        aria-label="Ver movimientos de caja"
      >
        <span>Movimientos</span>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-primary-600 bg-primary-50 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      <button
        onClick={onLogout}
        className="ml-2 text-sm text-danger-600 hover:text-danger-700 font-medium"
      >
        Salir
      </button>
    </div>
  );
}

export function POSHeader({
  activeShift,
  onCloseShift,
  onShiftStatus,
  onLogout,
  onCashMovement,
  operation,
  setOperation,
}: POSHeaderProps) {
  const { user } = useAuth();
  const { schoolName } = useSchool();
  const { aggregated, loading } = useCashMovements(activeShift?.id ?? null);

  const [movementsOpen, setMovementsOpen] = useState(false);

  const _unreadCount = aggregated?.movementsCount ?? 0;

  return (
    <header className="bg-white border-b border-neutral-200 px-6 py-3 flex items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h1 className="text-base font-bold text-neutral-900">{schoolName} POS</h1>
      </div>

      <div className="flex items-center gap-6">
        <VendedorInfo user={user} />
        <ShiftInfo activeShift={activeShift} />
        <HeaderActions
          operation={operation}
          setOperation={setOperation}
          onShiftStatus={onShiftStatus}
          onCloseShift={onCloseShift}
          onLogout={onLogout}
          setMovementsOpen={setMovementsOpen}
          unreadCount={_unreadCount}
        />

        <CashMovementModal
          isOpen={movementsOpen}
          onClose={() => setMovementsOpen(false)}
          onSubmit={async data => {
            await onCashMovement(data);
            setMovementsOpen(false);
          }}
          loading={loading}
        />
      </div>
    </header>
  );
}
