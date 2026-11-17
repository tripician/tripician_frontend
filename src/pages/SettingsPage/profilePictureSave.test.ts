import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards the profile and cover photo save (P0, 2026-11-17).
 *
 * Every avatar is stored under one fixed name, so its plain address never
 * changes and browsers kept showing the old picture: the settings page said
 * "Profile photo updated", then the old photo came back. The fix is to save the
 * address the upload answers with, which carries Cloudinary's version, and to
 * treat a failed save as a failed change rather than swallowing it.
 *
 * Source-scanned because the page needs a browser, a session and a store to render.
 */

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const source = fs.readFileSync(path.join(here, 'ProfileSettings.tsx'), 'utf-8');

describe('profile and cover photo save', () => {
  it('saves the versioned address the upload returns, never the fixed one', () => {
    expect(source).not.toMatch(/fileUrl/);
    expect(source).toMatch(/const \{ url \} = await uploadSignedPhoto\(/);
    expect(source).toMatch(/saveProfilePictureUrl\(authToken, url\)/);
    expect(source).toMatch(/saveCoverPictureUrl\(authToken, url\)/);
  });

  it('does not swallow a failed save', () => {
    expect(source).not.toMatch(/non-fatal/i);
    expect(source).toMatch(/could not be saved to your profile/);
  });

  it('crops every picked photo before anything is uploaded', () => {
    expect(source).toMatch(/onChange=\{pickPicture\('avatar'\)\}/);
    expect(source).toMatch(/onChange=\{pickPicture\('cover'\)\}/);
    expect(source).toMatch(/<ImageCropDialog/);
  });
});
