import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards a footgun that broke photo upload on posts silently, for days.
 *
 * `e.target.files` is a LIVE FileList owned by the input element, not a
 * snapshot. Every picker here clears `e.target.value` afterwards so the same
 * file can be chosen twice in a row - and that reset empties the very list a
 * handler just captured. Bind it first and the length check that follows sees
 * zero, no upload starts, and nothing anywhere reports an error.
 *
 * Nothing catches this: it type-checks, it lints, and it fails only at runtime
 * in a way that looks like a dead button.
 *
 * The fix is always the same shape - materialise before you reset:
 *
 *     const files = Array.from(e.target.files ?? []);   // or files?.[0]
 *     e.target.value = '';
 */

const SRC = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC);

/**
 * A bare binding of the live list: `const files = e.target.files;`
 * Indexing (`e.target.files?.[0]`) yields a File, which is a value and safe.
 * `Array.from(...)` copies, which is the multi-file fix.
 */
const BARE_CAPTURE = /=\s*(?:e|event|ev)\.target\.files\s*;/;

describe('file input capture', () => {
  it('reads enough of the tree to be meaningful', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('never binds the live FileList straight to a variable', () => {
    const offenders: string[] = [];

    for (const file of files) {
      if (file.endsWith('fileInputCapture.guard.test.ts')) continue;
      const source = fs.readFileSync(file, 'utf-8');
      if (!source.includes('.target.files')) continue;

      source.split('\n').forEach((line, i) => {
        // Comments explaining the trap are not the trap.
        const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
        if (BARE_CAPTURE.test(code)) {
          offenders.push(`${path.relative(SRC, file)}:${i + 1}  ${line.trim()}`);
        }
      });
    }

    expect(
      offenders,
      'A live FileList was bound to a variable. Clearing e.target.value below '
      + 'will empty it, so the upload silently never starts. Copy it first:\n'
      + '  const files = Array.from(e.target.files ?? []);\n\n'
      + offenders.join('\n'),
    ).toEqual([]);
  });

  it('still finds the pickers it is meant to be guarding', () => {
    // If the handlers move or get renamed, this test must not quietly pass by
    // scanning nothing.
    const withPickers = files.filter((f) => fs.readFileSync(f, 'utf-8').includes('.target.files'));
    expect(withPickers.length).toBeGreaterThanOrEqual(4);
  });
});
