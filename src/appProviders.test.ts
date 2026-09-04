import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards the provider tree in main.tsx.
 *
 * A MUI DatePicker throws on render if no LocalizationProvider sits above it,
 * and the throw is caught by the error boundary, so the symptom is the whole
 * screen replaced by "Something went wrong" rather than a broken field. Every
 * picker used to rely on its own local provider, which held only for as long as
 * pickers lived inside pages: the first dialog mounted from the app shell
 * rendered outside all of them and took the screen down.
 *
 * Source-scanned rather than rendered because main.tsx calls createRoot on
 * import, so it cannot be imported into a node test.
 */

const src = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const mainSource = fs.readFileSync(path.join(src, 'main.tsx'), 'utf-8');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('app provider tree', () => {
  it('mounts a LocalizationProvider above App', () => {
    expect(mainSource).toContain('LocalizationProvider');
    expect(mainSource).toContain('AdapterDayjs');

    // Above <App />, not merely present somewhere in the file.
    const provider = mainSource.indexOf('<LocalizationProvider');
    const app = mainSource.indexOf('<App />');
    expect(provider).toBeGreaterThan(-1);
    expect(app).toBeGreaterThan(provider);
  });

  it('keeps the date adapter next to the provider', () => {
    expect(mainSource).toMatch(/<LocalizationProvider[^>]*dateAdapter=\{AdapterDayjs\}/);
  });
});

describe('date pickers', () => {
  const pickerFiles = walk(src).filter((f) => {
    if (f.endsWith('main.tsx')) return false;
    return /\b(DatePicker|TimePicker|DateTimePicker)\b/.test(fs.readFileSync(f, 'utf-8'));
  });

  it('finds the picker consumers it is meant to guard', () => {
    // A sanity check on the scan itself: if this drops to zero the test below
    // would pass vacuously forever.
    expect(pickerFiles.length).toBeGreaterThan(0);
  });

  it.each(pickerFiles.map((f) => path.relative(src, f)))(
    'has a provider above it: %s',
    (relative) => {
      const source = fs.readFileSync(path.join(src, relative), 'utf-8');
      // Either the file wraps its own, or it inherits the root one. Since the
      // root provider is asserted above, inheriting is always valid; this exists
      // so the reason a file is safe stays visible.
      const wrapsItsOwn = source.includes('LocalizationProvider');
      const inheritsRoot = mainSource.includes('<LocalizationProvider');
      expect(wrapsItsOwn || inheritsRoot).toBe(true);
    },
  );
});
