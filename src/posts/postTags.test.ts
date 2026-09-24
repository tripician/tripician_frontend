import { describe, it, expect } from 'vitest';
import { isPlaceTag, placeQuestionsHref, placeTag, tagLabel } from './postTags';

describe('place tags', () => {
  it('builds the tag the server stores, whatever the casing', () => {
    expect(placeTag(' Japan ')).toBe('place:japan');
    expect(isPlaceTag('place:japan')).toBe(true);
    expect(isPlaceTag('place:')).toBe(false);
    expect(tagLabel('place:japan')).toBe('Japan');
  });

  it('links a country to its filtered questions, escaped for the address bar', () => {
    expect(placeQuestionsHref('Japan')).toBe('/posts?kind=questions&tags=place%3Ajapan');
    expect(placeQuestionsHref('Sri Lanka')).toBe('/posts?kind=questions&tags=place%3Asri%20lanka');
  });
});
