import { describe, it, expect, vi } from 'vitest';
import { createSharedResource } from './sharedResource';

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('createSharedResource', () => {
  it('shares one request between callers that ask at the same time', async () => {
    const load = vi.fn(() => Promise.resolve([1, 2]));
    const r = createSharedResource<number[]>([], load, { ttlMs: 1000 });
    await Promise.all([r.ensure(), r.ensure(), r.ensure()]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(r.getSnapshot()).toMatchObject({ data: [1, 2], loading: false, complete: true, error: null });
  });

  it('serves a fresh copy without asking again, and reloads once it is stale', async () => {
    let clock = 0;
    const load = vi.fn(() => Promise.resolve('x'));
    const r = createSharedResource('', load, { ttlMs: 1000, now: () => clock });
    await r.ensure();
    clock = 500;
    await r.ensure();
    expect(load).toHaveBeenCalledTimes(1);
    clock = 1500;
    await r.ensure();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('always reloads when forced', async () => {
    const load = vi.fn(() => Promise.resolve('x'));
    const r = createSharedResource('', load, { ttlMs: 60_000 });
    await r.ensure();
    await r.ensure(true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('never caches a failure, so the next caller tries again', async () => {
    const load = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('down')))
      .mockImplementationOnce(() => Promise.resolve('ok'));
    const r = createSharedResource('', load, { ttlMs: 60_000, errorMessage: 'nope' });
    await r.ensure();
    expect(r.getSnapshot()).toMatchObject({ error: 'nope', complete: true, loading: false });
    await r.ensure();
    expect(r.getSnapshot()).toMatchObject({ data: 'ok', error: null });
  });

  it('paints progressive pages before the load completes, and tells subscribers', async () => {
    const gate = deferred<number[]>();
    const r = createSharedResource<number[]>([], async (emit) => {
      emit([1]);
      return gate.promise;
    }, { ttlMs: 1000 });
    const seen: number[][] = [];
    r.subscribe(() => seen.push(r.getSnapshot().data));
    const pending = r.ensure();
    expect(r.getSnapshot()).toMatchObject({ data: [1], loading: false, complete: false });
    gate.resolve([1, 2]);
    await pending;
    expect(r.getSnapshot()).toMatchObject({ data: [1, 2], complete: true });
    expect(seen).toEqual([[1], [1, 2]]);
  });
});
