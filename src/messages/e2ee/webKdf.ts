import type { Pbkdf2 } from './chatCrypto';

/**
 * PBKDF2-HMAC-SHA256 from the browser's own Web Crypto: a fraction of a second
 * for the passcode's iterations, where JavaScript takes several. Byte-for-byte
 * the same as the JavaScript one (the tests check), so a key locked in the app
 * unlocks here and the other way round. Null where Web Crypto isn't available
 * (an insecure origin), which leaves the JavaScript one in place.
 */
export const webCryptoPbkdf2: Pbkdf2 | null =
  typeof globalThis.crypto?.subtle?.importKey === 'function'
    ? async (password, salt, iterations) => {
        const base = await globalThis.crypto.subtle.importKey('raw', password as BufferSource, 'PBKDF2', false, ['deriveBits']);
        const bits = await globalThis.crypto.subtle.deriveBits(
          { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
          base,
          256,
        );
        return new Uint8Array(bits);
      }
    : null;
