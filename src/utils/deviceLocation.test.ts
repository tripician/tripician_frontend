import { describe, it, expect } from 'vitest';
import { placeNameFromGeocode } from './deviceLocation';

const comp = (long_name: string, ...types: string[]) => ({ long_name, types: [...types, 'political'] });

describe('placeNameFromGeocode', () => {
  it('gives city and country', () => {
    expect(placeNameFromGeocode([
      { address_components: [comp('Park Street', 'route'), comp('Kolkata', 'locality'), comp('West Bengal', 'administrative_area_level_1'), comp('India', 'country')] },
    ])).toBe('Kolkata, India');
  });

  it('finds the locality in a later result when the first has none', () => {
    expect(placeNameFromGeocode([
      { address_components: [comp('12', 'street_number'), comp('India', 'country')] },
      { address_components: [comp('Kolkata', 'locality'), comp('India', 'country')] },
    ])).toBe('Kolkata, India');
  });

  it('prefers a locality over a district, whichever result carries it', () => {
    expect(placeNameFromGeocode([
      { address_components: [comp('Kolkata District', 'administrative_area_level_2'), comp('India', 'country')] },
      { address_components: [comp('Kolkata', 'locality')] },
    ])).toBe('Kolkata, India');
  });

  it('falls back to the region where there is no locality', () => {
    expect(placeNameFromGeocode([
      { address_components: [comp('Ladakh', 'administrative_area_level_1'), comp('India', 'country')] },
    ])).toBe('Ladakh, India');
  });

  it('does not repeat a city-state', () => {
    expect(placeNameFromGeocode([
      { address_components: [comp('Singapore', 'locality'), comp('Singapore', 'country')] },
    ])).toBe('Singapore');
  });

  it('returns null when nothing usable came back', () => {
    expect(placeNameFromGeocode([])).toBeNull();
    expect(placeNameFromGeocode([{ address_components: [comp('Somewhere Rd', 'route')] }])).toBeNull();
  });
});
