import { describe, it, expect } from 'vitest';
import { explainUploadFailure } from './uploadErrors';

/**
 * The behaviour under test is not "produces a message" but "produces a message
 * that distinguishes the cases", since the bug was one sentence for every cause.
 */

describe('explainUploadFailure', () => {
  it('names the size limit when Cloudinary rejects on size', () => {
    const said = explainUploadFailure('File size too large. Got 31457280. Maximum is 20971520.', true);
    expect(said).toContain('too large');
    expect(said).toContain('10MB');
  });

  it('lists the accepted formats when the type is rejected', () => {
    expect(explainUploadFailure('heic is not allowed', true)).toContain('JPG, PNG, WEBP, GIF or AVIF');
    expect(explainUploadFailure('Invalid image file', true)).toContain('JPG, PNG, WEBP, GIF or AVIF');
  });

  it('tells the author to retry when the signature has gone stale', () => {
    expect(explainUploadFailure('Invalid Signature abc123', true)).toContain('expired');
    expect(explainUploadFailure('Stale request - request timestamp is too far in the past', true)).toContain('expired');
  });

  it('reads "Invalid Signature" as a signature problem, not a format one', () => {
    // Both rules can match a string containing "Invalid"; order decides. If this
    // regresses the author is told to change their file when the real fix is to
    // press the button again.
    expect(explainUploadFailure('Invalid Signature abc123', true)).not.toContain('file type');
  });

  it('blames the connection, not the file, when the request never landed', () => {
    const said = explainUploadFailure(undefined, false);
    expect(said).toContain('connection');
    expect(said).not.toContain('different photo');
  });

  it('passes an unmapped Cloudinary message through verbatim', () => {
    const said = explainUploadFailure('Resource has been blocked by moderation', true);
    expect(said).toBe('Resource has been blocked by moderation.');
  });

  it('does not double up terminal punctuation on a passed-through message', () => {
    expect(explainUploadFailure('Something specific went wrong.', true)).toBe('Something specific went wrong.');
  });

  it('says the server refused without a reason rather than inventing one', () => {
    const said = explainUploadFailure(undefined, true);
    expect(said).toContain('without saying why');
  });
});
