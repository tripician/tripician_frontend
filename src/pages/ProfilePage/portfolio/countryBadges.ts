// Past-country badges on the web (owner, 2026-11-22: "we can do the verification from web end as well").
// The same requests the app sends (AddCountryBadgeScreen): two photos of you in a country, checked by
// a person in the admin portal, and deleted once checked.

import { apiClient } from '../../../services/APIs/apiServices';

export type CountryBadgeStatus = 'pending' | 'approved' | 'declined' | 'withdrawn' | 'removed';

/** A request as its traveller sees it (CountryBadgeRequestDto). */
export interface CountryBadgeRequest {
  id: string;
  countryCode: string;
  countryName: string;
  status: CountryBadgeStatus;
  createdAt: string;
  decidedAt?: string | null;
  declineReason?: string | null;
  note?: string | null;
  /** Only while the request waits: checked requests' photos are deleted. */
  photoUrls: string[];
}

export interface CountryBadgePhoto {
  url: string;
  publicId: string;
  /** When the original file says it was taken: a hint for the reviewer, never proof. */
  takenAt?: string;
}

export interface CountryBadgeSubmit {
  countryCode: string;
  countryName: string;
  photos: CountryBadgePhoto[];
  note?: string;
}

export const countryBadgeApi = {
  /** Your requests, newest first (withdrawn ones left out). */
  mine: () => apiClient.get<CountryBadgeRequest[]>('/api/profile/country-badges/requests'),
  submit: (input: CountryBadgeSubmit) => apiClient.post<CountryBadgeRequest>('/api/profile/country-badges/requests', input),
  withdraw: (id: string) => apiClient.delete(`/api/profile/country-badges/requests/${encodeURIComponent(id)}`),
};

/** Where each badge photo is signed: a fresh id in your own badges folder. */
export const BADGE_UPLOAD_SIGN_URL = '/api/uploads/get-badge-upload-url';

export const BADGE_PHOTO_SLOTS = 2;
export const BADGE_NOTE_MAX = 200;

/** Said wherever the photos are, so nobody sends them thinking they will be shown or kept. Same words as the app. */
export const VERIFICATION_ONLY_TEXT =
  "For verification only. Only our review team sees these photos, and we delete them as soon as they're checked.";

export const STATUS_TEXT: Record<CountryBadgeStatus, string> = {
  pending: 'Being checked',
  approved: 'Approved, on your stamps',
  declined: 'Not approved',
  withdrawn: 'Withdrawn',
  removed: 'Removed from your stamps',
};

/** How many photos a pick may bring: the empty slots. */
export function freeSlots<T>(slots: readonly (T | null)[]): number {
  return slots.filter((slot) => slot === null).length;
}

/**
 * The slots after a pick: `picked` in order, into the clicked slot first, then
 * any other empty one. A filled slot is never overwritten; extras are dropped.
 */
export function placePhotos<T>(slots: readonly (T | null)[], picked: readonly T[], clicked: number): (T | null)[] {
  const next = [...slots];
  const order = [clicked, ...next.map((_, i) => i).filter((i) => i !== clicked)];
  let taken = 0;
  for (const slot of order) {
    if (taken >= picked.length) break;
    if (slot >= 0 && slot < next.length && next[slot] === null) {
      next[slot] = picked[taken];
      taken += 1;
    }
  }
  return next;
}

/** The server's refusal, in its own words when it gave some. */
export function badgeErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { error?: { message?: unknown } } } })?.response?.data;
  const message = data?.error?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (err instanceof Error && err.name === 'UploadError' && err.message) return err.message;
  return fallback;
}
