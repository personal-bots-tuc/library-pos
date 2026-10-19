/**
 * Registro del Service Worker + canal de actualización (modo prompt).
 *
 * El banner de "nueva versión" lo decide la UI; acá solo se expone el estado.
 * El reload tras SKIP_WAITING es automático vía 'controllerchange'.
 */

type UpdateListener = (_waitingWorker: ServiceWorker) => void;

let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<UpdateListener>();
let reloadArmed = false;

function notify(worker: ServiceWorker) {
  waitingWorker = worker;
  for (const listener of listeners) listener(worker);
}

export function onPwaUpdateAvailable(listener: UpdateListener): () => void {
  listeners.add(listener);
  if (waitingWorker) listener(waitingWorker);
  return () => listeners.delete(listener);
}

export function hasPendingPwaUpdate(): boolean {
  return !!waitingWorker;
}

/** El usuario aceptó actualizar: activamos el SW nuevo; el reload ocurre en controllerchange. */
export function applyPwaUpdate(): void {
  waitingWorker?.postMessage('SKIP_WAITING');
}

export function registerPwa(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return; // en dev no registrar

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then(registration => {
      if (registration.waiting) notify(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const next = registration.installing;
        if (!next) return;
        next.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            notify(next);
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadArmed) return;
      reloadArmed = true;
      window.location.reload();
    });
  });
}
