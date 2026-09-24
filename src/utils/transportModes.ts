import type React from 'react';
import { IconBike, IconBus, IconCar, IconPlane, IconRoute, IconSailboat, IconTrain, IconWalk } from '@tabler/icons-react';

export interface TransportMode {
  /** Stored on the stop and read by `directionsService.profileFor`, so these ids are a contract with the map. */
  id: string;
  label: string;
  Icon: React.ElementType;
}

export const TRANSPORT_MODES: TransportMode[] = [
  { id: 'flight', label: 'Flight', Icon: IconPlane },
  { id: 'train', label: 'Train', Icon: IconTrain },
  { id: 'bus', label: 'Bus', Icon: IconBus },
  { id: 'car', label: 'Car', Icon: IconCar },
  { id: 'ferry', label: 'Ferry', Icon: IconSailboat },
  { id: 'bike', label: 'Bike', Icon: IconBike },
  { id: 'walk', label: 'Walk', Icon: IconWalk },
];

// Car last: "railcar" and "car ferry" belong to the mode named first.
const PATTERNS: Array<[RegExp, string]> = [
  [/plane|flight|fly|air/, 'flight'],
  [/train|rail/, 'train'],
  [/bus|coach/, 'bus'],
  [/ferry|boat|cruise|ship|sail/, 'ferry'],
  [/bike|cycl/, 'bike'],
  [/walk|hike|trek|foot/, 'walk'],
  [/car|driv|taxi|cab|road/, 'car'],
];

/** Plans made before the picker existed hold free text ("By road", "Car"), so a stored value is matched loosely. */
export function transportMode(stored: string | null | undefined): TransportMode | null {
  const value = (stored ?? '').trim().toLowerCase();
  if (!value) return null;

  const exact = TRANSPORT_MODES.find((m) => m.id === value);
  if (exact) return exact;

  const hit = PATTERNS.find(([pattern]) => pattern.test(value));
  return hit ? TRANSPORT_MODES.find((m) => m.id === hit[1]) ?? null : null;
}

/** A generic route icon rather than nothing, so an unrecognised mode still reads as a journey. */
export function transportIcon(stored: string | null | undefined): React.ElementType {
  return transportMode(stored)?.Icon ?? IconRoute;
}

/** A known mode's own label, or whatever was stored, tidied. Never invents a mode. */
export function transportLabel(stored: string | null | undefined): string {
  const known = transportMode(stored);
  if (known) return known.label;

  const raw = (stored ?? '').trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
}
