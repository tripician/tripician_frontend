// The name a trip gets when nobody named it. The server requires a name, so this is what "no name" is stored as.
export const UNTITLED_TRIP_NAME = 'Untitled trip';

/** True for the placeholder name in any casing, including the older "Untitled Trip". */
export function isUntitledTripName(name: string | null | undefined): boolean {
  return (name ?? '').trim().toLowerCase() === UNTITLED_TRIP_NAME.toLowerCase();
}
