import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCacheNamespace,
  createCachePersister,
  purgePersistedCache,
  listPersistedNamespaces,
} from './persistence';

const fakeClient = {
  timestamp: Date.now(),
  buster: '',
  clientState: { mutations: [], queries: [] },
} as never;

describe('persistence (offline cache)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses the anon namespace without a stored user', () => {
    expect(getCacheNamespace()).toBe('anon');
  });

  it('namespaces by schoolId:userId from the stored user', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', schoolId: 's1' }));
    expect(getCacheNamespace()).toBe('s1:u1');
  });

  it('persister supports set/get/remove roundtrip per namespace', async () => {
    const persister = createCachePersister('s1:u1');
    await persister.persistClient(fakeClient);
    const restored = await persister.restoreClient();
    expect(restored).toBeTruthy();
    await persister.removeClient();
    expect(await persister.restoreClient()).toBeUndefined();
  });

  it('REGRESIÓN POS-108: múltiples namespaces conviven en la misma DB (login tras anon)', async () => {
    // Escenario del bug: la DB se creó con el namespace "anon" (pantalla de
    // login) y luego el usuario se loguea ("s1:u1"). Antes: NotFoundError.
    const anonPersister = createCachePersister('anon');
    await anonPersister.persistClient(fakeClient);

    const userPersister = createCachePersister('s1:u1');
    await expect(userPersister.persistClient(fakeClient)).resolves.toBeUndefined();
    expect(await userPersister.restoreClient()).toBeTruthy();
    expect(await anonPersister.restoreClient()).toBeTruthy();

    // purgar uno no afecta al otro
    await userPersister.removeClient();
    expect(await userPersister.restoreClient()).toBeUndefined();
    expect(await anonPersister.restoreClient()).toBeTruthy();
    await anonPersister.removeClient();
  });

  it('purgePersistedCache clears only the current namespace', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', schoolId: 's-purge' }));
    const mine = createCachePersister('s-purge:u1');
    const other = createCachePersister('s-purge:u2');
    await mine.persistClient(fakeClient);
    await other.persistClient(fakeClient);

    await purgePersistedCache();

    expect(await mine.restoreClient()).toBeUndefined();
    expect(await other.restoreClient()).toBeTruthy();
    await other.removeClient();
  });

  it('purge without user is a no-op that does not throw', async () => {
    localStorage.clear();
    await expect(purgePersistedCache()).resolves.toBeUndefined();
  });

  it('listPersistedNamespaces devuelve namespaces activos', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u9', schoolId: 's9' }));
    await createCachePersister('s9:u9').persistClient(fakeClient);
    const ns = await listPersistedNamespaces();
    expect(ns).toContain('s9:u9');
    await createCachePersister('s9:u9').removeClient();
  });
});
