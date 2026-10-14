import { useEffect, useState } from 'react';
import { onPwaUpdateAvailable, applyPwaUpdate } from '../../lib/pwa';

/**
 * Banner "Nueva versión disponible" — aparece SOLO cuando hay un SW nuevo en
 * espera. Nunca fuerza el reload: el usuario decide cuándo (nunca a mitad de
 * una venta). El cierre deja el aviso en espera hasta la próxima navegación.
 */
export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => onPwaUpdateAvailable(() => setVisible(true)), []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-xl"
    >
      <span className="material-icons text-blue-600 text-[20px]">system_update</span>
      <p className="text-sm text-neutral-700">Hay una versión nueva lista</p>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          applyPwaUpdate();
        }}
        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Actualizar
      </button>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso de actualización"
        className="text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <span className="material-icons text-[16px]">close</span>
      </button>
    </div>
  );
}
