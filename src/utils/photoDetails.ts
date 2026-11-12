/**
 * What a photo on a post says about itself, so a reader can judge how original
 * it is: who made it and who holds the rights, when it was taken and on what,
 * its size and print resolution, and what its Content Credentials (C2PA) say
 * made it, such as a camera or an AI image generator.
 *
 * Read in the browser from the original file before it is uploaded, because the
 * upload strips every tag (PhotoMetadataStripper on the server). It is the
 * file's own claim: nothing here is verified, and a Content Credentials
 * signature is not checked. Never location: no GPS tag is read, in any format.
 * Every field is optional; a screenshot or a downloaded picture has few of them.
 * The server keeps the same set (PhotoDetailsDto) and drops anything else.
 */
export interface PhotoDetails {
  /** The original's size in pixels, as it displays (EXIF rotation applied). */
  width?: number;
  height?: number;
  /** When it was taken, by the camera's own clock: "2026-10-12T17:42:05", no zone. */
  takenAt?: string;
  /** The camera. */
  make?: string;
  model?: string;
  author?: string;
  copyright?: string;
  /** The file's own print resolution in dots per inch, horizontal and vertical. */
  dpiX?: number;
  dpiY?: number;
  lensMake?: string;
  lensModel?: string;
  /** From Content Credentials: the IPTC digital source type, "trainedAlgorithmicMedia" for made by AI. */
  digitalSourceType?: string;
  /** From Content Credentials: the tool that made it, "ChatGPT gpt-image". */
  createdWith?: string;
  /** From Content Credentials: who issued them, "OpenAI Media Service API". */
  credentialsBy?: string;
}

/** Same cap as the server (PhotoDetails.MaxText). */
const MAX_TEXT = 80;

/** Far enough in for every format's header blocks; the pixels come after them. */
const HEAD_BYTES = 1024 * 1024;

function cleanText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, MAX_TEXT) : undefined;
}

/**
 * A resolution in dots per inch. The unit says inches (2, also the default) or
 * centimetres (3); 1 means the figure has no unit, so it is no resolution.
 */
function dpiOf(value: number | undefined, unit: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value <= 0 || unit === 1) return undefined;
  const dpi = Math.round(unit === 3 ? value * 2.54 : value);
  return dpi >= 1 && dpi <= 10_000 ? dpi : undefined;
}

/** "2026:10:12 17:42:05" (EXIF) or "2026-10-12T17:42:05+05:30" (XMP) as "2026-10-12T17:42:05". */
export function normaliseTakenAt(value: string | undefined): string | undefined {
  const m = value && /^(\d{4})[:-](\d{2})[:-](\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value.trim());
  if (!m) return undefined;
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = m;
  const year = Number(y);
  // "0000:00:00 00:00:00" is how a camera without a clock says it does not know.
  if (year < 1826 || year > 2200 || Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return undefined;
  if (Number(h) > 23 || Number(mi) > 59 || Number(s) > 59) return undefined;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

const utf8 = new TextDecoder('utf-8');
const utf16 = new TextDecoder('utf-16le');

const ascii = (view: DataView, at: number, length: number) => {
  let out = '';
  for (let i = 0; i < length && at + i < view.byteLength; i++) out += String.fromCharCode(view.getUint8(at + i));
  return out;
};

const bytesOf = (view: DataView, at: number, length: number) =>
  new Uint8Array(view.buffer, view.byteOffset + at, Math.max(0, Math.min(length, view.byteLength - at)));

/** Where a byte pattern last (or first) occurs. */
function indexOf(haystack: Uint8Array, needle: string, from = 0, last = false): number {
  const n = [...needle].map((c) => c.charCodeAt(0));
  let found = -1;
  outer: for (let i = from; i <= haystack.length - n.length; i++) {
    for (let j = 0; j < n.length; j++) if (haystack[i + j] !== n[j]) continue outer;
    if (!last) return i;
    found = i;
  }
  return found;
}

// ---------------------------------------------------------------------------
// TIFF (the body of every EXIF block). Only the tags named here are read: the
// GPS pointer (0x8825) is never followed.

const TAG = {
  make: 0x010f, model: 0x0110, orientation: 0x0112, xRes: 0x011a, yRes: 0x011b, unit: 0x0128,
  artist: 0x013b, copyright: 0x8298, exifIfd: 0x8769, xpAuthor: 0x9c9d,
  dateOriginal: 0x9003, dateDigitized: 0x9004, pixelX: 0xa002, pixelY: 0xa003,
  lensMake: 0xa433, lensModel: 0xa434,
} as const;

interface Found {
  width?: number;
  height?: number;
  orientation?: number;
  xRes?: number;
  yRes?: number;
  unit?: number;
  make?: string;
  model?: string;
  author?: string;
  copyright?: string;
  takenAt?: string;
  lensMake?: string;
  lensModel?: string;
  digitalSourceType?: string;
  createdWith?: string;
  credentialsBy?: string;
}

function readTiff(view: DataView, start: number, into: Found): void {
  if (start + 8 > view.byteLength) return;
  const order = view.getUint16(start);
  const little = order === 0x4949;
  if (!little && order !== 0x4d4d) return;
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  if (u16(start + 2) !== 42) return;
  const inBounds = (at: number, length: number) => at >= start && at + length <= view.byteLength;

  const valueOf = (entry: number): number | string | Uint8Array | undefined => {
    const type = u16(entry + 2);
    const count = u32(entry + 4);
    const size = type === 1 || type === 2 || type === 7 ? 1 : type === 3 ? 2 : type === 4 ? 4 : type === 5 ? 8 : 0;
    if (!size || count === 0 || count > 65_536) return undefined;
    const length = size * count;
    const at = length <= 4 ? entry + 8 : start + u32(entry + 8);
    if (!inBounds(at, length)) return undefined;
    if (type === 2) {
      // Copyright can hold "photographer\0editor"; both parts are the rights.
      return utf8.decode(bytesOf(view, at, length)).split('\0').map((s) => s.trim()).filter(Boolean).join('; ');
    }
    if (type === 1 || type === 7) return bytesOf(view, at, length);
    if (type === 3) return u16(at);
    if (type === 4) return u32(at);
    const denominator = u32(at + 4);
    return denominator ? u32(at) / denominator : undefined;
  };

  const walk = (ifd: number, visit: (tag: number, entry: number) => void) => {
    if (!inBounds(ifd, 2)) return;
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
      const entry = ifd + 2 + i * 12;
      if (!inBounds(entry, 12)) return;
      visit(u16(entry), entry);
    }
  };
  const text = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

  let exifIfd: number | undefined;
  walk(start + u32(start + 4), (tag, entry) => {
    const v = valueOf(entry);
    switch (tag) {
      case TAG.make: into.make ??= text(v); break;
      case TAG.model: into.model ??= text(v); break;
      case TAG.orientation: into.orientation ??= num(v); break;
      case TAG.xRes: into.xRes ??= num(v); break;
      case TAG.yRes: into.yRes ??= num(v); break;
      case TAG.unit: into.unit ??= num(v); break;
      case TAG.artist: into.author ??= text(v); break;
      case TAG.copyright: into.copyright ??= text(v); break;
      // What Windows writes when you fill in "Authors" in a file's properties.
      case TAG.xpAuthor: if (v instanceof Uint8Array) into.author ??= utf16.decode(v).replace(/\0+$/, ''); break;
      case TAG.exifIfd: if (typeof v === 'number') exifIfd = start + v; break;
      default: break;
    }
  });
  if (exifIfd === undefined) return;
  let digitized: string | undefined;
  let pixelX: number | undefined;
  let pixelY: number | undefined;
  walk(exifIfd, (tag, entry) => {
    const v = valueOf(entry);
    switch (tag) {
      case TAG.dateOriginal: into.takenAt ??= normaliseTakenAt(text(v)); break;
      case TAG.dateDigitized: digitized = normaliseTakenAt(text(v)); break;
      case TAG.pixelX: pixelX = num(v); break;
      case TAG.pixelY: pixelY = num(v); break;
      case TAG.lensMake: into.lensMake ??= text(v); break;
      case TAG.lensModel: into.lensModel ??= text(v); break;
      default: break;
    }
  });
  into.takenAt ??= digitized;
  if (into.width === undefined && pixelX && pixelY) {
    into.width = pixelX;
    into.height = pixelY;
  }
}

// ---------------------------------------------------------------------------
// XMP: Adobe's exports and many editors keep the creator, rights and dates here.

function readXmp(xml: string, into: Found): void {
  const first = (name: string) => {
    // <dc:creator><rdf:Seq><rdf:li>Name</rdf:li>...  or  <photoshop:DateCreated>...</photoshop:DateCreated>
    const element = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml);
    if (element) {
      const li = /<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/.exec(element[1]);
      const value = (li ? li[1] : element[1]).replace(/<[^>]+>/g, '').trim();
      if (value) return decodeEntities(value);
    }
    const attribute = new RegExp(`${name}="([^"]*)"`).exec(xml);
    return attribute?.[1] ? decodeEntities(attribute[1]) : undefined;
  };
  into.author ??= first('dc:creator');
  into.copyright ??= first('dc:rights');
  into.takenAt ??= normaliseTakenAt(first('exif:DateTimeOriginal') ?? first('photoshop:DateCreated'));
  into.make ??= first('tiff:Make');
  into.model ??= first('tiff:Model');
  into.lensModel ??= first('exifEX:LensModel') ?? first('aux:Lens');
}

function decodeEntities(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');
}

// ---------------------------------------------------------------------------
// Content Credentials (C2PA). The manifest store is a JUMBF box holding CBOR.
// Only two things are taken from the active (last) manifest: what its actions
// say made the image, and who issued the claim. The signature is not checked.

type Cbor = number | string | boolean | null | undefined | Uint8Array | Cbor[] | { [key: string]: Cbor };

function decodeCbor(bytes: Uint8Array): Cbor {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 0;
  const need = (n: number) => { if (at + n > bytes.length) throw new Error('short'); };
  const length = (info: number): number => {
    if (info < 24) return info;
    if (info === 24) { need(1); return bytes[at++]; }
    if (info === 25) { need(2); const v = view.getUint16(at); at += 2; return v; }
    if (info === 26) { need(4); const v = view.getUint32(at); at += 4; return v; }
    if (info === 27) { need(8); const v = Number(view.getBigUint64(at)); at += 8; return v; }
    throw new Error('length');
  };
  const item = (depth: number): Cbor => {
    if (depth > 24) throw new Error('deep');
    need(1);
    const head = bytes[at++];
    const major = head >> 5;
    const info = head & 31;
    if (major === 7) {
      if (info === 20) return false;
      if (info === 21) return true;
      if (info === 22) return null;
      if (info === 23) return undefined;
      if (info === 25) { need(2); at += 2; return 0; }
      if (info === 26) { need(4); const v = view.getFloat32(at); at += 4; return v; }
      if (info === 27) { need(8); const v = view.getFloat64(at); at += 8; return v; }
      return undefined;
    }
    const indefinite = info === 31 && major >= 2 && major <= 5;
    const n = indefinite ? -1 : length(info);
    switch (major) {
      case 0: return n;
      case 1: return -1 - n;
      case 2:
      case 3: {
        if (indefinite) {
          const parts: Uint8Array[] = [];
          while (bytes[at] !== 0xff) { const p = item(depth + 1); if (p instanceof Uint8Array) parts.push(p); else if (typeof p === 'string') parts.push(new TextEncoder().encode(p)); }
          at++;
          const joined = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
          let o = 0; for (const p of parts) { joined.set(p, o); o += p.length; }
          return major === 3 ? utf8.decode(joined) : joined;
        }
        need(n);
        const slice = bytes.subarray(at, at + n);
        at += n;
        return major === 3 ? utf8.decode(slice) : slice;
      }
      case 4: {
        const out: Cbor[] = [];
        if (indefinite) { while (bytes[at] !== 0xff) out.push(item(depth + 1)); at++; } else for (let i = 0; i < n; i++) out.push(item(depth + 1));
        return out;
      }
      case 5: {
        const out: { [key: string]: Cbor } = {};
        const one = () => { const k = item(depth + 1); out[String(k)] = item(depth + 1); };
        if (indefinite) { while (bytes[at] !== 0xff) one(); at++; } else for (let i = 0; i < n; i++) one();
        return out;
      }
      case 6: return item(depth + 1);
      default: return undefined;
    }
  };
  return item(0);
}

/**
 * The CBOR content of the last JUMBF box labelled `label` (or a versioned
 * "label.v2"). Matched with the label's NUL terminator, as a box description
 * writes it: the claim also names each assertion in a reference
 * ("self#jumbf=c2pa.assertions/c2pa.actions.v2"), and that is not the box.
 */
function cborAfterLabel(store: Uint8Array, label: string): Cbor {
  const at = Math.max(...['', '.v2', '.v3'].map((v) => indexOf(store, `${label}${v}\0`, 0, true)));
  if (at < 0) return undefined;
  const box = indexOf(store, 'cbor', at);
  if (box < 4) return undefined;
  const size = new DataView(store.buffer, store.byteOffset + box - 4, 4).getUint32(0);
  if (size < 8 || box - 4 + size > store.length) return undefined;
  try {
    return decodeCbor(store.subarray(box + 4, box - 4 + size));
  } catch {
    return undefined;
  }
}

const isMap = (v: Cbor): v is { [key: string]: Cbor } => typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Uint8Array);
const str = (v: Cbor) => (typeof v === 'string' ? v : undefined);

function readC2pa(store: Uint8Array, into: Found): void {
  const actions = cborAfterLabel(store, 'c2pa.actions');
  const list = isMap(actions) && Array.isArray(actions.actions) ? actions.actions.filter(isMap) : [];
  const made = list.find((a) => a.action === 'c2pa.created') ?? list.find((a) => str(a.digitalSourceType));
  const source = made && str(made.digitalSourceType);
  if (source) into.digitalSourceType ??= source.split('/').pop();
  const agent = made?.softwareAgent;
  const tool = isMap(agent) ? [str(agent.name), str(agent.version)].filter(Boolean).join(' ') : str(agent);
  if (tool) into.createdWith ??= tool;

  const claim = cborAfterLabel(store, 'c2pa.claim');
  if (isMap(claim)) {
    const info = claim.claim_generator_info;
    const generator = Array.isArray(info) ? info.find(isMap) : isMap(info) ? info : undefined;
    // v1 claims name it as "Product/1.0 lib/2.0"; the product is the first part.
    const name = str(generator?.name) ?? str(claim.claim_generator)?.split(/[\s/]/)[0];
    if (name) into.credentialsBy ??= name;
  }
}

// ---------------------------------------------------------------------------
// Containers.

function readJpeg(view: DataView, into: Found): void {
  let jfif: { x?: number; y?: number } | undefined;
  const c2pa: Uint8Array[] = [];
  let at = 2;
  while (at + 4 <= view.byteLength && view.getUint8(at) === 0xff) {
    const marker = view.getUint8(at + 1);
    // Start of scan: the pixels. Every header block comes before it.
    if (marker === 0xda || marker === 0xd9) break;
    const length = view.getUint16(at + 2);
    const body = at + 4;
    if (marker === 0xe1 && ascii(view, body, 6) === 'Exif\0\0') {
      readTiff(view, body + 6, into);
    } else if (marker === 0xe1 && ascii(view, body, 29) === 'http://ns.adobe.com/xap/1.0/\0') {
      readXmp(utf8.decode(bytesOf(view, body + 29, length - 31)), into);
    } else if (marker === 0xe0 && ascii(view, body, 5) === 'JFIF\0' && body + 12 <= view.byteLength) {
      // JFIF's density: 1 is dots per inch, 2 dots per centimetre, 0 no unit at all.
      const unit = view.getUint8(body + 7);
      const toDpi = (v: number) => dpiOf(v, unit === 1 ? 2 : unit === 2 ? 3 : 1);
      jfif = { x: toDpi(view.getUint16(body + 8)), y: toDpi(view.getUint16(body + 10)) };
    } else if (marker === 0xeb && ascii(view, body, 2) === 'JP') {
      // APP11 JPEG-XT packets carry the C2PA store, 8 bytes of packet header each.
      c2pa.push(bytesOf(view, body + 8, length - 10));
    } else if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc && body + 5 <= view.byteLength) {
      into.height ??= view.getUint16(body + 1);
      into.width ??= view.getUint16(body + 3);
    }
    at = body + length - 2;
  }
  // Rotated 90° by its EXIF orientation (5 to 8): shown the other way round.
  if (into.orientation && into.orientation >= 5 && into.orientation <= 8 && into.width && into.height) {
    [into.width, into.height] = [into.height, into.width];
  }
  if (jfif && into.xRes === undefined) {
    into.xRes = jfif.x;
    into.yRes = jfif.y;
    into.unit = 2;
  }
  if (c2pa.length) readC2pa(concat(c2pa), into);
}

function readPng(view: DataView, into: Found): void {
  let at = 8;
  while (at + 8 <= view.byteLength) {
    const length = view.getUint32(at);
    const type = ascii(view, at + 4, 4);
    const body = at + 8;
    if (type === 'IEND' || type === 'IDAT') break;
    if (type === 'IHDR' && body + 8 <= view.byteLength) {
      into.width = view.getUint32(body);
      into.height = view.getUint32(body + 4);
    } else if (type === 'pHYs' && body + 9 <= view.byteLength && view.getUint8(body + 8) === 1) {
      // Pixels per metre.
      into.xRes = view.getUint32(body) * 0.0254;
      into.yRes = view.getUint32(body + 4) * 0.0254;
      into.unit = 2;
    } else if (type === 'eXIf') {
      readTiff(view, body, into);
    } else if (type === 'caBX') {
      readC2pa(bytesOf(view, body, length), into);
    } else if (type === 'tEXt' || type === 'iTXt') {
      const data = bytesOf(view, body, length);
      const nul = data.indexOf(0);
      if (nul > 0) {
        const keyword = utf8.decode(data.subarray(0, nul));
        let text: string;
        if (type === 'tEXt') {
          text = new TextDecoder('latin1').decode(data.subarray(nul + 1));
        } else {
          // iTXt: compression flag and method, then language and translated keyword, each NUL-ended.
          if (data[nul + 1] !== 0) { at = body + length + 4; continue; }
          let p = nul + 3;
          p = data.indexOf(0, p) + 1;
          p = data.indexOf(0, p) + 1;
          text = p > 0 ? utf8.decode(data.subarray(p)) : '';
        }
        if (keyword === 'XML:com.adobe.xmp') readXmp(text, into);
        else if (keyword === 'Author') into.author ??= text;
        else if (keyword === 'Copyright') into.copyright ??= text;
        else if (keyword === 'Creation Time') into.takenAt ??= normaliseTakenAt(text) ?? isoFrom(text);
      }
    }
    at = body + length + 4;
  }
}

function readWebp(view: DataView, into: Found): void {
  let at = 12;
  while (at + 8 <= view.byteLength) {
    const type = ascii(view, at, 4);
    const length = view.getUint32(at + 4, true);
    const body = at + 8;
    if (type === 'VP8X' && body + 10 <= view.byteLength) {
      into.width = 1 + (view.getUint8(body + 4) | (view.getUint8(body + 5) << 8) | (view.getUint8(body + 6) << 16));
      into.height = 1 + (view.getUint8(body + 7) | (view.getUint8(body + 8) << 8) | (view.getUint8(body + 9) << 16));
    } else if (type === 'VP8 ' && body + 10 <= view.byteLength) {
      into.width ??= view.getUint16(body + 6, true) & 0x3fff;
      into.height ??= view.getUint16(body + 8, true) & 0x3fff;
    } else if (type === 'VP8L' && body + 5 <= view.byteLength) {
      const bits = view.getUint32(body + 1, true);
      into.width ??= (bits & 0x3fff) + 1;
      into.height ??= ((bits >> 14) & 0x3fff) + 1;
    } else if (type === 'EXIF') {
      // Some writers keep JPEG's "Exif\0\0" prefix inside the chunk.
      readTiff(view, ascii(view, body, 6) === 'Exif\0\0' ? body + 6 : body, into);
    } else if (type === 'XMP ') {
      readXmp(utf8.decode(bytesOf(view, body, length)), into);
    } else if (type === 'C2PA') {
      readC2pa(bytesOf(view, body, length), into);
    }
    at = body + length + (length % 2);
  }
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** A free-text date such as PNG's "Creation Time" ("Tue, 10 Nov 2026 18:03:06 GMT"), as the clock time it names. */
function isoFrom(text: string): string | undefined {
  const t = Date.parse(text);
  if (Number.isNaN(t)) return undefined;
  return new Date(t).toISOString().slice(0, 19);
}

/** The details to send with a photo, from the bytes of the original. */
export function photoDetailsFromBytes(buffer: ArrayBuffer): PhotoDetails | undefined {
  const view = new DataView(buffer);
  const found: Found = {};
  try {
    if (view.byteLength >= 4 && view.getUint16(0) === 0xffd8) readJpeg(view, found);
    else if (view.byteLength >= 8 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) readPng(view, found);
    else if (view.byteLength >= 12 && ascii(view, 0, 4) === 'RIFF' && ascii(view, 8, 4) === 'WEBP') readWebp(view, found);
    else return undefined;
  } catch {
    // A damaged header means fewer details, never a failed upload.
  }
  const size = found.width && found.height && found.width <= 100_000 && found.height <= 100_000;
  const details: PhotoDetails = {
    width: size ? found.width : undefined,
    height: size ? found.height : undefined,
    takenAt: found.takenAt,
    make: cleanText(found.make),
    model: cleanText(found.model),
    author: cleanText(found.author),
    copyright: cleanText(found.copyright),
    dpiX: dpiOf(found.xRes, found.unit),
    dpiY: dpiOf(found.yRes, found.unit),
    lensMake: cleanText(found.lensMake),
    lensModel: cleanText(found.lensModel),
    digitalSourceType: found.digitalSourceType && /^[A-Za-z]{3,60}$/.test(found.digitalSourceType) ? found.digitalSourceType : undefined,
    createdWith: cleanText(found.createdWith),
    credentialsBy: cleanText(found.credentialsBy),
  };
  const kept = Object.fromEntries(Object.entries(details).filter(([, v]) => v !== undefined)) as PhotoDetails;
  return Object.keys(kept).length ? kept : undefined;
}

/**
 * Reads a picked photo's details before it is uploaded. Never throws: a photo
 * that cannot be read simply has no details.
 */
export async function readPhotoDetails(file: Blob): Promise<PhotoDetails | undefined> {
  try {
    return photoDetailsFromBytes(await file.slice(0, HEAD_BYTES).arrayBuffer());
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Showing them.

/** "350 dpi", or "350 × 300 dpi" when the two directions differ. */
export function formatDpi(x?: number, y?: number): string | undefined {
  if (x && y && x !== y) return `${x} × ${y} dpi`;
  const one = x ?? y;
  return one ? `${one} dpi` : undefined;
}

/** "4032 × 3024 px · 12.2 MP". */
export function formatSize(width?: number, height?: number): string | undefined {
  if (!width || !height) return undefined;
  const mp = (width * height) / 1_000_000;
  // No-break spaces keep each figure with its unit when a narrow photo wraps the line.
  return `${width}\u00a0×\u00a0${height}\u00a0px · ${mp >= 10 ? Math.round(mp) : mp.toFixed(1)}\u00a0MP`;
}

/** The camera's clock time as written ("12 Oct 2026, 5:42 pm"), with no zone conversion: it never had a zone. */
export function formatTakenAt(takenAt?: string): string | undefined {
  const m = takenAt && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(takenAt);
  if (!m) return undefined;
  const local = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return local.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const trimNumber = (n: string) => n.replace(/\.0+$/, '');

/**
 * The focal length and aperture a lens's own name states: "FE 24-70mm F2.8 GM
 * II" gives 24–70 mm and ƒ/2.8, "back camera 4.84mm f/1.8" gives 4.84 mm and
 * ƒ/1.8. Read from the name only, so nothing beyond the lens is ever kept.
 */
export function lensFacts(lensModel?: string): { focal?: string; aperture?: string } {
  if (!lensModel) return {};
  const focal = /(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*mm/i.exec(lensModel);
  const aperture = /(?:^|[^a-z]|mm)f\s*\/?\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/i.exec(lensModel);
  return {
    focal: focal ? `${trimNumber(focal[1])}${focal[2] ? `–${trimNumber(focal[2])}` : ''} mm` : undefined,
    aperture: aperture ? `ƒ/${trimNumber(aperture[1])}${aperture[2] ? `–${trimNumber(aperture[2])}` : ''}` : undefined,
  };
}

/** Camera and lens makers as people write them, from how EXIF spells them ("NIKON CORPORATION", "samsung"). */
const BRANDS: Record<string, string> = {
  apple: 'Apple',
  canon: 'Canon',
  dji: 'DJI',
  fujifilm: 'Fujifilm',
  google: 'Google',
  gopro: 'GoPro',
  hasselblad: 'Hasselblad',
  'hmd global': 'Nokia',
  huawei: 'Huawei',
  'leica camera ag': 'Leica',
  leica: 'Leica',
  motorola: 'Motorola',
  nikon: 'Nikon',
  'nikon corporation': 'Nikon',
  'olympus corporation': 'Olympus',
  'olympus imaging corp.': 'Olympus',
  'om digital solutions': 'OM System',
  oneplus: 'OnePlus',
  oppo: 'OPPO',
  panasonic: 'Panasonic',
  pentax: 'Pentax',
  'ricoh imaging company, ltd.': 'Ricoh',
  realme: 'realme',
  samsung: 'Samsung',
  sony: 'Sony',
  vivo: 'vivo',
  xiaomi: 'Xiaomi',
};

/** A maker's name as people write it: "SONY" is Sony, "NIKON CORPORATION" is Nikon. Unknown makers are kept as written. */
export function brandOf(make?: string): string | undefined {
  const clean = make?.trim().replace(/\s+/g, ' ');
  if (!clean) return undefined;
  return BRANDS[clean.toLowerCase()] ?? clean;
}

/**
 * "Sony ILCE-7M4", "Apple iPhone 15 Pro", "Nikon Z 6_2": the maker once, as
 * people write it, never twice ("Canon Canon EOS R5", "NIKON CORPORATION NIKON Z 6_2").
 */
export function formatCamera(make?: string, model?: string): string | undefined {
  const brand = brandOf(make);
  const name = model?.trim().replace(/\s+/g, ' ');
  if (!name) return brand;
  if (!brand) return name;
  const lower = name.toLowerCase();
  // The model already starts with the maker, as written ("NIKON Z 6_2") or as people write it.
  for (const lead of [brand, (make ?? '').trim().split(/\s+/)[0]]) {
    const l = lead.toLowerCase();
    if (l && (lower === l || lower.startsWith(`${l} `))) return brand + name.slice(lead.length);
  }
  return `${brand} ${name}`;
}

/**
 * A phone writes its whole camera into the lens name: "iPhone 15 Pro back
 * triple camera 6.765mm f/1.78", "realme NARZO 80 Pro 5G back camera 4.84mm f/1.8".
 * Split into the phone, which of its cameras, and what that camera's name states.
 */
const PHONE_LENS = /^(.*?)\s+((?:back|front|rear)\b[^0-9]*?\bcamera)\b\s*(.*)$/i;

/**
 * One way to say what took the photo, the same for a phone and a camera:
 * the device first, then its lens on a quieter line.
 *
 *   realme NARZO 80 Pro 5G   Back camera · 4.84 mm · ƒ/1.8
 *   Apple iPhone 15 Pro      Back triple camera · 6.765 mm · ƒ/1.78
 *   Sony ILCE-7M4            SIGMA 24-70mm F2.8 DG DN II | Art 024
 *
 * The device comes from the camera's own make and model, or, for a phone that
 * only wrote its lens name, from the front of that name. A lens on its own
 * (no body recorded) is the whole answer.
 */
export function cameraAndLens(details: PhotoDetails = {}): { value?: string; detail?: string } {
  const lensName = details.lensModel?.trim().replace(/\s+/g, ' ');
  const phone = lensName ? PHONE_LENS.exec(lensName) : null;
  let device = formatCamera(details.make, details.model);
  let lens: string | undefined;
  if (phone) {
    const [, phoneName, which, rest] = phone;
    if (!device && phoneName.trim()) device = formatCamera(details.lensMake, phoneName.trim());
    const { focal, aperture } = lensFacts(rest || lensName);
    const camera = which.charAt(0).toUpperCase() + which.slice(1).toLowerCase();
    lens = [camera, focal, aperture].filter(Boolean).join(' · ');
  } else if (lensName || details.lensMake) {
    lens = formatCamera(details.lensMake, lensName);
  }
  return device ? { value: device, detail: lens } : { value: lens };
}

export type SourceTone = 'ai' | 'capture' | 'other';

/** What a Content Credentials digital source type means, in a reader's words. */
export function describeSource(type?: string): { label: string; tone: SourceTone } | undefined {
  switch (type) {
    case undefined: return undefined;
    case 'trainedAlgorithmicMedia': return { label: 'Made with AI', tone: 'ai' };
    case 'compositeWithTrainedAlgorithmicMedia': return { label: 'Edited with AI', tone: 'ai' };
    case 'algorithmicMedia': return { label: 'Computer-generated', tone: 'ai' };
    case 'digitalCapture':
    case 'computationalCapture': return { label: 'Taken with a camera', tone: 'capture' };
    case 'negativeFilm':
    case 'positiveFilm': return { label: 'Scanned from film', tone: 'capture' };
    case 'print': return { label: 'Scanned from a print', tone: 'capture' };
    case 'compositeCapture': return { label: 'Combined from camera photos', tone: 'other' };
    case 'humanEdits':
    case 'minorHumanEdits': return { label: 'Edited by a person', tone: 'other' };
    case 'algorithmicallyEnhanced': return { label: 'Enhanced by software', tone: 'other' };
    case 'screenCapture': return { label: 'Screenshot', tone: 'other' };
    case 'digitalArt':
    case 'digitalCreation': return { label: 'Digital art', tone: 'other' };
    case 'compositeSynthetic': return { label: 'Combined with synthetic parts', tone: 'other' };
    case 'virtualRecording': return { label: 'Recorded in a virtual scene', tone: 'other' };
    case 'dataDrivenMedia': return { label: 'Made from data', tone: 'other' };
    case 'softwareImage': return { label: 'Made with software', tone: 'other' };
    default: return { label: 'Has Content Credentials', tone: 'other' };
  }
}

/** One line of a photo's details. `detail` is a quieter second line; `missing` shows as "Not available". */
export interface DetailRow {
  label: string;
  value: string;
  detail?: string;
  missing?: boolean;
  /** Wants a whole row of a grid to itself. */
  wide?: boolean;
}

export const NOT_AVAILABLE = 'Not available';

/**
 * What the original says about itself, one row per question even when the file
 * has no answer. What took it comes first, as one answer for a phone or a
 * camera (`cameraAndLens`). Never a location, and never who posted it: the
 * poster is not always who made the photo; that is the Author row.
 */
export function imageDataRows(details: PhotoDetails = {}): DetailRow[] {
  const row = (label: string, value: string | undefined): DetailRow =>
    value ? { label, value } : { label, value: NOT_AVAILABLE, missing: true };
  const camera = cameraAndLens(details);
  return [
    camera.value
      ? { label: 'Camera & lens', value: camera.value, detail: camera.detail, wide: true }
      : { label: 'Camera & lens', value: NOT_AVAILABLE, missing: true, wide: true },
    row('Author', details.author),
    row('Copyright', details.copyright),
    row('Date of capture', formatTakenAt(details.takenAt)),
    row('Dimensions', formatSize(details.width, details.height)),
    row('Resolution', formatDpi(details.dpiX, details.dpiY)),
  ];
}

/** Whether the photo recorded anything about itself (beyond who posted it and when). */
export function hasPhotoData(details?: PhotoDetails | null): boolean {
  return Boolean(details && Object.values(details).some((v) => v !== undefined && v !== null && v !== ''));
}
