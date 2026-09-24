import { useState, useCallback, useRef, useEffect } from 'react';
import { streamTripicianAIResponse } from './tripicianAIService';
import { loadTripicianAIMessages, saveTripicianAIMessages, clearTripicianAISession } from './tripicianAISessionStorage';

export interface TripicianAIMessage {
  id: string;
  role: 'user' | 'tripicianai';
  content: string;
  isStreaming?: boolean;
  timestamp: Date;
}

export interface UseTripicianAIReturn {
  messages: TripicianAIMessage[];
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useTripicianAI(tripId: string, token?: string | null): UseTripicianAIReturn {
  const sessionKey = tripId || 'general';
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

      const userMsg: TripicianAIMessage = {
        id: Date.now() + '_u',
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };
      const tripicianAIId = Date.now() + '_n';
      const tripicianAIPlaceholder: TripicianAIMessage = {
        id: tripicianAIId,
        role: 'tripicianai',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMsg, tripicianAIPlaceholder]);
      setIsStreaming(true);
      isStreamingRef.current = true;

      try {
        const priorHistory = messagesRef.current
          .filter(m => !m.isStreaming && m.content.trim())
          .slice(-20)
          .map(m => ({
            role: m.role,
            content: m.content,
          }));
        const gen = streamTripicianAIResponse(tripId, text.trim(), token, priorHistory);
        generatorRef.current = gen;

        for await (const chunk of gen) {
          setMessages(prev =>
            prev.map(m =>
              m.id === tripicianAIId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        }
        // Signal to DestinationCard that TripicianAI has responded
        window.dispatchEvent(new CustomEvent('tripicianai:response'));
      } catch {
        // Generator error (unexpected - tripicianAIService already handles HTTP errors gracefully)
        setMessages(prev =>
          prev.map(m =>
            m.id === tripicianAIId
                ? { ...m, content: "😅 Oops, something unexpected happened. Give it another shot!", isStreaming: false }
              : m,
          ),
        );
      } finally {
        setMessages(prev =>
          prev.map(m =>
            m.id === tripicianAIId ? { ...m, isStreaming: false } : m,
          ),
        );
        setIsStreaming(false);
        isStreamingRef.current = false;
        generatorRef.current = null;
      }
    },
    [tripId, token],
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

  return { messages, isStreaming, sendMessage, clearMessages };
}
