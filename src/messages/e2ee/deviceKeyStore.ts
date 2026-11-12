import type { DeviceKeys, DeviceKeyStore } from './chatEngine';

/**
 * This browser's chat private keys, in localStorage, tagged with whose they
 * are. Sign-out wipes them with everything else (`clearSessionData` keeps
 * only an allowlist), and the chat passcode brings them back.
 */
const KEY = 'tripician:chatkeys';

type Stored = DeviceKeys & { userId: number };

export const localChatStore: DeviceKeyStore = {
  async load(userId) {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Stored) : null;
      return parsed?.userId === userId && parsed.keys ? { current: parsed.current, keys: parsed.keys } : null;
    } catch {
      return null;
    }
  },
  async save(userId, keys) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ userId, ...keys } satisfies Stored));
    } catch {
      // Storage full or blocked: this browser asks for the passcode next time.
    }
  },
  async clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing stored, nothing to clear
    }
  },
};
