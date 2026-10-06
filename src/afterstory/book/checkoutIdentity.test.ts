import { describe, it, expect } from 'vitest';
import { checkoutIdentity, checkoutLogo, checkoutPhone } from './checkoutIdentity';

describe('checkoutPhone', () => {
  it('keeps a number that names its own country', () => {
    expect(checkoutPhone('+919812345678')).toBe('+919812345678');
    expect(checkoutPhone('+1 (646) 555-0199')).toBe('+16465550199');
    expect(checkoutPhone('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('reads the ways an Indian mobile gets typed', () => {
    expect(checkoutPhone('9812345678')).toBe('+919812345678');
    expect(checkoutPhone('98123 45678')).toBe('+919812345678');
    expect(checkoutPhone('09812345678')).toBe('+919812345678');
    expect(checkoutPhone('919812345678')).toBe('+919812345678');
  });

  it('passes nothing on rather than guess', () => {
    // Ten digits that cannot be an Indian mobile, so the country is unknown.
    expect(checkoutPhone('2025550123')).toBeUndefined();
    expect(checkoutPhone('12345')).toBeUndefined();
    expect(checkoutPhone('+12')).toBeUndefined();
    expect(checkoutPhone('call me')).toBeUndefined();
    expect(checkoutPhone('98123x5678')).toBeUndefined();
  });

  it('treats blank and the stored word NULL as no number', () => {
    expect(checkoutPhone(null)).toBeUndefined();
    expect(checkoutPhone(undefined)).toBeUndefined();
    expect(checkoutPhone('   ')).toBeUndefined();
    expect(checkoutPhone('NULL')).toBeUndefined();
    expect(checkoutPhone('null')).toBeUndefined();
  });
});

describe('checkoutIdentity', () => {
  it('opens the sheet as the signed-in buyer', () => {
    expect(checkoutIdentity({ name: 'Asha Rao', email: 'asha@example.com', phone: '9812345678' })).toEqual({
      prefill: { name: 'Asha Rao', email: 'asha@example.com', contact: '+919812345678' },
      readonly: { email: true },
    });
  });

  it('locks the email only when there is a real one to lock', () => {
    expect(checkoutIdentity({ name: 'Asha Rao', email: 'not-an-email' })).toEqual({ prefill: { name: 'Asha Rao' } });
    expect(checkoutIdentity({ email: '  asha@example.com  ' })).toEqual({
      prefill: { email: 'asha@example.com' },
      readonly: { email: true },
    });
  });

  it('leaves out a phone it cannot trust and keeps the rest', () => {
    expect(checkoutIdentity({ name: 'Asha Rao', email: 'asha@example.com', phone: 'NULL' })).toEqual({
      prefill: { name: 'Asha Rao', email: 'asha@example.com' },
      readonly: { email: true },
    });
  });

  it('never invents a buyer', () => {
    expect(checkoutIdentity(null)).toEqual({ prefill: {} });
    expect(checkoutIdentity(undefined)).toEqual({ prefill: {} });
    expect(checkoutIdentity({ name: 'NULL', email: 'NULL', phone: 'NULL' })).toEqual({ prefill: {} });
    expect(checkoutIdentity({ name: '', email: '', phone: '' })).toEqual({ prefill: {} });
  });
});

describe('checkoutLogo', () => {
  it('asks the image host for a small white-backed square', () => {
    expect(checkoutLogo('https://res.cloudinary.com/demo/image/upload/v1754681041/Mark.png')).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_pad,b_white,w_256,h_256,f_png/v1754681041/Mark.png',
    );
  });

  it('keeps any transformation already on the address', () => {
    expect(checkoutLogo('https://res.cloudinary.com/demo/image/upload/q_auto/v1/Mark.png')).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_pad,b_white,w_256,h_256,f_png/q_auto/v1/Mark.png',
    );
  });

  it('passes another https image through untouched', () => {
    expect(checkoutLogo('https://tripician.com/mark.png')).toBe('https://tripician.com/mark.png');
  });

  it('gives nothing when the address would not load inside the sheet', () => {
    expect(checkoutLogo(undefined)).toBeUndefined();
    expect(checkoutLogo('')).toBeUndefined();
    expect(checkoutLogo('/mark.png')).toBeUndefined();
    expect(checkoutLogo('http://tripician.com/mark.png')).toBeUndefined();
  });
});
