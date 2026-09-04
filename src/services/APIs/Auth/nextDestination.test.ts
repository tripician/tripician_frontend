import { describe, it, expect } from 'vitest';
import { safeNext, nextFrom, withNext } from './nextDestination';

/*
 * `next` comes off the query string, so it is attacker-controlled. An unchecked
 * one is an open redirect wearing our domain, which is exactly the shape phishing
 * wants. These tests pin the rejection rules.
 */
describe('safeNext', () => {
  it('accepts an absolute same-origin path', () => {
    expect(safeNext('/organizations')).toBe('/organizations');
    expect(safeNext('/organizations/abc?tab=people')).toBe('/organizations/abc?tab=people');
  });

  it('rejects a protocol-relative URL, which the browser reads as another host', () => {
    expect(safeNext('//evil.example')).toBeNull();
    expect(safeNext('//evil.example/path')).toBeNull();
  });

  it('rejects absolute URLs', () => {
    expect(safeNext('https://evil.example')).toBeNull();
    expect(safeNext('http://evil.example')).toBeNull();
  });

  it('rejects backslashes, which some browsers normalise to slashes', () => {
    expect(safeNext('/\\evil.example')).toBeNull();
    expect(safeNext('\\\\evil.example')).toBeNull();
  });

  it('rejects relative paths and empty values', () => {
    expect(safeNext('organizations')).toBeNull();
    expect(safeNext('')).toBeNull();
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
  });
});

describe('nextFrom', () => {
  it('reads a safe next off the query string', () => {
    expect(nextFrom('?next=%2Forganizations')).toBe('/organizations');
  });

  it('falls back to home when there is none, or it is unsafe', () => {
    expect(nextFrom('')).toBe('/home');
    expect(nextFrom('?next=https%3A%2F%2Fevil.example')).toBe('/home');
    expect(nextFrom('?next=%2F%2Fevil.example')).toBe('/home');
  });

  it('accepts URLSearchParams as well as a string', () => {
    expect(nextFrom(new URLSearchParams({ next: '/trips' }))).toBe('/trips');
  });
});

describe('withNext', () => {
  it('appends an encoded next', () => {
    expect(withNext('/signin', '/organizations?tab=people'))
      .toBe('/signin?next=%2Forganizations%3Ftab%3Dpeople');
  });

  it('leaves the path alone when there is nothing safe to carry', () => {
    expect(withNext('/signin', null)).toBe('/signin');
    expect(withNext('/signin', 'https://evil.example')).toBe('/signin');
  });
});
