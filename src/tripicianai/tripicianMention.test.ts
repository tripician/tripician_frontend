import { describe, expect, it } from 'vitest';

import { mentionsTripician } from './tripicianMention';

describe('mentionsTripician', () => {
  it.each([
    '@tripician plan day 2',
    'what do you think @Tripician?',
    'hey @tripician, any ideas',
    '(@tripician) add Rome',
    'ask @tripician.',
    '@TRIPICIAN',
    // The old handle keeps working.
    '@tripicianai plan day 2',
    'thoughts @TripicianAI?',
  ])('summons on %j', (text) => {
    expect(mentionsTripician(text)).toBe(true);
  });

  it.each([
    'email support@tripician.com about it',
    'no-reply@tripician.com',
    'see @tripician.com',
    '@tripicians are coming',
    '@tripicianair',
    'tripician plan day 2',
    'plain message',
  ])('stays quiet on %j', (text) => {
    expect(mentionsTripician(text)).toBe(false);
  });
});
