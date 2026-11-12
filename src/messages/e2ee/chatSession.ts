import { useSyncExternalStore } from 'react';

import { chatKeysApi } from '../chatApi';
import { setPbkdf2 } from './chatCrypto';
import { createChatEngine, type KeyStatus } from './chatEngine';
import { localChatStore } from './deviceKeyStore';
import { webCryptoPbkdf2 } from './webKdf';

// The browser's own PBKDF2; JavaScript where there is none.
setPbkdf2(webCryptoPbkdf2);

/** The one chat engine for whoever is signed in, in this tab. */
export const chatEngine = createChatEngine(chatKeysApi, localChatStore);

/** Where the signed-in person's chat keys stand, live. */
export function useChatKeyStatus(): KeyStatus {
  return useSyncExternalStore(chatEngine.subscribe, chatEngine.getStatus);
}
