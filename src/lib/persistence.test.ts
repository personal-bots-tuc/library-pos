import { describe, it, expect, beforeEach } from 'vitest';
import { getCacheNamespace, createCachePersister, purgePersistedCache } from './persistence';

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
    await persister.persistClient({
      timestamp: Date.now(),
      buster: '',
      clientState: { mutations: [], queries: [] },
    } as never);
    const restored = await persister.restoreClient();
    expect(restored).toBeTruthy();
    expect((restored as { buster: string }).buster).toBe('');
    await persister.removeClient();
    expect(await persister.restoreClient()).toBeUndefined();
  });

  it('purgePersistedCache clears only the current namespace', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', schoolId: 's1' }));
    const persister = createCachePersister('s1:u1');
    await persister.persistClient({
      timestamp: Date.now(),
      buster: 'x',
      clientState: { mutations: [], queries: [] },
    } as never);

    await purgePersistedCache();

    expect(await persister.restoreClient()).toBeUndefined();
  });

  it('purge without user is a no-op that does not throw', async () => {
    localStorage.clear();
    await expect(purgePersistedCache()).resolves.toBeUndefined();
  });
});
