import { createStore, get, set, del, keys } from 'idb-keyval';
import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client';
import { STORAGE_KEYS } from '../hooks/authService';

/**
 * Persistencia del cache de React Query en IndexedDB, namespaced por
 * tenant+usuario (`schoolId:userId`) para no filtrar datos entre usuarios
 * de la misma PC.
 *
 * TRAMPA (POS-108 hotfix 2026-10-14): los object stores de un IndexedDB se
 * crean SOLO en onupgradeneeded. Crear un store por namespace con
 * createStore(db, 'rq-<ns>') falla para todo namespace posterior al primero
 * ("One of the specified object stores was not found"). Por eso hay UN solo
 * store fijo y el namespace va en el PREFIJO DE LA KEY.
 */

const DB_NAME = 'pos-offline-cache-v2';
const STORE_NAME = 'cache';
const PERSIST_KEY_PREFIX = 'pos-query';
const LEGACY_DB_NAME = 'pos-offline-cache';

let legacyDropped = false;
/** La DB v1 (stores por namespace) quedó inutilizable: se descarta una vez. */
function dropLegacyDb(): void {
  if (legacyDropped || typeof indexedDB === 'undefined') return;
  legacyDropped = true;
  try {
    indexedDB.deleteDatabase(LEGACY_DB_NAME);
  } catch {
    // best-effort
  }
}

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
    // storage inaccesible o JSON corrupto → namespace anónimo
  }
  return 'anon';
}

function keyFor(namespace: string) {
  return `${PERSIST_KEY_PREFIX}:${namespace}`;
}

const store = () => createStore(DB_NAME, STORE_NAME);

export function createCachePersister(namespace: string): Persister {
  dropLegacyDb();
  const key = keyFor(namespace);
  // Persister write-through sobre store fijo (el namespace vive en la key).
  return {
    persistClient: (client: PersistedClient) => set(key, client, store()),
    restoreClient: () => get<PersistedClient>(key, store()),
    removeClient: () => del(key, store()),
  };
}

export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Purga SOLO el cache del namespace actual (best-effort: nunca lanza).
 * Llamar ANTES de limpiar localStorage en logout.
 */
export async function purgePersistedCache(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  dropLegacyDb();
  try {
    await del(keyFor(getCacheNamespace()), store());
  } catch {
    // nada que purgar
  }
}

/** Utilidad de test/diagnóstico: namespaces actualmente persistidos. */
export async function listPersistedNamespaces(): Promise<string[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const all = await keys(store());
    return all
      .map(k => String(k))
      .filter(k => k.startsWith(`${PERSIST_KEY_PREFIX}:`))
      .map(k => k.slice(`${PERSIST_KEY_PREFIX}:`.length));
  } catch {
    return [];
  }
}
