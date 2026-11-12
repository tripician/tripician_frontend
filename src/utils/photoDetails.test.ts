import { describe, expect, it } from 'vitest';
import {
  brandOf, cameraAndLens, describeSource, formatCamera, formatDpi, formatSize, formatTakenAt, hasPhotoData, imageDataRows,
  normaliseTakenAt,
  photoDetailsFromBytes, readPhotoDetails,
} from './photoDetails';

// ---- Builders for small, real-shaped files ---------------------------------

type Entry = { tag: number; type: 2 | 3 | 4 | 5; value: string | number };

/** A little-endian TIFF block: IFD0 entries, an EXIF IFD, and a GPS pointer that must never be followed. */
function tiff(ifd0: Entry[], exif: Entry[]): Uint8Array {
  const out: number[] = [];
  const u16 = (v: number) => out.push(v & 0xff, (v >> 8) & 0xff);
  const u32 = (v: number) => out.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff);
  const ifd0Entries = [...ifd0, { tag: 0x8769, type: 4 as const, value: 0 }, { tag: 0x8825, type: 4 as const, value: 0 }];
  const ifd0At = 8;
  const exifAt = ifd0At + 2 + ifd0Entries.length * 12 + 4;
  let dataAt = exifAt + 2 + exif.length * 12 + 4;
  const data: number[] = [];
  const place = (e: Entry): number => {
    if (e.type === 2) {
      const bytes = [...new TextEncoder().encode(String(e.value)), 0];
      const at = dataAt; data.push(...bytes); dataAt += bytes.length; return at;
    }
    const at = dataAt;
    const v = Number(e.value);
    data.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff, 1, 0, 0, 0);
    dataAt += 8; return at;
  };
  const write = (entries: Entry[]) => {
    u16(entries.length);
    for (const e of entries) {
      u16(e.tag); u16(e.type);
      if (e.type === 2) { const len = new TextEncoder().encode(String(e.value)).length + 1; u32(len); if (len <= 4) throw new Error('keep strings long'); u32(place(e)); }
      else if (e.type === 5) { u32(1); u32(place(e)); }
      else if (e.tag === 0x8769) { u32(1); u32(exifAt); }
      else if (e.type === 3) { u32(1); u16(Number(e.value)); u16(0); }
      else { u32(1); u32(Number(e.value)); }
    }
    u32(0);
  };
  out.push(0x49, 0x49); u16(42); u32(ifd0At);
  write(ifd0Entries);
  write(exif);
  return Uint8Array.from([...out, ...data]);
}

function jpeg(exif: Uint8Array, size?: { w: number; h: number }): ArrayBuffer {
  const header = [...'Exif\0\0'].map((c) => c.charCodeAt(0));
  const length = 2 + header.length + exif.length;
  const sof = size ? [0xff, 0xc0, 0, 17, 8, size.h >> 8, size.h & 0xff, size.w >> 8, size.w & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1] : [];
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...header, ...exif, ...sof, 0xff, 0xda, 0, 2]).buffer;
}

const be32 = (v: number) => [(v >>> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];

function png(chunks: Array<[string, number[]]>, size = { w: 1536, h: 1024 }): ArrayBuffer {
  const out = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const all: Array<[string, number[]]> = [['IHDR', [...be32(size.w), ...be32(size.h), 8, 2, 0, 0, 0]], ...chunks, ['IDAT', [0]], ['IEND', []]];
  for (const [type, data] of all) out.push(...be32(data.length), ...[...type].map((c) => c.charCodeAt(0)), ...data, 0, 0, 0, 0);
  return Uint8Array.from(out).buffer;
}

/** Just enough CBOR for a C2PA assertion: maps, arrays and text. */
function cbor(value: unknown): number[] {
  const head = (major: number, n: number) => (n < 24 ? [(major << 5) | n] : n < 256 ? [(major << 5) | 24, n] : [(major << 5) | 25, n >> 8, n & 0xff]);
  if (typeof value === 'string') { const b = [...new TextEncoder().encode(value)]; return [...head(3, b.length), ...b]; }
  if (Array.isArray(value)) return [...head(4, value.length), ...value.flatMap(cbor)];
  const entries = Object.entries(value as object);
  return [...head(5, entries.length), ...entries.flatMap(([k, v]) => [...cbor(k), ...cbor(v)])];
}

/** A JUMBF-shaped store: a labelled description, then the CBOR box, for each assertion. */
function c2paStore(boxes: Array<[string, unknown]>, claimRefs = true): number[] {
  const out: number[] = [];
  for (const [label, value] of boxes) {
    const jumd = [...new Array(17).fill(0), ...[...`${label}\0`].map((c) => c.charCodeAt(0))];
    out.push(...be32(8 + jumd.length), ...[...'jumd'].map((c) => c.charCodeAt(0)), ...jumd);
    const body = cbor(value);
    out.push(...be32(8 + body.length), ...[...'cbor'].map((c) => c.charCodeAt(0)), ...body);
  }
  // The claim refers back to the assertion by name; that reference is not the box.
  if (claimRefs) out.push(...cbor({ url: 'self#jumbf=c2pa.assertions/c2pa.actions.v2' }));
  return out;
}

// ---- Reading ----------------------------------------------------------------

describe('reading a photo\'s details', () => {
  const camera = jpeg(tiff(
    [
      { tag: 0x010f, type: 2, value: 'Apple' },
      { tag: 0x0110, type: 2, value: 'iPhone 15 Pro' },
      { tag: 0x011a, type: 5, value: 72 },
      { tag: 0x011b, type: 5, value: 72 },
      { tag: 0x0128, type: 3, value: 2 },
      { tag: 0x013b, type: 2, value: 'Rahul Singha' },
      { tag: 0x8298, type: 2, value: '(c) 2026 Rahul Singha' },
    ],
    [
      { tag: 0x9003, type: 2, value: '2026:10:12 17:42:05' },
      { tag: 0xa433, type: 2, value: 'Apple' },
      { tag: 0xa434, type: 2, value: 'iPhone 15 Pro back camera 6.765mm f/1.78' },
    ],
  ), { w: 4032, h: 3024 });

  it('reads who, when, on what, and how big from a camera JPEG, and never location', () => {
    expect(photoDetailsFromBytes(camera)).toEqual({
      width: 4032, height: 3024, takenAt: '2026-10-12T17:42:05', make: 'Apple', model: 'iPhone 15 Pro',
      author: 'Rahul Singha', copyright: '(c) 2026 Rahul Singha', dpiX: 72, dpiY: 72,
      lensMake: 'Apple', lensModel: 'iPhone 15 Pro back camera 6.765mm f/1.78',
    });
  });

  it('turns the size round for a photo its EXIF says to rotate', () => {
    const rotated = jpeg(tiff([{ tag: 0x0112, type: 3, value: 6 }, { tag: 0x013b, type: 2, value: 'Someone' }], []), { w: 4032, h: 3024 });
    expect(photoDetailsFromBytes(rotated)).toMatchObject({ width: 3024, height: 4032 });
  });

  it('reads an AI image\'s Content Credentials from a PNG, as ChatGPT writes them', () => {
    const store = c2paStore([
      ['c2pa.actions.v2', { actions: [{ action: 'c2pa.created', digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia', softwareAgent: { name: 'ChatGPT', version: 'gpt-image' } }, { action: 'c2pa.converted' }] }],
      ['c2pa.claim.v2', { claim_generator_info: { name: 'OpenAI Media Service API' } }],
    ]);
    expect(photoDetailsFromBytes(png([['caBX', store]]))).toEqual({
      width: 1536, height: 1024, digitalSourceType: 'trainedAlgorithmicMedia',
      createdWith: 'ChatGPT gpt-image', credentialsBy: 'OpenAI Media Service API',
    });
  });

  it('reads a PNG\'s text chunks and its pixels-per-metre', () => {
    const text = (k: string, v: string) => [...new TextEncoder().encode(k), 0, ...new TextEncoder().encode(v)];
    const ppm = Math.round(300 / 0.0254);
    expect(photoDetailsFromBytes(png([
      ['pHYs', [...be32(ppm), ...be32(ppm), 1]],
      ['tEXt', text('Author', 'Asha')],
      ['tEXt', text('Copyright', 'Asha 2026')],
    ]))).toEqual({ width: 1536, height: 1024, author: 'Asha', copyright: 'Asha 2026', dpiX: 300, dpiY: 300 });
  });

  it('reads the creator and rights from XMP when EXIF has none', () => {
    const xmp = '<x:xmpmeta><rdf:RDF><rdf:Description photoshop:DateCreated="2025-12-24T19:23:39+05:30"><dc:creator><rdf:Seq><rdf:li>Srideep Kar</rdf:li></rdf:Seq></dc:creator><dc:rights><rdf:Alt><rdf:li xml:lang="x-default">© Srideep</rdf:li></rdf:Alt></dc:rights></rdf:Description></rdf:RDF></x:xmpmeta>';
    const itxt = [...new TextEncoder().encode('XML:com.adobe.xmp'), 0, 0, 0, 0, 0, ...new TextEncoder().encode(xmp)];
    expect(photoDetailsFromBytes(png([['iTXt', itxt]]))).toMatchObject({ author: 'Srideep Kar', copyright: '© Srideep', takenAt: '2025-12-24T19:23:39' });
  });

  it('gives only the size for a picture that recorded nothing else, and nothing for non-pictures', () => {
    expect(photoDetailsFromBytes(png([]))).toEqual({ width: 1536, height: 1024 });
    expect(photoDetailsFromBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).buffer)).toBeUndefined();
  });

  it('survives a truncated or damaged header rather than failing the upload', async () => {
    const cut = camera.slice(0, 40);
    expect(() => photoDetailsFromBytes(cut)).not.toThrow();
    await expect(readPhotoDetails(new Blob([cut]))).resolves.toBeUndefined();
    const broken = png([['caBX', [0, 0, 0, 9, ...[...'c2pa.actions\0cbor'].map((c) => c.charCodeAt(0)), 0xbf]]]);
    expect(photoDetailsFromBytes(broken)).toEqual({ width: 1536, height: 1024 });
  });

  it('reads from a picked file', async () => {
    const details = await readPhotoDetails(new Blob([camera], { type: 'image/jpeg' }));
    expect(details?.model).toBe('iPhone 15 Pro');
  });
});

// ---- Showing ------------------------------------------------------------------

describe('showing them', () => {
  it('normalises a capture date and refuses a clock that did not know', () => {
    expect(normaliseTakenAt('2026:10:12 17:42:05')).toBe('2026-10-12T17:42:05');
    expect(normaliseTakenAt('2026-10-12T17:42:05.123+05:30')).toBe('2026-10-12T17:42:05');
    expect(normaliseTakenAt('0000:00:00 00:00:00')).toBeUndefined();
  });

  it('writes the capture time as the camera wrote it', () => {
    expect(formatTakenAt('2026-10-12T17:42:05')).toMatch(/2026/);
    expect(formatTakenAt(undefined)).toBeUndefined();
  });

  it('names the camera without saying its maker twice', () => {
    expect(formatCamera('Apple', 'iPhone 15 Pro')).toBe('Apple iPhone 15 Pro');
    expect(formatCamera('Canon', 'Canon EOS R5')).toBe('Canon EOS R5');
    expect(formatCamera(undefined, 'SM-S918B')).toBe('SM-S918B');
  });

  it('gives the size in pixels and megapixels, and the resolution once when both agree', () => {
    expect(formatSize(1536, 1024)?.replace(/\u00a0/g, ' ')).toBe('1536 × 1024 px · 1.6 MP');
    expect(formatSize(4032, 3024)?.replace(/\u00a0/g, ' ')).toBe('4032 × 3024 px · 12 MP');
    expect(formatDpi(350, 350)).toBe('350 dpi');
    expect(formatDpi(350, 300)).toBe('350 × 300 dpi');
  });

  it('says what Content Credentials mean in plain words', () => {
    expect(describeSource('trainedAlgorithmicMedia')).toEqual({ label: 'Made with AI', tone: 'ai' });
    expect(describeSource('digitalCapture')).toEqual({ label: 'Taken with a camera', tone: 'capture' });
    expect(describeSource(undefined)).toBeUndefined();
  });

  it('knows when a photo recorded nothing', () => {
    expect(hasPhotoData(null)).toBe(false);
    expect(hasPhotoData({})).toBe(false);
    expect(hasPhotoData({ width: 10, height: 10 })).toBe(true);
  });
});

describe('Camera & lens, one way for a phone and a camera', () => {
  it('splits a phone that wrote everything into its lens name', () => {
    expect(cameraAndLens({ lensMake: 'realme', lensModel: 'realme NARZO 80 Pro 5G  back camera 4.84mm f/1.8' }))
      .toEqual({ value: 'realme NARZO 80 Pro 5G', detail: 'Back camera · 4.84 mm · ƒ/1.8' });
    expect(cameraAndLens({ make: 'Apple', model: 'iPhone 15 Pro', lensMake: 'Apple', lensModel: 'iPhone 15 Pro back triple camera 6.765mm f/1.78' }))
      .toEqual({ value: 'Apple iPhone 15 Pro', detail: 'Back triple camera · 6.765 mm · ƒ/1.78' });
    expect(cameraAndLens({ lensMake: 'Google', lensModel: 'Pixel 8 front camera 2.74mm f/2.2' }))
      .toEqual({ value: 'Google Pixel 8', detail: 'Front camera · 2.74 mm · ƒ/2.2' });
  });

  it('puts a camera body first and its lens under it', () => {
    expect(cameraAndLens({ make: 'SONY', model: 'ILCE-7M4', lensMake: 'SIGMA', lensModel: '24-70mm F2.8 DG DN II | Art 024' }))
      .toEqual({ value: 'Sony ILCE-7M4', detail: 'SIGMA 24-70mm F2.8 DG DN II | Art 024' });
    expect(cameraAndLens({ make: 'NIKON CORPORATION', model: 'NIKON Z 6_2' })).toEqual({ value: 'Nikon Z 6_2', detail: undefined });
    expect(cameraAndLens({ make: 'samsung', model: 'SM-S918B' })).toEqual({ value: 'Samsung SM-S918B', detail: undefined });
  });

  it('gives a lens alone, or nothing', () => {
    expect(cameraAndLens({ lensModel: 'FE 24-70mm F2.8 GM II', lensMake: 'Sony' })).toEqual({ value: 'Sony FE 24-70mm F2.8 GM II' });
    expect(cameraAndLens({})).toEqual({ value: undefined });
  });

  it('writes makers as people do, and never twice', () => {
    expect(brandOf('NIKON CORPORATION')).toBe('Nikon');
    expect(brandOf('Unknown Labs')).toBe('Unknown Labs');
    expect(formatCamera('Canon', 'Canon EOS R5')).toBe('Canon EOS R5');
  });

  it('leads the rows with Camera & lens, as a wide row', () => {
    const rows = imageDataRows({ lensModel: 'Pixel 8 back camera 6.9mm f/1.68', lensMake: 'Google' });
    expect(rows[0]).toEqual({ label: 'Camera & lens', value: 'Google Pixel 8', detail: 'Back camera · 6.9 mm · ƒ/1.68', wide: true });
    expect(rows.map((r) => r.label)).toEqual(['Camera & lens', 'Author', 'Copyright', 'Date of capture', 'Dimensions', 'Resolution']);
    expect(imageDataRows({})[0]).toMatchObject({ value: 'Not available', missing: true });
  });
});
