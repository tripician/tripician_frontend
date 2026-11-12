import { useState, useCallback, useRef, useEffect } from 'react';
import {
  streamTripicianAIResponse,
  type TripicianAINewsSource,
  type TripicianAIStage,
} from './tripicianAIService';
import { loadTripicianAIMessages, saveTripicianAIMessages, clearTripicianAISession } from './tripicianAISessionStorage';
import { createStagePacer, type StagePacer } from './stagePacer';

/**
 * The offer under a plan to make it a trip. `open` until they answer;
 * `creating` while the trip is made; `done` or `dismissed` after.
 */
export interface TripicianAIOffer {
  kind: 'trip';
  title?: string;
  state: 'open' | 'creating' | 'done' | 'dismissed';
}

export interface TripicianAIMessage {
  id: string;
  role: 'user' | 'tripicianai';
  content: string;
  isStreaming?: boolean;
  timestamp: Date;
  /** Staged answers: the steps taken, in order. The last is current while thinking. */
  steps?: TripicianAIStage[];
  /** Staged answers: how long it thought before the first words appeared. */
  thinkingMs?: number;
  sources?: TripicianAINewsSource[];
  offer?: TripicianAIOffer;
}

export interface UseTripicianAIReturn {
  messages: TripicianAIMessage[];
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  /** Moves a plan offer along (creating, done, dismissed). */
  updateOffer: (messageId: string, patch: Partial<TripicianAIOffer>) => void;
}

/**
 * A TripicianAI conversation. With no tripId it is the general chat, which asks
 * for the staged answer: the server announces each step it takes (reading the
 * message, the traveler's pattern, timing, live data, news), streams a decorated
 * answer and offers to turn a plan into a trip. The pacer keeps each step on
 * screen long enough to read.
 */
export function useTripicianAI(tripId: string, token?: string | null): UseTripicianAIReturn {
  const sessionKey = tripId || 'general';
  const staged = !tripId;
  const [messages, setMessages] = useState<TripicianAIMessage[]>(() => loadTripicianAIMessages(sessionKey));
  const [isStreaming, setIsStreaming] = useState(false);
  // Keep isStreaming in a ref so the event handler closure always has fresh value
  const isStreamingRef = useRef(false);
  const generatorRef = useRef<AsyncGenerator<string> | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreamingRef.current) return;

      const startedAt = Date.now();
      const userMsg: TripicianAIMessage = {
        id: startedAt + '_u',
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };
      const tripicianAIId = startedAt + '_n';
      const tripicianAIPlaceholder: TripicianAIMessage = {
        id: tripicianAIId,
        role: 'tripicianai',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
        ...(staged ? { steps: [] } : {}),
      };

      setMessages(prev => [...prev, userMsg, tripicianAIPlaceholder]);
      setIsStreaming(true);
      isStreamingRef.current = true;

      const update = (mutator: (m: TripicianAIMessage) => TripicianAIMessage) =>
        setMessages(prev => prev.map(m => (m.id === tripicianAIId ? mutator(m) : m)));

      const pacer: StagePacer = createStagePacer({
        onSteps: steps => update(m => ({ ...m, steps })),
        onText: chunk =>
          update(m => ({
            ...m,
            content: m.content + chunk,
            // The first words end the thinking.
            ...(staged && m.thinkingMs === undefined ? { thinkingMs: Date.now() - startedAt } : {}),
          })),
      });

      // Both arrive after the text; they are attached once it has all been shown.
      let offer: TripicianAIOffer | undefined;
      let sources: TripicianAINewsSource[] | undefined;

      try {
        const priorHistory = messagesRef.current
          .filter(m => !m.isStreaming && m.content.trim())
          .slice(-20)
          .map(m => ({
            role: m.role,
            content: m.content,
          }));
        const gen = streamTripicianAIResponse(tripId, text.trim(), token, priorHistory, {
          staged,
          onStage: stage => pacer.pushStep(stage),
          onOffer: next => {
            offer = { ...next, state: 'open' };
          },
          onSources: next => {
            sources = next;
          },
        });
        generatorRef.current = gen;

        for await (const chunk of gen) {
          pacer.pushText(chunk);
        }
        // Let every step and word be shown before the turn ends.
        await new Promise<void>(resolve => pacer.finish(resolve));
        update(m => ({
          ...m,
          ...(offer && m.content.trim() ? { offer } : {}),
          ...(sources ? { sources } : {}),
        }));
        // Signal to DestinationCard that TripicianAI has responded
        window.dispatchEvent(new CustomEvent('tripicianai:response'));
      } catch {
        pacer.flush();
        // Generator error (unexpected - tripicianAIService already handles HTTP errors gracefully)
        update(m => ({ ...m, content: "😅 Oops, something unexpected happened. Give it another shot!", isStreaming: false }));
      } finally {
        pacer.flush();
        update(m => ({ ...m, isStreaming: false }));
        setIsStreaming(false);
        isStreamingRef.current = false;
        generatorRef.current = null;
      }
    },
    [tripId, token, staged],
  );

  // Tracks which session the in-memory messages belong to. Without this guard,
  // switching trips ran the save effect with the NEW key while `messages` still
  // held the OLD session's transcript, bleeding history across trips.
  const loadedKeyRef = useRef(sessionKey);

  useEffect(() => {
    if (loadedKeyRef.current !== sessionKey) return;
    saveTripicianAIMessages(sessionKey, messages);
  }, [messages, sessionKey]);

  useEffect(() => {
    setMessages(loadTripicianAIMessages(sessionKey));
    loadedKeyRef.current = sessionKey;
  }, [sessionKey]);

  const clearMessages = useCallback(() => {
    clearTripicianAISession(sessionKey);
    setMessages([]);
  }, [sessionKey]);

  const updateOffer = useCallback((messageId: string, patch: Partial<TripicianAIOffer>) => {
    setMessages(prev =>
      prev.map(m => (m.id === messageId && m.offer ? { ...m, offer: { ...m.offer, ...patch } } : m)),
    );
  }, []);

  // Listen for custom events dispatched by DestinationCard / other components
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<{ message: string }>).detail?.message;
      if (msg) sendMessage(msg);
    };
    window.addEventListener('tripicianai:send', handler);
    window.addEventListener('tripicianai:prompt', handler);
    return () => {
      window.removeEventListener('tripicianai:send', handler);
      window.removeEventListener('tripicianai:prompt', handler);
    };
  }, [sendMessage]);

  return { messages, isStreaming, sendMessage, clearMessages, updateOffer };
}
