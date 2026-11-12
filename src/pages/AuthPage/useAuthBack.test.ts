import { describe, expect, it } from 'vitest';
import { authBackTarget, authSwitchTarget } from './useAuthBack';

const fromApp = (search = '', state: unknown = null) => ({ key: 'k1', search, state });
const cold = (search = '', state: unknown = null) => ({ key: 'default', search, state });

describe('auth page Back', () => {
  it('steps back to the page the visitor came from, such as /stories', () => {
    expect(authBackTarget(fromApp('?next=%2Fstories'))).toEqual({ pop: true });
  });

  it('after a cold landing, goes where ?next= pointed rather than the landing page', () => {
    expect(authBackTarget(cold('?next=%2Ftrip%2Fabc'))).toEqual({ pop: false, to: '/trip/abc' });
  });

  it('falls back to the front page, and never follows an off-site next', () => {
    expect(authBackTarget(cold())).toEqual({ pop: false, to: '/' });
    expect(authBackTarget(cold('?next=%2F%2Fevil.example'))).toEqual({ pop: false, to: '/' });
  });

  it('remembers a cold landing across a hop between sign-in and sign-up', () => {
    const hop = authSwitchTarget('/signin', cold('?next=%2Fstories'));
    expect(hop.state).toEqual({ authCold: true });
    expect(authBackTarget({ key: 'k2', search: '?next=%2Fstories', state: hop.state }))
      .toEqual({ pop: false, to: '/stories' });
  });
});

describe('hopping between auth pages', () => {
  it('keeps ?next= so signing up still returns to the trip', () => {
    expect(authSwitchTarget('/signup', fromApp('?next=%2Ftrip%2Fabc')).to).toBe('/signup?next=%2Ftrip%2Fabc');
  });

  it('carries extra state such as the typed email', () => {
    expect(authSwitchTarget('/signin', fromApp(), { email: 'a@b.co' })).toEqual({ to: '/signin', state: { email: 'a@b.co' } });
  });
});
