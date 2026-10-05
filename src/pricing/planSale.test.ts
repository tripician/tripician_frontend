import { describe, it, expect } from 'vitest';
import { saleLabel, strikePrice } from './planSale';

describe('strikePrice', () => {
  it('strikes the MRP when a sale actually moved the price', () => {
    expect(strikePrice(199, 159)).toBe(199);
  });

  it('shows one number when nothing is running', () => {
    expect(strikePrice(149, 149)).toBeNull();
  });

  it('refuses an MRP below the payable price, which would advertise a saving that is not there', () => {
    expect(strikePrice(99, 149)).toBeNull();
  });

  it('shows one number on a server that sends no MRP', () => {
    expect(strikePrice(undefined, 149)).toBeNull();
    expect(strikePrice(null, 149)).toBeNull();
  });

  it('never strikes a free plan', () => {
    expect(strikePrice(199, 0)).toBeNull();
  });

  it('ignores a number that is not one', () => {
    expect(strikePrice(Number.NaN, 149)).toBeNull();
    expect(strikePrice(Number.POSITIVE_INFINITY, 149)).toBeNull();
  });
});

describe('saleLabel', () => {
  it('names the reason and works out the saving itself', () => {
    expect(saleLabel('Launch offer', 149, 74.5)).toBe('Launch offer, 50% off');
  });

  it('gives each period its own percentage, because a discount holds two prices', () => {
    // The owner wanted a round 500 a year against an MRP of 1,299, which is not
    // the same cut as 74.50 against 149. Both are true at once.
    expect(saleLabel('Launch offer', 149, 74.5)).toBe('Launch offer, 50% off');
    expect(saleLabel('Launch offer', 1299, 500)).toBe('Launch offer, 62% off');
  });

  it('falls back to the percentage when the name is just a number', () => {
    expect(saleLabel('99', 149, 1.49)).toBe('99% off');
    expect(saleLabel('  40  ', 149, 74.5)).toBe('50% off');
  });

  it('falls back to the percentage when there is no name at all', () => {
    expect(saleLabel(null, 149, 74.5)).toBe('50% off');
    expect(saleLabel('   ', 149, 74.5)).toBe('50% off');
  });

  it('says nothing when no sale is running', () => {
    expect(saleLabel('Launch offer', 149, 149)).toBeNull();
    expect(saleLabel('Launch offer', undefined, 149)).toBeNull();
    expect(saleLabel('Launch offer', 199, 0)).toBeNull();
  });
});
