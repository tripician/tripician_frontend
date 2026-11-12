import { pbkdf2Sync } from 'node:crypto';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { webCryptoPbkdf2 } from './webKdf';
import {
  chatKey,
  fromBase64,
  lockPrivateKey,
  newKeyPair,
  openFile,
  openMessage,
  publicKeyOf,
  safetyCode,
  sealFile,
  sealMessage,
  setPbkdf2,
  toBase64,
  UnreadableMessageError,
  utf8ToString,
  unlockPrivateKey,
  WrongPasscodeError,
  type LockedKey,
  type PhotoRef,
} from './chatCrypto';
import {
  createChatEngine,
  type ChatKeysApi,
  type ChatMessage,
  type DeviceKeys,
  type DeviceKeyStore,
  type ServerKey,
} from './chatEngine';

const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

describe('chat crypto', () => {
  // The same vectors are pinned in the web's tests: if either side drifts, a
  // message from one stops opening on the other.
  it('derives the pinned key from fixed private keys', () => {
    const a = new Uint8Array(32).fill(1);
    const b = new Uint8Array(32).fill(2);
    expect(hex(publicKeyOf(a))).toBe('a4e09292b651c278b9772c569f5fa9bb13d906b46ab68c9df9dc2b4409f8a209');
    expect(hex(publicKeyOf(b))).toBe('ce8d3ad1ccb633ec7b70c17814a5c76ecd029685050d344745ba05870e587d59');
    const fromA = chatKey(a, { userId: 3, version: 1 }, publicKeyOf(b), { userId: 7, version: 2 });
    const fromB = chatKey(b, { userId: 7, version: 2 }, publicKeyOf(a), { userId: 3, version: 1 });
    expect(hex(fromA)).toBe('4ee9b799c3c7a210ce9e66fbfcf8081dedf5b893bb48b6a7fa916ad1ad66c32b');
    expect(fromB).toEqual(fromA);
  });

  it('seals for one direction only', () => {
    const key = chatKey(newKeyPair().privateKey, { userId: 1, version: 1 }, newKeyPair().publicKey, { userId: 2, version: 1 });
    const sealed = sealMessage(key, { text: 'Meet at the ferry 🚢', sentAt: 5 }, 1, 2);
    expect(openMessage(key, sealed, 1, 2)).toEqual({ text: 'Meet at the ferry 🚢', sentAt: 5 });
    // The server can't pass Ana's message off as Ben's.
    expect(() => openMessage(key, sealed, 2, 1)).toThrow(UnreadableMessageError);
    const tampered = { ...sealed, ciphertext: toBase64(fromBase64(sealed.ciphertext).map((b, i) => (i === 0 ? b ^ 1 : b))) };
    expect(() => openMessage(key, tampered, 1, 2)).toThrow(UnreadableMessageError);
  });

  it('locks a private key with a passcode', async () => {
    const pair = newKeyPair();
    const locked = await lockPrivateKey(pair.privateKey, 'correct horse', { userId: 9, version: 1 }, 1000);
    expect(locked).toMatchObject({ version: 1, kdf: 'pbkdf2-sha256', iterations: 1000 });
    await expect(unlockPrivateKey(locked, 'correct horse', 9)).resolves.toEqual(pair.privateKey);
    await expect(unlockPrivateKey(locked, 'wrong horse', 9)).rejects.toBeInstanceOf(WrongPasscodeError);
    // Bound to the account: someone else's lock can't be passed off as yours.
    await expect(unlockPrivateKey(locked, 'correct horse', 10)).rejects.toBeInstanceOf(WrongPasscodeError);
  });

  // The phone's native PBKDF2 and the browser's must give the bytes this does.
  it('locks the same with a platform PBKDF2 as with the JavaScript one', async () => {
    const pair = newKeyPair();
    const locked = await lockPrivateKey(pair.privateKey, 'pässcode ✈️', { userId: 4, version: 2 }, 2000);
    setPbkdf2(async (password, salt, iterations) => new Uint8Array(pbkdf2Sync(password, salt, iterations, 32, 'sha256')));
    try {
      await expect(unlockPrivateKey(locked, 'pässcode ✈️', 4)).resolves.toEqual(pair.privateKey);
    } finally {
      setPbkdf2(null);
    }
  });

  // The browser's own PBKDF2 must give the bytes the app's (native or JavaScript) does.
  it('locks the same with Web Crypto as with the JavaScript PBKDF2', async () => {
    const pair = newKeyPair();
    const locked = await lockPrivateKey(pair.privateKey, 'pässcode ✈️', { userId: 4, version: 2 }, 2000);
    setPbkdf2(webCryptoPbkdf2);
    try {
      await expect(unlockPrivateKey(locked, 'pässcode ✈️', 4)).resolves.toEqual(pair.privateKey);
    } finally {
      setPbkdf2(null);
    }
  });

  it('gives both people the same safety code', () => {
    const a = { userId: 1, publicKey: newKeyPair().publicKey };
    const b = { userId: 2, publicKey: newKeyPair().publicKey };
    const code = safetyCode(a, b);
    expect(code).toMatch(/^(\d{5} ){11}\d{5}$/);
    expect(safetyCode(b, a)).toBe(code);
  });

  // Hermes has no TextDecoder, so the app decodes UTF-8 itself; it must match the real thing.
  it('decodes UTF-8 exactly as TextDecoder does', () => {
    const text = 'Meet at 7 · café ☕ 東京 🏔️ 👨‍👩‍👧 Ω';
    const bytes = new TextEncoder().encode(text);
    expect(utf8ToString(bytes)).toBe(text);
    const broken = new Uint8Array([0x61, 0xe2, 0x82, 0x62, 0xff]);
    expect(utf8ToString(broken)).toBe(new TextDecoder().decode(broken));
  });

  it('round-trips base64 of every length', () => {
    for (let n = 0; n < 10; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 255);
      expect(fromBase64(toBase64(bytes))).toEqual(bytes);
    }
    expect(toBase64(new Uint8Array([104, 105]))).toBe('aGk=');
    const big = Uint8Array.from({ length: 50_001 }, (_, i) => (i * 131 + 7) & 255);
    expect(toBase64(big)).toBe(Buffer.from(big).toString('base64'));
    expect(fromBase64(toBase64(big))).toEqual(big);
  });

  const photoRef: PhotoRef = {
    url: 'https://res.cloudinary.com/demo/raw/upload/v1/tripician/test/chats/c/abc',
    key: toBase64(new Uint8Array(32).fill(1)),
    nonce: toBase64(new Uint8Array(24).fill(2)),
    w: 1600,
    h: 1200,
    mime: 'image/jpeg',
    bytes: 123456,
  };

  it('carries a photo or a place inside the sealed message, with words as the caption', () => {
    const key = new Uint8Array(32).fill(9);
    const photo = sealMessage(key, { text: 'Sunset at Oia', photo: photoRef, sentAt: 1 }, 1, 2);
    expect(openMessage(key, photo, 1, 2)).toEqual({ text: 'Sunset at Oia', sentAt: 1, photo: photoRef });
    const place = sealMessage(key, { text: '', location: { lat: 38.7223, lng: -9.1393, acc: 12 }, sentAt: 1 }, 1, 2);
    expect(openMessage(key, place, 1, 2)).toEqual({ text: '', sentAt: 1, location: { lat: 38.7223, lng: -9.1393, acc: 12 } });
  });

  it('never fetches a photo from anywhere but the photo host', () => {
    const key = new Uint8Array(32).fill(9);
    const elsewhere = sealMessage(key, { text: '', photo: { ...photoRef, url: 'https://tracker.example/pixel' } }, 1, 2);
    expect(openMessage(key, elsewhere, 1, 2)).toEqual(expect.objectContaining({ unsupported: true }));
  });

  it('seals a photo file with its own key, which nothing else opens', () => {
    const picture = Uint8Array.from({ length: 4096 }, (_, i) => i & 255);
    const sealed = sealFile(picture);
    expect(openFile(sealed.bytes, sealed.key, sealed.nonce)).toEqual(picture);
    expect(() => openFile(sealed.bytes, sealFile(picture).key, sealed.nonce)).toThrow(UnreadableMessageError);
  });
});

/** The server as far as keys go, shared by everyone's "devices" in a test. */
function fakeServer() {
  const publicKeys = new Map<number, ServerKey[]>();
  const backups = new Map<number, LockedKey>();
  const apiFor = (userId: number): ChatKeysApi => ({
    async myKeys() {
      const keys = publicKeys.get(userId) ?? [];
      return { publicKey: keys[keys.length - 1] ?? null, backup: backups.get(userId) ?? null };
    },
    async setUp({ publicKey, backup, replace }) {
      const keys = publicKeys.get(userId) ?? [];
      if (keys.length && !replace) {
        return null;
      }
      const key = { userId, version: keys.length + 1, publicKey };
      publicKeys.set(userId, [...keys, key]);
      backups.set(userId, backup);
      return key;
    },
    async saveBackup(backup) {
      backups.set(userId, backup);
    },
    async publicKey(other, version) {
      const keys = publicKeys.get(other) ?? [];
      return (version ? keys.find(k => k.version === version) : keys[keys.length - 1]) ?? null;
    },
  });
  return { apiFor };
}

function memoryStore(): DeviceKeyStore {
  const saved = new Map<number, DeviceKeys>();
  return {
    load: async id => saved.get(id) ?? null,
    save: async (id, keys) => {
      saved.set(id, keys);
    },
    clear: async id => {
      saved.delete(id);
    },
  };
}

const message = (id: string, from: number, sealed: { ciphertext: string; nonce: string; senderKeyVersion: number; recipientKeyVersion: number }): ChatMessage => ({
  id,
  conversationId: 'c',
  senderUserId: from,
  createdAt: '',
  read: false,
  body: null,
  ...sealed,
});

describe('chat keys across devices', () => {
  // Node's own PBKDF2 stands in for the phone's native one: the JavaScript
  // one takes seconds per passcode under Jest.
  beforeAll(() => setPbkdf2(async (password, salt, iterations) => new Uint8Array(pbkdf2Sync(password, salt, iterations, 32, 'sha256'))));
  afterAll(() => setPbkdf2(null));

  it('sets up, then a second device unlocks with the passcode and reads the history', async () => {
    const server = fakeServer();
    const anaPhone = createChatEngine(server.apiFor(1), memoryStore());
    const ben = createChatEngine(server.apiFor(2), memoryStore());
    await anaPhone.init(1);
    await ben.init(2);
    expect(anaPhone.getStatus()).toEqual({ kind: 'setup' });
    await anaPhone.setUp('ana passcode');
    await ben.setUp('ben passcode');
    expect(anaPhone.getStatus()).toEqual({ kind: 'ready', version: 1 });

    const hello = message('m1', 1, await anaPhone.seal('Hello Ben', 2));
    await expect(ben.open(hello, 1)).resolves.toEqual(expect.objectContaining({ kind: 'text', text: 'Hello Ben' }));

    // Ana signs in on the web.
    const anaWeb = createChatEngine(server.apiFor(1), memoryStore());
    await anaWeb.init(1);
    expect(anaWeb.getStatus()).toEqual({ kind: 'locked', canUnlock: true });
    await expect(anaWeb.unlock('not it')).rejects.toBeInstanceOf(WrongPasscodeError);
    await anaWeb.unlock('ana passcode');
    await expect(anaWeb.open(hello, 2)).resolves.toEqual(expect.objectContaining({ text: 'Hello Ben' }));

    // Plain text from before encryption passes through, marked as such.
    await expect(anaWeb.open({ ...hello, id: 'old', ciphertext: null, nonce: null, body: 'Old hi' }, 2)).resolves.toEqual({
      kind: 'plain',
      text: 'Old hi',
    });
  });

  it('starting over after a forgotten passcode leaves older messages unreadable on a new device', async () => {
    const server = fakeServer();
    const ana = createChatEngine(server.apiFor(1), memoryStore());
    const ben = createChatEngine(server.apiFor(2), memoryStore());
    await ana.init(1);
    await ben.init(2);
    await ana.setUp('first passcode');
    await ben.setUp('ben passcode');
    const before = message('m1', 2, await ben.seal('Before', 1));

    const anaNewPhone = createChatEngine(server.apiFor(1), memoryStore());
    await anaNewPhone.init(1);
    await anaNewPhone.reset('second passcode');
    expect(anaNewPhone.getStatus()).toEqual({ kind: 'ready', version: 2 });
    await expect(anaNewPhone.open(before, 2)).resolves.toEqual({ kind: 'unreadable' });

    // Ben picks up her new key and they carry on.
    ben.forgetPeer(1);
    const after = message('m2', 2, await ben.seal('After', 1));
    expect(after.recipientKeyVersion).toBe(2);
    await expect(anaNewPhone.open(after, 2)).resolves.toEqual(expect.objectContaining({ text: 'After' }));

    // Her old phone still holds the old key, so it still reads the old message.
    await expect(ana.open(before, 2)).resolves.toEqual(expect.objectContaining({ text: 'Before' }));
  });

  it('changes the passcode without changing the key', async () => {
    const server = fakeServer();
    const ana = createChatEngine(server.apiFor(1), memoryStore());
    await ana.init(1);
    await ana.setUp('first passcode');
    await ana.changePasscode('second passcode');

    const web = createChatEngine(server.apiFor(1), memoryStore());
    await web.init(1);
    await expect(web.unlock('first passcode')).rejects.toBeInstanceOf(WrongPasscodeError);
    await web.unlock('second passcode');
    expect(web.getStatus()).toEqual({ kind: 'ready', version: 1 });
  });
});
