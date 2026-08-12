import { describe, it, expect } from 'vitest';
import reducer, {
  STARTER_LIST_SIZE,
  addStarterList,
  addItem,
  addCategory,
  buildStarterCategories,
  loadPacking,
  resetPacking,
  type PackingState,
} from './packingSlice';

/**
 * The rule these tests exist to hold: a trip has no packing list until someone
 * makes one. Every trip used to arrive with 70 items nobody had chosen, which got
 * saved onto the trip and shown on its public page as "0 of 70 packed".
 */
const empty = (): PackingState => reducer(undefined, { type: '@@INIT' });

describe('packing starts empty', () => {
  it('seeds nothing', () => {
    expect(empty().categories).toEqual([]);
    expect(empty().activeCategoryId).toBeUndefined();
  });
});

describe('addStarterList', () => {
  it('adds the standard three lists on request', () => {
    const state = reducer(empty(), addStarterList());
    expect(state.categories.map(c => c.id)).toEqual(['clothing', 'essentials', 'toiletries']);
    expect(state.categories.flatMap(c => c.items)).toHaveLength(STARTER_LIST_SIZE);
    expect(state.activeCategoryId).toBe('clothing');
  });

  it('starts with everything unpacked', () => {
    const state = reducer(empty(), addStarterList());
    expect(state.categories.flatMap(c => c.items).every(i => !i.checked)).toBe(true);
  });

  it('cannot be applied twice into two Clothing lists', () => {
    const once = reducer(empty(), addStarterList());
    const twice = reducer(once, addStarterList());
    expect(twice.categories.map(c => c.id)).toEqual(['clothing', 'essentials', 'toiletries']);
  });

  it('leaves a list the traveller already built alone', () => {
    let state = reducer(empty(), addCategory({ name: 'Hiking' }));
    state = reducer(state, addItem({ categoryId: 'hiking', name: 'Trekking Poles' }));
    state = reducer(state, addStarterList());
    expect(state.categories.map(c => c.id)).toEqual(['hiking', 'clothing', 'essentials', 'toiletries']);
    expect(state.categories[0].items).toHaveLength(1);
    // The traveller's own list stays selected; adding a starter set does not
    // yank them somewhere else.
    expect(state.activeCategoryId).toBe('hiking');
  });
});

describe('buildStarterCategories', () => {
  /*
   * It has to be a function. As a module-level constant the nanoid item ids were
   * generated once, so two trips shared them, and a second copy added into one
   * list would collide with the first.
   */
  it('mints fresh item ids on every call', () => {
    const a = buildStarterCategories().flatMap(c => c.items).map(i => i.id);
    const b = buildStarterCategories().flatMap(c => c.items).map(i => i.id);
    expect(a).not.toEqual(b);
    expect(new Set([...a, ...b]).size).toBe(a.length + b.length);
  });
});

describe('loadPacking replaces rather than merges', () => {
  /*
   * The old reducer kept the current categories when the payload was empty. That
   * was invisible while every trip carried the same defaults, but with real empty
   * trips it means opening trip B shows trip A's list.
   */
  it('an empty payload clears, it does not fall back to what is loaded', () => {
    const withList = reducer(empty(), addStarterList());
    const cleared = reducer(withList, loadPacking({ categories: [] }));
    expect(cleared.categories).toEqual([]);
    expect(cleared.activeCategoryId).toBeUndefined();
  });

  it('adopts the incoming list and selects its first category', () => {
    const withList = reducer(empty(), addStarterList());
    const other = reducer(withList, loadPacking({
      categories: [{ id: 'hiking', name: 'Hiking', type: 'group', items: [] }],
    }));
    expect(other.categories.map(c => c.id)).toEqual(['hiking']);
    expect(other.activeCategoryId).toBe('hiking');
  });

  it('survives a payload with no categories array at all', () => {
    const withList = reducer(empty(), addStarterList());
    const junk = reducer(withList, loadPacking({ categories: undefined as unknown as [] }));
    expect(junk.categories).toEqual([]);
  });
});

describe('resetPacking', () => {
  it('clears everything on a trip switch', () => {
    const withList = reducer(empty(), addStarterList());
    expect(reducer(withList, resetPacking())).toEqual({ categories: [], activeCategoryId: undefined });
  });
});
