import { useState, useCallback, useRef, useEffect } from 'react';
import { streamNaviaResponse } from './naviaService';

export interface NaviaMessage {
  id: string;
  role: 'user' | 'navia';
  content: string;
  isStreaming?: boolean;
  timestamp: Date;
}

export interface UseNaviaReturn {
  messages: NaviaMessage[];
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useNavia(tripId: string, token?: string | null): UseNaviaReturn {
  const [messages, setMessages] = useState<NaviaMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  // Keep isStreaming in a ref so the event handler closure always has fresh value
  const isStreamingRef = useRef(false);
  const generatorRef = useRef<AsyncGenerator<string> | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreamingRef.current) return;

      const userMsg: NaviaMessage = {
        id: Date.now() + '_u',
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };
      const naviaId = Date.now() + '_n';
      const naviaPlaceholder: NaviaMessage = {
        id: naviaId,
        role: 'navia',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMsg, naviaPlaceholder]);
      setIsStreaming(true);
      isStreamingRef.current = true;

      try {
        const gen = streamNaviaResponse(tripId, text.trim(), token);
        generatorRef.current = gen;

        for await (const chunk of gen) {
          setMessages(prev =>
            prev.map(m =>
              m.id === naviaId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        }
        // Signal to DestinationCard that Navia has responded
        window.dispatchEvent(new CustomEvent('navia:response'));
      } catch {
        // Generator error (unexpected — naviaService already handles HTTP errors gracefully)
        setMessages(prev =>
          prev.map(m =>
            m.id === naviaId
                ? { ...m, content: "😅 Oops, something unexpected happened. Give it another shot!", isStreaming: false }
              : m,
          ),
        );
      } finally {
        setMessages(prev =>
          prev.map(m =>
            m.id === naviaId ? { ...m, isStreaming: false } : m,
          ),
        );
        setIsStreaming(false);
        isStreamingRef.current = false;
        generatorRef.current = null;
      }
    },
    [tripId, token],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  // Listen for custom events dispatched by DestinationCard / other components
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<{ message: string }>).detail?.message;
      if (msg) sendMessage(msg);
    };
    window.addEventListener('navia:send', handler);
    window.addEventListener('navia:prompt', handler);
    return () => {
      window.removeEventListener('navia:send', handler);
      window.removeEventListener('navia:prompt', handler);
    };
  }, [sendMessage]);

  return { messages, isStreaming, sendMessage, clearMessages };
}
