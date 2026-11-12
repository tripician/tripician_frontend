import { useCallback, useEffect, useRef, useState } from 'react';
import {
  apiFailure,
  chatApi,
  EDIT_WINDOW_MS,
  type ChatExcerptLine,
  type ChatReaction,
  type ChatReportReason,
  type ChatSummary,
  type ChatTarget,
} from './chatApi';
import { uploadChatPhoto, type PreparedPhoto } from './chatMedia';
import { chatEvents, sendChatTyping } from './chatRealtime';
import { chatStore } from './chatStore';
import { MAX_MESSAGE_LENGTH, type LocationRef } from './e2ee/chatCrypto';
import type { ChatContent, ChatMessage, Opened, SealedForSend } from './e2ee/chatEngine';
import { chatEngine, useChatKeyStatus } from './e2ee/chatSession';

/** One line of the thread: a message from the server (opened here), or one still on its way. */
export type ThreadItem = {
  id: string;
  senderUserId: number;
  createdAt: string;
  read: boolean;
  /** Changes when the message is edited (sealed again). */
  nonce: string | null;
  editedAt: string | null;
  reactions: ChatReaction[];
  opened: Opened | null;
  /** A message this browser is sending or couldn't send. A photo keeps the picture until uploaded, then the upload. */
  pending?: { content: ChatContent; photo?: PreparedPhoto; state: 'sending' | 'failed'; error?: string };
};

const TYPING_EVERY_MS = 3000;

/** An instant from the API. A string with no zone is UTC, as everywhere on the server. */
export function instant(iso: string): number {
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

function toItem(message: ChatMessage, opened: Opened | null): ThreadItem {
  return {
    id: message.id,
    senderUserId: message.senderUserId,
    createdAt: message.createdAt,
    read: message.read,
    nonce: message.nonce,
    editedAt: message.editedAt ?? null,
    reactions: message.reactions ?? [],
    opened,
  };
}

/** What a message said, for a report: words, or what it was when it wasn't words. */
function excerptText(opened: Opened | null): string {
  if (!opened || opened.kind === 'unreadable') return '';
  if (opened.kind === 'plain') return opened.text;
  if (opened.photo) return opened.text ? `[Photo] ${opened.text}` : '[Photo]';
  if (opened.location) return opened.text ? `[Shared a location] ${opened.text}` : '[Shared a location]';
  return opened.text;
}

/** The sender may edit a sent, encrypted message of theirs for 15 minutes. */
export function canEdit(item: ThreadItem, myUserId: number | null): boolean {
  return (
    item.senderUserId === myUserId &&
    !item.pending &&
    item.opened?.kind === 'text' &&
    !item.opened.unsupported &&
    Date.now() - instant(item.createdAt) < EDIT_WINDOW_MS
  );
}

const newTempId = () => `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * One chat in the browser: its summary, its messages opened with the chat key,
 * sending words, photos and places (sealed here, never readable on the way),
 * edits, reactions, the request steps, and the live events for it. The same
 * behaviour as the app's `useChat`.
 */
export function useChat(target: ChatTarget, myUserId: number | null, visible = true) {
  const keyStatus = useChatKeyStatus();
  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [busy, setBusy] = useState<'accept' | 'decline' | 'invite' | null>(null);
  const mounted = useRef(true);
  const summaryRef = useRef<ChatSummary | null>(null);
  const itemsRef = useRef<ThreadItem[]>([]);
  const lastTyping = useRef(0);
  const ready = keyStatus.kind === 'ready';
  const targetId = target.conversationId ?? null;
  const targetUser = target.userId ?? null;

  summaryRef.current = summary;
  itemsRef.current = items;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const openAll = useCallback(
    (messages: ChatMessage[], other: number) =>
      Promise.all(messages.map(async (m) => toItem(m, await chatEngine.open(m, other)))),
    [],
  );

  const load = useCallback(async () => {
    if (!targetId && targetUser == null) return;
    setStatus('loading');
    setError(null);
    try {
      const { data: chat } = targetId ? await chatApi.get(targetId) : await chatApi.with(targetUser as number);
      if (!mounted.current) return;
      setSummary(chat);
      if (chat.id) {
        const { data } = await chatApi.messages(chat.id);
        const page = Array.isArray(data) ? data : [];
        const opened = await openAll(page, chat.other.userId);
        if (!mounted.current) return;
        setItems(opened);
        setHasOlder(page.length >= 50);
        if (chat.status === 'accepted') chatStore.readLocally(chat.id);
      } else {
        setItems([]);
        setHasOlder(false);
      }
      setStatus('ready');
    } catch (e) {
      if (!mounted.current) return;
      setError(apiFailure(e, 'Could not load this chat.').message);
      setStatus('error');
    }
  }, [targetId, targetUser, openAll]);

  useEffect(() => {
    void load();
  }, [load]);

  // Unlocked while this chat is open: open again what couldn't be opened before.
  const wasReady = useRef(ready);
  useEffect(() => {
    if (ready && !wasReady.current) void load();
    wasReady.current = ready;
  }, [ready, load]);

  const loadOlder = useCallback(async () => {
    const id = summaryRef.current?.id;
    const oldest = items.find((i) => !i.pending);
    const other = summaryRef.current?.other.userId;
    if (!id || !oldest || loadingOlder || !hasOlder || other == null) return;
    setLoadingOlder(true);
    try {
      const { data } = await chatApi.messages(id, new Date(instant(oldest.createdAt)).toISOString());
      const page = Array.isArray(data) ? data : [];
      const opened = await openAll(page, other);
      if (mounted.current) {
        setItems((prev) => [...opened.filter((o) => !prev.some((p) => p.id === o.id)), ...prev]);
        setHasOlder(page.length >= 50);
      }
    } catch {
      // Stays as it is; scrolling up again retries.
    } finally {
      if (mounted.current) setLoadingOlder(false);
    }
  }, [items, loadingOlder, hasOlder, openAll]);

  useEffect(
    () =>
      chatEvents.subscribe((event) => {
        const chat = summaryRef.current;
        if (!chat?.id || event.conversationId !== chat.id) return;
        if (event.type === 'message') {
          const message = event.message;
          void chatEngine.open(message, chat.other.userId).then((opened) => {
            if (!mounted.current) return;
            setItems((prev) => (prev.some((i) => i.id === message.id) ? prev : [...prev, toItem(message, opened)]));
          });
          if (message.senderUserId !== myUserId && visible && chat.status === 'accepted' && document.visibilityState === 'visible') {
            // Counted again once the read lands: a count fetched on the same live event may still include it.
            void chatApi
              .read(chat.id)
              .then(() => chatStore.refreshUnread())
              .catch(() => undefined);
            chatStore.readLocally(chat.id);
          }
        } else if (event.type === 'edited') {
          const message = event.message;
          void chatEngine.open(message, chat.other.userId).then((opened) => {
            if (!mounted.current) return;
            setItems((prev) =>
              prev.map((i) => (i.id === message.id ? { ...toItem(message, opened), read: i.read || message.read } : i)),
            );
          });
        } else if (event.type === 'reaction') {
          setItems((prev) => prev.map((i) => (i.id === event.messageId ? { ...i, reactions: event.reactions } : i)));
        } else if (event.type === 'read' && event.userId !== myUserId) {
          const at = instant(event.readAt);
          setItems((prev) =>
            prev.map((i) =>
              i.senderUserId === myUserId && !i.read && !i.pending && instant(i.createdAt) <= at ? { ...i, read: true } : i,
            ),
          );
        } else if (event.type === 'accepted') {
          void chatApi
            .get(chat.id)
            .then(({ data }) => mounted.current && setSummary(data))
            .catch(() => undefined);
        }
      }),
    [myUserId, visible],
  );

  /** Seals with both current keys and runs `put`; a changed key on either side is fetched and sealed again, once. */
  const sealed = useCallback(async <T,>(content: ChatContent, put: (chat: ChatSummary, s: SealedForSend) => Promise<T>) => {
    const attempt = async (fresh: boolean): Promise<T> => {
      let chat = summaryRef.current;
      if (!chat) throw new Error('This chat is still loading.');
      if (fresh) {
        chatEngine.forgetPeer(chat.other.userId);
        const { data } = chat.id ? await chatApi.get(chat.id) : await chatApi.with(chat.other.userId);
        chat = data;
        summaryRef.current = data;
        setSummary(data);
      }
      return put(chat, await chatEngine.seal(content, chat.other.userId, chat.otherKey));
    };
    try {
      return await attempt(false);
    } catch (e) {
      const f = apiFailure(e);
      if (f.status === 409 && f.code === 'key-changed') return attempt(true);
      throw e;
    }
  }, []);

  const deliver = useCallback(
    (content: ChatContent): Promise<ChatMessage> =>
      sealed(content, async (chat, s) => {
        if (chat.id) return (await chatApi.send(chat.id, s)).data;
        const { data } = await chatApi.start({ userId: chat.other.userId, tripId: target.tripId, message: s });
        summaryRef.current = data.chat;
        if (mounted.current) setSummary(data.chat);
        if (!data.message) throw new Error('That message could not be sent.');
        return data.message;
      }),
    [sealed, target.tripId],
  );

  const run = useCallback(
    async (tempId: string, pending: NonNullable<ThreadItem['pending']>, isRetry: boolean) => {
      if (myUserId == null) return;
      const shown: ThreadItem = {
        id: tempId,
        senderUserId: myUserId,
        createdAt: new Date().toISOString(),
        read: false,
        nonce: null,
        editedAt: null,
        reactions: [],
        opened: { kind: 'text', ...pending.content },
        pending: { ...pending, state: 'sending', error: undefined },
      };
      setItems((prev) => (isRetry ? prev.map((i) => (i.id === tempId ? shown : i)) : [...prev, shown]));
      let content = pending.content;
      try {
        if (pending.photo && !content.photo) {
          const id = summaryRef.current?.id;
          if (!id) throw new Error('Say hello first, then send photos.');
          content = { ...content, photo: await uploadChatPhoto(id, pending.photo) };
        }
        const message = await deliver(content);
        chatEngine.rememberSent(message, content);
        if (!mounted.current) return;
        setItems((prev) => [...prev.filter((i) => i.id !== tempId && i.id !== message.id), toItem(message, { kind: 'text', ...content })]);
        const chat = summaryRef.current;
        if (chat?.id) {
          chatStore.upsert({
            ...chat,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            status: chat.status === 'none' ? 'accepted' : chat.status,
          });
        }
        if (chat?.id && chat.status === 'request' && !chat.requestedByMe) {
          // Replying to a request accepts it.
          void chatApi.get(chat.id).then(({ data }) => mounted.current && setSummary(data)).catch(() => undefined);
          void chatStore.refreshUnread();
        }
      } catch (e) {
        if (!mounted.current) return;
        const f = apiFailure(e, e instanceof Error ? e.message : 'That message could not be sent.');
        setItems((prev) =>
          prev.map((i) => (i.id === tempId ? { ...i, pending: { ...pending, content, state: 'failed', error: f.message } } : i)),
        );
        if (f.code === 'waiting' || f.code === 'no-key' || f.code === 'unavailable' || f.code === 'not-accepting') void load();
      }
    },
    [myUserId, deliver, load],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (text) await run(newTempId(), { content: { text }, state: 'sending' }, false);
    },
    [run],
  );

  const sendPhoto = useCallback(
    async (photo: PreparedPhoto, caption = '') => {
      await run(newTempId(), { content: { text: caption.trim().slice(0, MAX_MESSAGE_LENGTH) }, photo, state: 'sending' }, false);
    },
    [run],
  );

  const sendLocation = useCallback(
    async (location: LocationRef, note = '') => {
      await run(newTempId(), { content: { text: note.trim().slice(0, MAX_MESSAGE_LENGTH), location }, state: 'sending' }, false);
    },
    [run],
  );

  const retry = useCallback(
    async (item: ThreadItem) => {
      if (item.pending) await run(item.id, item.pending, true);
    },
    [run],
  );

  const discard = useCallback((id: string) => setItems((prev) => prev.filter((i) => i.id !== id)), []);

  /** New words for a message of the reader's (a photo's or place's caption included). Throws on failure. */
  const edit = useCallback(
    async (itemId: string, raw: string) => {
      const item = itemsRef.current.find((i) => i.id === itemId);
      if (!item || !summaryRef.current?.id || item.opened?.kind !== 'text') return;
      const text = raw.trim().slice(0, MAX_MESSAGE_LENGTH);
      const { photo, location } = item.opened;
      if (!text && !photo && !location) throw new Error("A message can't be empty.");
      const content: ChatContent = { text, ...(photo ? { photo } : {}), ...(location ? { location } : {}) };
      const message = await sealed(content, async (chat, s) => (await chatApi.edit(chat.id as string, itemId, s)).data);
      chatEngine.rememberSent(message, content);
      if (mounted.current) {
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...toItem(message, { kind: 'text', ...content }), read: i.read } : i)));
      }
    },
    [sealed],
  );

  /** Sets the reader's reaction; the same one again takes it back. Shown at once, undone if it fails. */
  const react = useCallback(
    async (itemId: string, emoji: string) => {
      const item = itemsRef.current.find((i) => i.id === itemId);
      const chatId = summaryRef.current?.id;
      if (!item || !chatId || myUserId == null || item.pending) return;
      const before = item.reactions;
      const mine = before.find((r) => r.userId === myUserId);
      const next = mine?.emoji === emoji ? null : emoji;
      const after = [...before.filter((r) => r.userId !== myUserId), ...(next ? [{ userId: myUserId, emoji: next }] : [])];
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, reactions: after } : i)));
      try {
        const { data } = next ? await chatApi.react(chatId, itemId, next) : await chatApi.unreact(chatId, itemId);
        if (mounted.current && data?.reactions) {
          setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, reactions: data.reactions ?? [] } : i)));
        }
      } catch (e) {
        if (mounted.current) setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, reactions: before } : i)));
        throw e;
      }
    },
    [myUserId],
  );

  const runBusy = useCallback(async (kind: 'accept' | 'decline' | 'invite', action: () => Promise<void>) => {
    setBusy(kind);
    try {
      await action();
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, []);

  /** A request with no message: for someone who can't receive encrypted messages yet. */
  const invite = useCallback(
    () =>
      runBusy('invite', async () => {
        const chat = summaryRef.current;
        if (!chat || chat.id) return;
        const { data } = await chatApi.start({ userId: chat.other.userId, tripId: target.tripId });
        if (mounted.current) setSummary(data.chat);
        chatStore.upsert(data.chat);
      }),
    [runBusy, target.tripId],
  );

  const accept = useCallback(
    () =>
      runBusy('accept', async () => {
        const id = summaryRef.current?.id;
        if (!id) return;
        await chatApi.accept(id);
        const { data } = await chatApi.get(id);
        if (mounted.current) setSummary(data);
        chatStore.upsert(data);
        void chatStore.refreshUnread();
      }),
    [runBusy],
  );

  const decline = useCallback(
    () =>
      runBusy('decline', async () => {
        const id = summaryRef.current?.id;
        if (!id) return;
        await chatApi.decline(id);
        chatStore.remove(id);
        void chatStore.refreshUnread();
      }),
    [runBusy],
  );

  const clear = useCallback(async () => {
    const id = summaryRef.current?.id;
    if (!id) return;
    await chatApi.clear(id);
    chatStore.remove(id);
    void chatStore.refreshUnread();
  }, []);

  /** Reports the chat with the last messages this browser can read, which is all anyone can see of it. */
  const report = useCallback(
    async (reason: ChatReportReason, block: boolean) => {
      const chat = summaryRef.current;
      if (!chat?.id) return;
      const excerpt: ChatExcerptLine[] = items
        .filter((i) => !i.pending && (i.opened?.kind === 'text' || i.opened?.kind === 'plain'))
        .slice(-20)
        .map((i) => ({ senderUserId: i.senderUserId, text: excerptText(i.opened), sentAt: i.createdAt }));
      await chatApi.report(chat.id, { reason, excerpt, block });
      if (chat.status === 'request' && !chat.requestedByMe) chatStore.remove(chat.id);
      void chatStore.refreshUnread();
    },
    [items],
  );

  const typing = useCallback(() => {
    const chat = summaryRef.current;
    if (!chat?.id || chat.status !== 'accepted') return;
    const now = Date.now();
    if (now - lastTyping.current > TYPING_EVERY_MS) {
      lastTyping.current = now;
      sendChatTyping(chat.id);
    }
  }, []);

  return {
    summary,
    items,
    status,
    error,
    hasOlder,
    loadingOlder,
    busy,
    keyStatus,
    reload: load,
    loadOlder,
    send,
    sendPhoto,
    sendLocation,
    retry,
    discard,
    edit,
    react,
    invite,
    accept,
    decline,
    clear,
    report,
    typing,
  };
}
