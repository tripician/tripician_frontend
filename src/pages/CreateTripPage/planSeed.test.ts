import { describe, it, expect } from 'vitest';
import { checklistToPackingCategories, composeImportantNotes } from './planSeed';

describe('checklistToPackingCategories', () => {
  it('groups items under the heading they came from', () => {
    const categories = checklistToPackingCategories([
      { category: 'Documents', name: 'Passport', qty: 1 },
      { category: 'Documents', name: 'Visa printout', qty: 2 },
      { category: 'Clothes', name: 'Rain jacket', qty: 1 },
    ]);

    expect(categories).toHaveLength(2);
    expect(categories[0].name).toBe('Documents');
    expect(categories[0].items.map((i) => i.name)).toEqual(['Passport', 'Visa printout']);
    expect(categories[1].items).toHaveLength(1);
  });

  it('starts everything unchecked', () => {
    const [category] = checklistToPackingCategories([
      { category: 'Bag', name: 'Charger', qty: 1 },
    ]);
    expect(category.items[0].checked).toBe(false);
  });

  it('keeps quantities but clamps nonsense', () => {
    const [category] = checklistToPackingCategories([
      { category: 'Bag', name: 'Socks', qty: 7 },
      { category: 'Bag', name: 'Shirts', qty: 0 },
      { category: 'Bag', name: 'Cables', qty: 5000 },
    ]);
    expect(category.items.map((i) => i.qty)).toEqual([7, 1, 99]);
  });

  it('drops duplicates within a category, case insensitively', () => {
    const [category] = checklistToPackingCategories([
      { category: 'Bag', name: 'Passport', qty: 1 },
      { category: 'Bag', name: 'passport', qty: 1 },
    ]);
    expect(category.items).toHaveLength(1);
  });

  it('falls back to a plain heading when the plan had none', () => {
    const [category] = checklistToPackingCategories([
      { category: '   ', name: 'Sunscreen', qty: 1 },
    ]);
    expect(category.name).toBe('Packing');
    expect(category.id).toBe('packing');
  });

  it('ignores nameless rows and empty categories', () => {
    expect(checklistToPackingCategories([
      { category: 'Bag', name: '  ', qty: 1 },
    ])).toEqual([]);
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
