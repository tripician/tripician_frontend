import { describe, it, expect } from 'vitest';
import { composeImportantNotes, composeImportedExtras } from './planSeed';

describe('composeImportedExtras', () => {
  it('turns what the planner no longer keeps apart into note lines', () => {
    expect(composeImportedExtras(
      [{ category: 'Documents', name: 'Passport', qty: 1 }, { category: 'Bag', name: 'Socks', qty: 3 }, { category: 'Bag', name: '  ', qty: 1 }],
    )).toEqual(['To bring: Passport, Socks x3']);
  });

  it('says nothing when there is nothing to carry over', () => {
    expect(composeImportedExtras([])).toEqual([]);
    expect(composeImportedExtras(undefined)).toEqual([]);
  });
});

describe('composeImportantNotes', () => {
  it('returns the notes alone when nothing was left over', () => {
    expect(composeImportantNotes('Carry cash in Kyoto.', [])).toBe('Carry cash in Kyoto.');
  });

  it('labels the leftovers rather than blending them into our own notes', () => {
    const result = composeImportantNotes('Carry cash.', ['Book flights', 'Ask Rahul about the visa']);
    expect(result).toBe(
      'Carry cash.\n\nFrom your notes:\n- Book flights\n- Ask Rahul about the visa',
    );
  });

  it('still keeps the leftovers when there were no trip notes at all', () => {
    // A group chat is often nothing but this, so dropping it would lose the lot.
    expect(composeImportantNotes('', ['Ankit owes me 4k'])).toBe(
      'From your notes:\n- Ankit owes me 4k',
    );
  });

  it('drops blank lines', () => {
    expect(composeImportantNotes('', ['  ', 'Real one', ''])).toBe('From your notes:\n- Real one');
  });

  it('returns an empty string when there was nothing on either side', () => {
    expect(composeImportantNotes('', [])).toBe('');
  });
});
