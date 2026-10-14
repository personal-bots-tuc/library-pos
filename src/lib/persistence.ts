import { createStore, get, set, del, clear } from 'idb-keyval';
import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client';
import { STORAGE_KEYS } from '../hooks/authService';

/**
 * Persistencia del cache de React Query en IndexedDB, namespaced por
 * tenant+usuario (`schoolId:userId`) para que una misma PC compartida
 * nunca filtre datos entre usuarios al cerrar/abrir sesión.
 */

const DB_NAME = 'pos-offline-cache';
const STORE_PREFIX = 'rq';
const PERSIST_KEY_PREFIX = 'pos-query';

interface CachedIdentity {
  schoolId?: string;
  id?: string;
}

export function getCacheNamespace(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    const user = raw ? (JSON.parse(raw) as CachedIdentity) : null;
    if (user?.schoolId && user?.id) return `${user.schoolId}:${user.id}`;
  } catch {
    // localStorage inaccesible o JSON corrupto: caer al namespace anónimo
  }
  return 'anon';
}

function storeFor(namespace: string) {
  return createStore(DB_NAME, `${STORE_PREFIX}-${namespace}`);
}

export function createCachePersister(namespace: string): Persister {
  const store = storeFor(namespace);
  const key = `${PERSIST_KEY_PREFIX}-${namespace}`;
  // Persister write-through: el volumen de sync es bajo (catálogo cada 10 min),
  // no hace falta throttle. Devuelve la promise para ser testeable.
  return {
    persistClient: (client: PersistedClient) => set(key, client, store),
    restoreClient: () => get<PersistedClient>(key, store),
    removeClient: () => del(key, store),
  };
}

export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Purga el cache persistido del usuario ACTUAL. Debe llamarse ANTES de
 * limpiar localStorage en logout (lee el namespace del usuario almacenado).
 * El query client vivo se descarta aparte vía remount del provider.
 * Best-effort: nunca propaga errores (p.ej. store nunca creado en IDB).
 */
export async function purgePersistedCache(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    await clear(storeFor(getCacheNamespace()));
  } catch {
    // El store aún no existe para este namespace: no hay nada que purgar.
  }
}
