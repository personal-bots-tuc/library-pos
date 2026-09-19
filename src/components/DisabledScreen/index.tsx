import type { DisabledScreenProps } from './types';
import { useId } from 'react';

const getConfig = (variant: 'admin' | 'pos') => {
  if (variant === 'admin') {
    return {
      icon: 'admin_panel_settings',
      brand: 'Library Admin',
      defaultTitle: 'Acceso al Panel Deshabilitado',
      defaultMessage:
        'Esta escuela ha sido deshabilitada por el super administrador. El acceso al panel de administración se encuentra temporalmente restringido. Tus datos permanecen seguros y guardados.',
      defaultSupportText: 'Contacta al super administrador del sistema para reactivar el acceso.',
      refPrefix: 'REF-ADM-DIS-',
    };
  }
  return {
    icon: 'point_of_sale',
    brand: 'Library POS',
    defaultTitle: 'Acceso al POS Deshabilitado',
    defaultMessage:
      'Este punto de venta ha sido deshabilitado por el administrador. El acceso al módulo de ventas se encuentra temporalmente restringido. Tus datos permanecen seguros y guardados.',
    defaultSupportText: 'Contacta al administrador de tu negocio para reactivar el acceso.',
    refPrefix: 'REF-POS-DIS-',
  };
};

export const DisabledScreen = ({
  variant = 'admin',
  title,
  message,
  details,
  supportText,
  referenceCode,
}: DisabledScreenProps) => {
  const config = getConfig(variant);
  const stableId = useId(); // ID estable para referenceCode fallback

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-neutral-900 relative overflow-hidden px-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary-700/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-secondary-500/10 rounded-full blur-3xl" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md mx-auto text-center">
        <div className="bg-neutral-800 rounded-2xl shadow-2xl p-10 border border-neutral-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-900/30 mb-5" aria-hidden="true">
            <span className="material-icons text-amber-400 text-3xl">{config.icon}</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {title ?? config.defaultTitle}
          </h1>

          <p className="text-neutral-400 mb-6">
            {message ?? config.defaultMessage}
          </p>

          {details && (
            <div className="mb-6 p-4 bg-neutral-800 rounded-xl text-left border border-neutral-700">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Terminal</dt>
                  <dd className="font-mono text-white">{details.terminalId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Sucursal</dt>
                  <dd className="font-medium text-white">{details.branchName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Motivo</dt>
                  <dd className="text-neutral-300">{details.reason}</dd>
                </div>
              </dl>
            </div>
          )}

          <p className="text-sm text-neutral-500 mb-4">
            {supportText ?? config.defaultSupportText}
          </p>

          <p className="text-center text-xs text-neutral-500">
            {referenceCode ?? `${config.refPrefix}${stableId.slice(-6).toUpperCase()}`}
          </p>

          <p className="mt-4 text-center text-xs text-neutral-600">
            © 2026 Library System · v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};