import { describe, it, expect } from 'vitest';
import { IconRoute, IconTrain } from '@tabler/icons-react';
import { TRANSPORT_MODES, transportIcon, transportLabel, transportMode } from './transportModes';

describe('transportMode', () => {
  it('takes the ids the router already understands', () => {
    // directionsService.profileFor switches on exactly these strings.
    expect(TRANSPORT_MODES.map((m) => m.id)).toEqual(['flight', 'train', 'bus', 'car', 'ferry', 'bike', 'walk']);
    expect(transportMode('train')?.label).toBe('Train');
  });

  it('reads the free text older plans stored', () => {
    expect(transportMode('By road')?.id).toBe('car');
    expect(transportMode('Overnight Rail')?.id).toBe('train');
    expect(transportMode('flying')?.id).toBe('flight');
    expect(transportMode('boat')?.id).toBe('ferry');
  });

  it('says nothing rather than guessing', () => {
    expect(transportMode('')).toBeNull();
    expect(transportMode(null)).toBeNull();
    expect(transportMode('teleport')).toBeNull();
  });
});

describe('transportIcon and transportLabel', () => {
  it('falls back to a plain route icon and the stored words', () => {
    expect(transportIcon('rail')).toBe(IconTrain);
    expect(transportIcon('teleport')).toBe(IconRoute);
    expect(transportLabel('teleport')).toBe('Teleport');
    expect(transportLabel('  ')).toBe('');
  });
});
