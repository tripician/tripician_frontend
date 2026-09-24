import { describe, it, expect } from 'vitest';
import { groupIsFull, groupJoinState, groupDefaultTab, groupTabs, groupsForPlanning, inviteUrl, isPastTrip, joinRefusalPatch, splitGroupTrips } from './groupLogic';
import type { GroupTrip, Organization } from './types';

const NOW = Date.parse('2026-09-18T12:00:00Z');

const trip = (id: string, patch: Partial<GroupTrip> = {}): GroupTrip => ({
  tripId: id, name: `Trip ${id}`, coverUrl: null, countries: [], startDate: null, endDate: null, status: 0,
  published: false, joinPolicy: 'Closed', goingCount: 1, ownerUserId: 1, ownerName: null, viewerOnTrip: false, viewerCanEdit: false,
  ...patch,
});

describe('isPastTrip and splitGroupTrips', () => {
  it('treats a completed trip, or one whose last day has passed, as past', () => {
    expect(isPastTrip(trip('a', { status: 2 }), NOW)).toBe(true);
    expect(isPastTrip(trip('b', { endDate: '2026-09-10' }), NOW)).toBe(true);
    // Still on its last day.
    expect(isPastTrip(trip('c', { endDate: '2026-09-18' }), NOW)).toBe(false);
    expect(isPastTrip(trip('d'), NOW)).toBe(false);
  });

  it('orders plans soonest first with undated ones last, and past trips latest first', () => {
    const { plans, past } = splitGroupTrips([
      trip('undated'),
      trip('later', { startDate: '2026-12-01' }),
      trip('soon', { startDate: '2026-10-01' }),
      trip('old', { status: 2, endDate: '2025-01-10' }),
      trip('recent', { status: 2, endDate: '2026-08-01' }),
    ], NOW);
    expect(plans.map((t) => t.tripId)).toEqual(['soon', 'later', 'undated']);
    expect(past.map((t) => t.tripId)).toEqual(['recent', 'old']);
  });
});

describe('groupJoinState', () => {
  const base = { kind: 'community' as const, visibility: 'public' as const, viewerRole: null, viewerRequestStatus: null, memberCount: 4, memberLimit: 30 };

  it('lets anyone ask to join a public community group', () => {
    expect(groupJoinState(base)).toBe('request');
  });

  it('shows the viewer where they stand', () => {
    expect(groupJoinState({ ...base, viewerRole: 'member' })).toBe('member');
    expect(groupJoinState({ ...base, viewerRequestStatus: 'pending' })).toBe('pending');
    expect(groupJoinState({ ...base, viewerRequestStatus: 'declined' })).toBe('declined');
    // A cancelled request is not a standing one, so the viewer may ask again.
    expect(groupJoinState({ ...base, viewerRequestStatus: 'cancelled' })).toBe('request');
  });

  it('never offers a request for a private group or a business', () => {
    expect(groupJoinState({ ...base, visibility: 'private' })).toBe('invite_only');
    expect(groupJoinState({ ...base, kind: 'business' })).toBe('business');
  });

  it('stops new requests once a capped group is full, but keeps a standing one', () => {
    expect(groupJoinState({ ...base, memberCount: 30 })).toBe('full');
    expect(groupJoinState({ ...base, memberCount: 30, viewerRequestStatus: 'pending' })).toBe('pending');
    expect(groupJoinState({ ...base, memberCount: 30, viewerRole: 'member' })).toBe('member');
  });
});

describe('groupIsFull', () => {
  it('is full at the limit and never without one', () => {
    expect(groupIsFull(29, 30)).toBe(false);
    expect(groupIsFull(30, 30)).toBe(true);
    expect(groupIsFull(500, null)).toBe(false);
    // The API omits null, so no limit usually arrives as a missing field.
    expect(groupIsFull(500, undefined)).toBe(false);
  });
});

describe('groupsForPlanning', () => {
  const group = (patch: Partial<Organization>): Organization => ({ id: 'g', name: 'G', status: 'approved', myRole: 'member', ...patch } as Organization);

  it('trusts the server when it says who may plan', () => {
    expect(groupsForPlanning([group({ canCreatePlans: true }), group({ id: 'h', canCreatePlans: false })]).map((g) => g.id)).toEqual(['g']);
  });

  it('falls back to admins and managers of a live group for an older server', () => {
    const old = (patch: Partial<Organization>) => { const g = group(patch); delete (g as Partial<Organization>).canCreatePlans; return g; };
    expect(groupsForPlanning([old({ myRole: 'manager' }), old({ id: 'm' }), old({ id: 'p', myRole: 'admin', status: 'pending' })]).map((g) => g.id)).toEqual(['g']);
  });
});

describe('groupTabs', () => {
  it('opens a community group on its discussion, with announcements ahead of trips', () => {
    expect(groupTabs({ kind: 'community', myRole: 'admin' })).toEqual(['discussion', 'notices', 'trips', 'stories', 'members', 'settings']);
    expect(groupTabs({ kind: 'community', myRole: 'member' })).toEqual(['discussion', 'notices', 'trips', 'stories', 'members']);
    // A manager's role only means something to a business, but it must never unlock Settings.
    expect(groupTabs({ kind: 'community', myRole: 'manager' })).not.toContain('settings');
  });

  it('never gives a community group the operator tools', () => {
    const tabs = groupTabs({ kind: 'community', myRole: 'admin' });
    expect(tabs).not.toContain('manage');
    expect(tabs).not.toContain('posts');
  });

  it('keeps a business its operator tools and gives its staff the discussion they had no tab for', () => {
    expect(groupTabs({ kind: 'business', myRole: 'admin' })).toEqual(['discussion', 'notices', 'trips', 'stories', 'members', 'manage', 'posts', 'settings']);
    expect(groupTabs({ kind: 'business', myRole: 'manager' })).toEqual(['discussion', 'notices', 'trips', 'stories', 'members', 'manage', 'posts']);
    expect(groupTabs({ kind: 'business', myRole: 'member' })).toEqual(['discussion', 'notices', 'trips', 'stories', 'members', 'posts']);
  });

  it('lands on the first tab of whatever the list holds', () => {
    expect(groupDefaultTab({ kind: 'community', myRole: 'member' })).toBe('discussion');
    expect(groupDefaultTab({ kind: 'business', myRole: 'admin' })).toBe('discussion');
  });
});

describe('inviteUrl', () => {
  it('builds the join link from the origin and escapes the token', () => {
    expect(inviteUrl('https://tripician.com/', 'a+b')).toBe('https://tripician.com/join/group/a%2Bb');
  });
});

describe('joinRefusalPatch', () => {
  it('adopts a settled answer, so the button stops offering what the server just refused', () => {
    expect(joinRefusalPatch('pending')).toEqual({ viewerRequestStatus: 'pending' });
    expect(joinRefusalPatch('declined')).toEqual({ viewerRequestStatus: 'declined' });
    expect(joinRefusalPatch('member')).toEqual({ viewerRole: 'member' });
  });

  it('keeps a full group retryable, because somebody may leave', () => {
    expect(joinRefusalPatch('full')).toBeNull();
  });

  it('changes nothing on a refusal it does not recognise, including an older server that sends no status', () => {
    expect(joinRefusalPatch(undefined)).toBeNull();
    expect(joinRefusalPatch('')).toBeNull();
    expect(joinRefusalPatch('something-new')).toBeNull();
  });
});
