import {
  chatKey,
  fromBase64,
  lockPrivateKey,
  newKeyPair,
  openMessage,
  publicKeyOf,
  sealMessage,
  toBase64,
  UnreadableMessageError,
  unlockPrivateKey,
  type LocationRef,
  type LockedKey,
  type PhotoRef,
} from './chatCrypto';

/**
 * The chat keys of whoever is signed in, and sealing and opening their
 * messages. Platform-free: the app passes the keychain and its API client,
 * the web passes localStorage and its own. KEEP IN STEP with the app's copy
 * (`tripician_mobile/src/features/messages/e2ee/chatEngine.ts`).
 */

export type ServerKey = { userId: number; version: number; publicKey: string };

export type MyServerKeys = { publicKey: ServerKey | null; backup: LockedKey | null };

export type ChatKeysApi = {
  myKeys(): Promise<MyServerKeys>;
  /** Null when a key already exists (another device got there first): unlock that one instead. */
  setUp(input: { publicKey: string; backup: LockedKey; replace: boolean }): Promise<ServerKey | null>;
  saveBackup(backup: LockedKey): Promise<void>;
  /** Null when they have no key (yet), or not that version. */
  publicKey(userId: number, version?: number): Promise<ServerKey | null>;
};

/** Private keys by version, as kept on this device. Old versions stay so old messages still open. */
export type DeviceKeys = { current: number; keys: Record<string, string> };

export type DeviceKeyStore = {
  load(userId: number): Promise<DeviceKeys | null>;
  save(userId: number, keys: DeviceKeys): Promise<void>;
  clear(userId: number): Promise<void>;
};

export type KeyStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  /** No chat key anywhere yet: choose a passcode. */
  | { kind: 'setup' }
  /** Their key is on the server, not on this device: enter the passcode (or start over). */
  | { kind: 'locked'; canUnlock: boolean }
  | { kind: 'ready'; version: number }
  | { kind: 'error'; message: string };

/** A message as the chat API sends it. */
export type ChatMessage = {
  id: string;
  conversationId: string;
  senderUserId: number;
  createdAt: string;
  read: boolean;
  ciphertext: string | null;
  nonce: string | null;
  senderKeyVersion: number | null;
  recipientKeyVersion: number | null;
  /** Plain text, from before encryption (or an older app). */
  body: string | null;
  /** When the sender last edited it (sealed again); null when never. */
  editedAt?: string | null;
  /** Who reacted, with which emoji (not encrypted: one of a fixed few). */
  reactions?: ChatReaction[] | null;
};

export type ChatReaction = { userId: number; emoji: string };

/** What a message says: words, or a photo or place with words as its caption. */
export type ChatContent = { text: string; photo?: PhotoRef; location?: LocationRef };

export type SealedForSend = {
  ciphertext: string;
  nonce: string;
  senderKeyVersion: number;
  recipientKeyVersion: number;
};

export type Opened =
  /**
   * Opened on this device: words, or a photo or place with `text` as its
   * caption. `unsupported` is a kind of message this version doesn't know.
   */
  | {
      kind: 'text';
      text: string;
      sentAt?: number;
      photo?: PhotoRef;
      location?: LocationRef;
      unsupported?: boolean;
    }
  /** Not end-to-end encrypted: sent before encryption, or from an older app. */
  | { kind: 'plain'; text: string }
  /** Sealed for a key this device doesn't have (a reset), or damaged. */
  | { kind: 'unreadable' };

export class KeyChangedError extends Error {
  constructor() {
    super('Their chat key changed.');
    this.name = 'KeyChangedError';
  }
}

export function createChatEngine(api: ChatKeysApi, store: DeviceKeyStore) {
  let userId: number | null = null;
  let status: KeyStatus = { kind: 'idle' };
  let device: DeviceKeys | null = null;
  let server: MyServerKeys | null = null;
  let initRun: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const peerKeys = new Map<string, Promise<ServerKey | null>>();
  const sharedKeys = new Map<string, Uint8Array>();
  const opened = new Map<string, Opened>();

  const setStatus = (next: KeyStatus) => {
    status = next;
    listeners.forEach(l => l());
  };

  const privateKeyFor = (version: number | null | undefined): Uint8Array | null => {
    const b64 = version != null ? device?.keys[String(version)] : undefined;
    return b64 ? fromBase64(b64) : null;
  };

  const remember = async (version: number, privateKey: Uint8Array) => {
    if (userId == null) {
      return;
    }
    device = { current: version, keys: { ...(device?.keys ?? {}), [String(version)]: toBase64(privateKey) } };
    await store.save(userId, device);
  };

  async function load(forUser: number) {
    setStatus({ kind: 'loading' });
    try {
      device = await store.load(forUser);
      server = await api.myKeys();
      const key = server.publicKey;
      if (!key) {
        setStatus({ kind: 'setup' });
        return;
      }
      const mine = privateKeyFor(key.version);
      if (mine && toBase64(publicKeyOf(mine)) === key.publicKey) {
        if (device && device.current !== key.version) {
          await remember(key.version, mine);
        }
        setStatus({ kind: 'ready', version: key.version });
        return;
      }
      setStatus({ kind: 'locked', canUnlock: !!server.backup && server.backup.version === key.version });
    } catch {
      setStatus({ kind: 'error', message: "Couldn't load your chat keys. Check your connection." });
    }
  }

  return {
    getStatus: () => status,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Loads (once per signed-in person) where their keys stand. Safe to call often. */
    init(forUser: number, force = false): Promise<void> {
      if (userId !== forUser) {
        userId = forUser;
        device = null;
        server = null;
        initRun = null;
        peerKeys.clear();
        sharedKeys.clear();
        opened.clear();
      }
      if (!initRun || force || status.kind === 'error') {
        initRun = load(forUser);
      }
      return initRun;
    },

    /** First time: a new key, locked with the passcode they chose, published. */
    async setUp(passcode: string) {
      if (userId == null) {
        throw new Error('Not signed in.');
      }
      const pair = newKeyPair();
      const backup = await lockPrivateKey(pair.privateKey, passcode, { userId, version: 1 });
      const key = await api.setUp({ publicKey: toBase64(pair.publicKey), backup, replace: false });
      if (!key || key.version !== 1) {
        // They set one up on another device a moment ago: that one is theirs,
        // so this device unlocks it rather than replacing it.
        await load(userId);
        return;
      }
      await remember(key.version, pair.privateKey);
      server = { publicKey: key, backup };
      setStatus({ kind: 'ready', version: key.version });
    },

    /** A new phone or browser: the passcode opens the key the server holds. Throws WrongPasscodeError. */
    async unlock(passcode: string) {
      if (userId == null || !server?.publicKey || !server.backup) {
        throw new Error('Nothing to unlock.');
      }
      const privateKey = await unlockPrivateKey(server.backup, passcode, userId);
      if (toBase64(publicKeyOf(privateKey)) !== server.publicKey.publicKey) {
        throw new Error("That key doesn't match your account. Start over to fix it.");
      }
      await remember(server.publicKey.version, privateKey);
      opened.clear();
      setStatus({ kind: 'ready', version: server.publicKey.version });
    },

    /**
     * Forgotten passcode: a new key (the next version), locked with a new
     * passcode. Messages sealed for the old key stay unreadable on any device
     * that doesn't still hold it.
     */
    async reset(passcode: string) {
      if (userId == null) {
        throw new Error('Not signed in.');
      }
      const nextVersion = (server?.publicKey?.version ?? 0) + 1;
      const pair = newKeyPair();
      const backup = await lockPrivateKey(pair.privateKey, passcode, { userId, version: nextVersion });
      const key = await api.setUp({ publicKey: toBase64(pair.publicKey), backup, replace: true });
      if (!key) {
        throw new Error("Couldn't start over. Try again.");
      }
      const final = key.version === nextVersion ? backup : await lockPrivateKey(pair.privateKey, passcode, { userId, version: key.version });
      if (final !== backup) {
        await api.saveBackup(final);
      }
      await remember(key.version, pair.privateKey);
      server = { publicKey: key, backup: final };
      opened.clear();
      setStatus({ kind: 'ready', version: key.version });
    },

    /** A new passcode for the same key. */
    async changePasscode(passcode: string) {
      if (userId == null || status.kind !== 'ready') {
        throw new Error('Unlock your messages first.');
      }
      const privateKey = privateKeyFor(status.version);
      if (!privateKey) {
        throw new Error('Unlock your messages first.');
      }
      const backup = await lockPrivateKey(privateKey, passcode, { userId, version: status.version });
      await api.saveBackup(backup);
      if (server) {
        server = { ...server, backup };
      }
    },

    /** Forget everything on this device for whoever was signed in (sign-out). */
    async signOut() {
      const forUser = userId;
      userId = null;
      device = null;
      server = null;
      initRun = null;
      peerKeys.clear();
      sharedKeys.clear();
      opened.clear();
      setStatus({ kind: 'idle' });
      if (forUser != null) {
        await store.clear(forUser);
      }
    },

    /** Someone's public key (their current one when no version), cached. */
    peerKey,

    /** Drops what is known of someone's current key, after the server says it changed. */
    forgetPeer(otherId: number) {
      peerKeys.delete(`${otherId}:current`);
    },

    /** The text of a message, opened on this device (cached by id). Never throws. */
    async open(message: ChatMessage, otherId: number): Promise<Opened> {
      if (!message.ciphertext || !message.nonce) {
        return { kind: 'plain', text: message.body ?? '' };
      }
      // By id and nonce: an edit is sealed again with a new nonce, so the old
      // words never stand in for the new ones.
      const cacheKey = `${message.id}:${message.nonce}`;
      const hit = opened.get(cacheKey);
      if (hit) {
        return hit;
      }
      if (userId == null) {
        return { kind: 'unreadable' };
      }
      const mineIsSender = message.senderUserId === userId;
      const myVersion = mineIsSender ? message.senderKeyVersion : message.recipientKeyVersion;
      const theirVersion = mineIsSender ? message.recipientKeyVersion : message.senderKeyVersion;
      const myPrivate = privateKeyFor(myVersion);
      if (!myPrivate || theirVersion == null || myVersion == null) {
        return { kind: 'unreadable' };
      }
      try {
        const shared = await sharedKey(myPrivate, myVersion, otherId, theirVersion);
        if (!shared) {
          return { kind: 'unreadable' };
        }
        const payload = openMessage(
          shared,
          { ciphertext: message.ciphertext, nonce: message.nonce },
          message.senderUserId,
          mineIsSender ? otherId : userId,
        );
        const result: Opened = {
          kind: 'text',
          text: payload.text,
          sentAt: payload.sentAt,
          ...(payload.photo ? { photo: payload.photo } : {}),
          ...(payload.location ? { location: payload.location } : {}),
          ...(payload.unsupported ? { unsupported: true } : {}),
        };
        opened.set(cacheKey, result);
        return result;
      } catch (error) {
        const result: Opened = { kind: 'unreadable' };
        if (error instanceof UnreadableMessageError) {
          opened.set(cacheKey, result);
        }
        return result;
      }
    },

    /** Seals a message for someone with both current keys. Throws when either side has no key. */
    async seal(content: string | ChatContent, otherId: number, theirKey?: ServerKey | null): Promise<SealedForSend> {
      if (userId == null || status.kind !== 'ready') {
        throw new Error('Unlock your messages first.');
      }
      const myPrivate = privateKeyFor(status.version);
      const key = theirKey ?? (await peerKey(otherId));
      if (!myPrivate || !key) {
        throw new Error("They can't receive encrypted messages yet.");
      }
      const shared = chatKey(myPrivate, { userId, version: status.version }, fromBase64(key.publicKey), {
        userId: otherId,
        version: key.version,
      });
      const sealed = sealMessage(shared, typeof content === 'string' ? { text: content } : content, userId, otherId);
      return { ...sealed, senderKeyVersion: status.version, recipientKeyVersion: key.version };
    },

    /** This person's current public key, for the security code. Null until unlocked. */
    myPublicKey(): Uint8Array | null {
      const mine = status.kind === 'ready' ? privateKeyFor(status.version) : null;
      return mine ? publicKeyOf(mine) : null;
    },

    /** Remembers the text of a message this device just sent, so it never needs opening. */
    rememberSent(message: Pick<ChatMessage, 'id' | 'nonce'>, content: ChatContent) {
      opened.set(`${message.id}:${message.nonce}`, { kind: 'text', ...content });
    },
  };

  function peerKey(otherId: number, version?: number): Promise<ServerKey | null> {
    const cacheKey = `${otherId}:${version ?? 'current'}`;
    let hit = peerKeys.get(cacheKey);
    if (!hit) {
      hit = api.publicKey(otherId, version).catch(() => null);
      peerKeys.set(cacheKey, hit);
      void hit.then(key => {
        if (!key) {
          peerKeys.delete(cacheKey);
        } else if (version == null) {
          peerKeys.set(`${otherId}:${key.version}`, Promise.resolve(key));
        }
      });
    }
    return hit;
  }

  async function sharedKey(myPrivate: Uint8Array, myVersion: number, otherId: number, theirVersion: number) {
    const cacheKey = `${myVersion}|${otherId}:${theirVersion}`;
    const hit = sharedKeys.get(cacheKey);
    if (hit) {
      return hit;
    }
    const theirs = await (async () => {
      const key = await peerKeys.get(`${otherId}:${theirVersion}`);
      return key ?? api.publicKey(otherId, theirVersion).catch(() => null);
    })();
    if (!theirs || userId == null) {
      return null;
    }
    peerKeys.set(`${otherId}:${theirVersion}`, Promise.resolve(theirs));
    const key = chatKey(myPrivate, { userId, version: myVersion }, fromBase64(theirs.publicKey), {
      userId: otherId,
      version: theirVersion,
    });
    sharedKeys.set(cacheKey, key);
    return key;
  }
}

export type ChatEngine = ReturnType<typeof createChatEngine>;
