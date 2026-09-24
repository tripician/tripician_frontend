import { describe, it, expect } from 'vitest';
import { serverMessage } from './apiError';

describe('serverMessage', () => {
  it('reads the message off a thrown axios error', () => {
    expect(serverMessage({ response: { status: 409, data: { message: ' This group is full right now. ' } } })).toBe('This group is full right now.');
  });

  it('reads the message off a plain response', () => {
    expect(serverMessage({ data: { message: 'That billing period is not available yet.' } })).toBe('That billing period is not available yet.');
  });

  it('gives nothing when there is no usable sentence', () => {
    expect(serverMessage(new Error('Network Error'))).toBeUndefined();
    expect(serverMessage({ response: { data: { message: '   ' } } })).toBeUndefined();
    expect(serverMessage({ response: { data: 'Bad Request' } })).toBeUndefined();
    expect(serverMessage(null)).toBeUndefined();
    expect(serverMessage(undefined)).toBeUndefined();
  });
});
