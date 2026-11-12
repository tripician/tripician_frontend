import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { concatBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';

/**
 * End-to-end encryption for chats. KEEP IN STEP with the app's copy
 * (`tripician_mobile/src/features/messages/e2ee/chatCrypto.ts`): the two must seal
 * and open identically, byte for byte, or a message from one can't be read on
 * the other. The tests in both repos pin the same vectors.
 *
 * - Each person has an X25519 key pair (versioned: a forgotten passcode starts
 *   a new version). The public half is on the server; the private half never
 *   leaves their devices except locked with their chat passcode.
 * - Two people's chat key: HKDF-SHA256 over their X25519 shared secret, bound
 *   to both ids and key versions.
 * - A message: XChaCha20-Poly1305 with a random 24-byte nonce, bound (as
 *   associated data) to who sent it to whom, so the server can't pass one
 *   person's message off as the other's.
 * - The passcode lock: PBKDF2-SHA256 (iterations stored with the lock) then
 *   XChaCha20-Poly1305, bound to the account and key version.
 *
 * There is no forward secrecy: anyone who gets a person's private key can read
 * the messages it opens. That is the trade for history on every device.
 */

export const KDF = 'pbkdf2-sha256';
export const PASSCODE_ITERATIONS = 600_000;
export const MIN_PASSCODE_LENGTH = 8;
/** The longest message, in characters. The server's limit on sealed bytes leaves room for any script. */
export const MAX_MESSAGE_LENGTH = 2000;

export type KeyPair = { privateKey: Uint8Array; publicKey: Uint8Array };

/** The passcode-locked private key, as the server stores it (`ChatKeyBackupDto`). */
export type LockedKey = {
  version: number;
  lockedKey: string;
  salt: string;
  nonce: string;
  kdf: string;
  iterations: number;
};

export type Sealed = { ciphertext: string; nonce: string };

/**
 * A photo a message points to. The file itself is sealed on its own with a
 * fresh key (`sealFile`) and stored as unreadable bytes; the key and nonce that
 * open it travel only here, inside the sealed message.
 */
export type PhotoRef = {
  /** Where the sealed file is. Only Cloudinary is ever fetched (see `PHOTO_HOST`). */
  url: string;
  key: string;
  nonce: string;
  w: number;
  h: number;
  mime: string;
  bytes: number;
};

/** A place shared from the sender's phone or browser: where they were, as precisely as it knew. */
export type LocationRef = {
  lat: number;
  lng: number;
  /** Accuracy in metres, when known. */
  acc?: number;
};

/**
 * What is inside a sealed message. `sentAt` is the sender's clock, for display
 * only. A photo or location carries `text` as its caption or note (may be
 * empty). `unsupported` marks a kind this version doesn't know: it shows the
 * text and asks for an update.
 */
export type ChatPayload = {
  text: string;
  sentAt?: number;
  photo?: PhotoRef;
  location?: LocationRef;
  unsupported?: boolean;
};

/**
 * Photos are fetched from here and nowhere else. A sealed message names the
 * url, so without this a sender could make the other person's phone fetch any
 * address they liked (and learn their IP address from it).
 */
export const PHOTO_HOST = 'https://res.cloudinary.com/';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type KeyRef = { userId: number; version: number };

export class WrongPasscodeError extends Error {
  constructor() {
    super("That passcode isn't right.");
    this.name = 'WrongPasscodeError';
  }
}

export class UnreadableMessageError extends Error {
  constructor() {
    super("This message can't be opened on this device.");
    this.name = 'UnreadableMessageError';
  }
}

export function newKeyPair(): KeyPair {
  const { secretKey, publicKey } = x25519.keygen();
  return { privateKey: secretKey, publicKey };
}

export function publicKeyOf(privateKey: Uint8Array): Uint8Array {
  return x25519.getPublicKey(privateKey);
}

function lockAad(userId: number, version: number): Uint8Array {
  return utf8ToBytes(`tripician-chat-key-v1|${userId}|${version}`);
}

/** PBKDF2-HMAC-SHA256 to 32 bytes. Any implementation must give exactly these bytes. */
export type Pbkdf2 = (password: Uint8Array, salt: Uint8Array, iterations: number) => Promise<Uint8Array>;

const noblePbkdf2: Pbkdf2 = (password, salt, iterations) => pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: 32 });

let pbkdf2Impl: Pbkdf2 = noblePbkdf2;

/**
 * Swaps in a faster PBKDF2: the platform's own (a native module on Android,
 * Web Crypto in a browser). JavaScript takes seconds on a phone for the
 * iterations a passcode needs; native takes a fraction of one.
 */
export function setPbkdf2(impl: Pbkdf2 | null) {
  pbkdf2Impl = impl ?? noblePbkdf2;
}

async function passcodeKey(passcode: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  // NFKC so the same passcode typed on two keyboards is the same bytes.
  return pbkdf2Impl(utf8ToBytes(passcode.normalize('NFKC')), salt, iterations);
}

export async function lockPrivateKey(
  privateKey: Uint8Array,
  passcode: string,
  owner: KeyRef,
  iterations = PASSCODE_ITERATIONS,
): Promise<LockedKey> {
  const salt = randomBytes(16);
  const nonce = randomBytes(24);
  const key = await passcodeKey(passcode, salt, iterations);
  const locked = xchacha20poly1305(key, nonce, lockAad(owner.userId, owner.version)).encrypt(privateKey);
  return {
    version: owner.version,
    lockedKey: toBase64(locked),
    salt: toBase64(salt),
    nonce: toBase64(nonce),
    kdf: KDF,
    iterations,
  };
}

export async function unlockPrivateKey(locked: LockedKey, passcode: string, userId: number): Promise<Uint8Array> {
  if (locked.kdf !== KDF) {
    throw new Error('This passcode lock is not one this app understands. Update Tripician.');
  }
  const key = await passcodeKey(passcode, fromBase64(locked.salt), locked.iterations);
  try {
    return xchacha20poly1305(key, fromBase64(locked.nonce), lockAad(userId, locked.version)).decrypt(fromBase64(locked.lockedKey));
  } catch {
    throw new WrongPasscodeError();
  }
}

/** The key two people's messages are sealed with: the same on both sides. */
export function chatKey(myPrivateKey: Uint8Array, me: KeyRef, theirPublicKey: Uint8Array, them: KeyRef): Uint8Array {
  const shared = x25519.getSharedSecret(myPrivateKey, theirPublicKey);
  const [low, high] = me.userId < them.userId ? [me, them] : [them, me];
  return hkdf(
    sha256,
    shared,
    utf8ToBytes('tripician-chat-v1'),
    utf8ToBytes(`${low.userId}:${low.version}|${high.userId}:${high.version}`),
    32,
  );
}

function messageAad(senderId: number, recipientId: number): Uint8Array {
  return utf8ToBytes(`tripician-chat-v1|${senderId}>${recipientId}`);
}

export function sealMessage(key: Uint8Array, payload: ChatPayload, senderId: number, recipientId: number): Sealed {
  const nonce = randomBytes(24);
  // A plain text message is exactly what it always was: {v, t, ts}.
  const wire: Record<string, unknown> = { v: 1, t: payload.text, ts: payload.sentAt ?? Date.now() };
  if (payload.photo) {
    wire.k = 'photo';
    wire.p = payload.photo;
  } else if (payload.location) {
    wire.k = 'location';
    wire.l = payload.location;
  }
  const body = utf8ToBytes(JSON.stringify(wire));
  const ciphertext = xchacha20poly1305(key, nonce, messageAad(senderId, recipientId)).encrypt(body);
  return { ciphertext: toBase64(ciphertext), nonce: toBase64(nonce) };
}

const isNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function isB64Of(value: unknown, bytes: number): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    return fromBase64(value).length === bytes;
  } catch {
    return false;
  }
}

/** The photo a message names, or null when anything about it is off (it then shows as unsupported). */
function readPhoto(raw: unknown): PhotoRef | null {
  const p = raw as Partial<PhotoRef> | null;
  if (
    !p ||
    typeof p.url !== 'string' ||
    !p.url.startsWith(PHOTO_HOST) ||
    p.url.length > 600 ||
    !isB64Of(p.key, 32) ||
    !isB64Of(p.nonce, 24) ||
    !isNumber(p.w) ||
    !isNumber(p.h) ||
    p.w <= 0 ||
    p.h <= 0 ||
    typeof p.mime !== 'string' ||
    !PHOTO_TYPES.includes(p.mime) ||
    !isNumber(p.bytes)
  ) {
    return null;
  }
  return { url: p.url, key: p.key, nonce: p.nonce, w: p.w, h: p.h, mime: p.mime, bytes: p.bytes };
}

function readLocation(raw: unknown): LocationRef | null {
  const l = raw as Partial<LocationRef> | null;
  if (!l || !isNumber(l.lat) || !isNumber(l.lng) || Math.abs(l.lat) > 90 || Math.abs(l.lng) > 180) {
    return null;
  }
  return { lat: l.lat, lng: l.lng, ...(isNumber(l.acc) && l.acc >= 0 ? { acc: l.acc } : {}) };
}

export function openMessage(key: Uint8Array, sealed: Sealed, senderId: number, recipientId: number): ChatPayload {
  let bytes: Uint8Array;
  try {
    bytes = xchacha20poly1305(key, fromBase64(sealed.nonce), messageAad(senderId, recipientId)).decrypt(
      fromBase64(sealed.ciphertext),
    );
  } catch {
    throw new UnreadableMessageError();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(utf8ToString(bytes));
  } catch {
    throw new UnreadableMessageError();
  }
  const body = parsed as { t?: unknown; ts?: unknown; k?: unknown; p?: unknown; l?: unknown } | null;
  if (typeof body?.t !== 'string') {
    throw new UnreadableMessageError();
  }
  const sentAt = typeof body.ts === 'number' ? body.ts : undefined;
  if (body.k === undefined) {
    return { text: body.t, sentAt };
  }
  if (body.k === 'photo') {
    const photo = readPhoto(body.p);
    return photo ? { text: body.t, sentAt, photo } : { text: body.t, sentAt, unsupported: true };
  }
  if (body.k === 'location') {
    const location = readLocation(body.l);
    return location ? { text: body.t, sentAt, location } : { text: body.t, sentAt, unsupported: true };
  }
  return { text: body.t, sentAt, unsupported: true };
}

// ─── Files (photos) ───────────────────────────────────────────────────────────

const FILE_AAD = utf8ToBytes('tripician-chat-file-v1');

/** A file sealed with its own fresh key. The key and nonce go in the message; the bytes go to storage. */
export type SealedFile = { bytes: Uint8Array; key: string; nonce: string };

export function sealFile(plain: Uint8Array): SealedFile {
  const key = randomBytes(32);
  const nonce = randomBytes(24);
  const bytes = xchacha20poly1305(key, nonce, FILE_AAD).encrypt(plain);
  return { bytes, key: toBase64(key), nonce: toBase64(nonce) };
}

/** Opens a sealed file. Throws UnreadableMessageError when the key doesn't fit or the bytes were changed. */
export function openFile(sealed: Uint8Array, key: string, nonce: string): Uint8Array {
  try {
    return xchacha20poly1305(fromBase64(key), fromBase64(nonce), FILE_AAD).decrypt(sealed);
  } catch {
    throw new UnreadableMessageError();
  }
}

/**
 * A 60-digit code two people can compare (in person, or read aloud) to know
 * nobody swapped a key in between. The same on both phones; it changes when
 * either of them resets their key.
 */
export function safetyCode(a: { userId: number; publicKey: Uint8Array }, b: { userId: number; publicKey: Uint8Array }): string {
  const [low, high] = a.userId < b.userId ? [a, b] : [b, a];
  const digest = sha512(
    concatBytes(
      utf8ToBytes(`tripician-safety-v1|${low.userId}|`),
      low.publicKey,
      utf8ToBytes(`|${high.userId}|`),
      high.publicKey,
    ),
  );
  const groups: string[] = [];
  for (let i = 0; i < 12; i++) {
    const n = ((digest[i * 4] << 24) | (digest[i * 4 + 1] << 16) | (digest[i * 4 + 2] << 8) | digest[i * 4 + 3]) >>> 0;
    groups.push(String(n % 100000).padStart(5, '0'));
  }
  return groups.join(' ');
}

// ─── UTF-8 out (Hermes on the phone has TextEncoder but no TextDecoder) ───────

/** Bytes to text, by the WHATWG decoding steps, so the result is exactly what TextDecoder gives. */
export function utf8ToString(bytes: Uint8Array): string {
  const points: number[] = [];
  let needed = 0;
  let seen = 0;
  let cp = 0;
  let lower = 0x80;
  let upper = 0xbf;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (needed === 0) {
      if (b <= 0x7f) {
        points.push(b);
      } else if (b >= 0xc2 && b <= 0xdf) {
        needed = 1;
        cp = b & 0x1f;
      } else if (b >= 0xe0 && b <= 0xef) {
        lower = b === 0xe0 ? 0xa0 : 0x80;
        upper = b === 0xed ? 0x9f : 0xbf;
        needed = 2;
        cp = b & 0x0f;
      } else if (b >= 0xf0 && b <= 0xf4) {
        lower = b === 0xf0 ? 0x90 : 0x80;
        upper = b === 0xf4 ? 0x8f : 0xbf;
        needed = 3;
        cp = b & 0x07;
      } else {
        points.push(0xfffd);
      }
      continue;
    }
    if (b < lower || b > upper) {
      // A broken sequence: one replacement for it, then this byte starts afresh.
      needed = 0;
      seen = 0;
      cp = 0;
      lower = 0x80;
      upper = 0xbf;
      points.push(0xfffd);
      i--;
      continue;
    }
    lower = 0x80;
    upper = 0xbf;
    cp = (cp << 6) | (b & 0x3f);
    seen++;
    if (seen === needed) {
      points.push(cp);
      needed = 0;
      seen = 0;
      cp = 0;
    }
  }
  if (needed !== 0) {
    points.push(0xfffd);
  }
  let out = '';
  for (let i = 0; i < points.length; i += 4096) {
    out += String.fromCodePoint(...points.slice(i, i + 4096));
  }
  return out;
}

// ─── Base64 (no Buffer or atob needed, so it is the same everywhere) ──────────

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP: Record<string, number> = Object.fromEntries([...ALPHABET].map((c, i) => [c, i]));

export function toBase64(bytes: Uint8Array): string {
  // Built in chunks and joined once: a photo is a megabyte, and one string
  // grown four characters at a time is slow on a phone's JavaScript engine.
  const chunks: string[] = [];
  const CHUNK = 3 * 4096;
  for (let start = 0; start < bytes.length; start += CHUNK) {
    const end = Math.min(start + CHUNK, bytes.length);
    const part: string[] = [];
    for (let i = start; i < end; i += 3) {
      const a = bytes[i];
      const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
      const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
      const n = (a << 16) | (b << 8) | c;
      part.push(
        ALPHABET[(n >> 18) & 63] +
          ALPHABET[(n >> 12) & 63] +
          (i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : '=') +
          (i + 2 < bytes.length ? ALPHABET[n & 63] : '='),
      );
    }
    chunks.push(part.join(''));
  }
  return chunks.join('');
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/[=]+$/, '');
  if (/[^A-Za-z0-9+/]/.test(clean) || clean.length % 4 === 1) {
    throw new UnreadableMessageError();
  }
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (LOOKUP[clean[i]] << 18) |
      (LOOKUP[clean[i + 1]] << 12) |
      ((LOOKUP[clean[i + 2]] ?? 0) << 6) |
      (LOOKUP[clean[i + 3]] ?? 0);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) {
      out[o++] = (n >> 8) & 255;
    }
    if (i + 3 < clean.length) {
      out[o++] = n & 255;
    }
  }
  return out;
}
