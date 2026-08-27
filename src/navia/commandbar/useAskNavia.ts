import React from 'react';
import { streamNaviaResponse, type NaviaHistoryMessage } from '../naviaService';
import { afterStoryService } from '../../afterstory/afterStoryService';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import type { AskTurn } from './CommandResultPanel';

/** Streams general-chat and pulls matching published stories alongside it. */
export function useAskNavia(token?: string | null) {
  const [turns, setTurns] = React.useState<AskTurn[]>([]);
  const [stories, setStories] = React.useState<AfterStorySummaryDto[]>([]);
  const [citationsLoading, setCitationsLoading] = React.useState(false);
  const [streaming, setStreaming] = React.useState(false);
  const clear = React.useCallback(() => {
    setTurns([]);
    setStories([]);
    setCitationsLoading(false);
  }, []);
  const ask = React.useCallback(async (question: string) => {
    setStreaming(true);
    setTurns((prev) => [...prev, { question, answer: '', streaming: true }]);
    // Citations run beside the stream, never gate it.
    setCitationsLoading(true);
    void afterStoryService
      .listPublished({ q: question, pageSize: 8 })
      .then((r) => setStories(Array.isArray(r?.items) ? r.items : []))
      .catch(() => setStories([]))
      .finally(() => setCitationsLoading(false));
    const history: NaviaHistoryMessage[] = turns.flatMap((t) => [
      { role: 'user' as const, content: t.question },
      { role: 'navia' as const, content: t.answer },
    ]);
    try {
      for await (const chunk of streamNaviaResponse('', question, token, history)) {
        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last) next[next.length - 1] = { ...last, answer: last.answer + chunk };
          return next;
        });
      }
    } finally {
      setTurns((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last) next[next.length - 1] = { ...last, streaming: false };
        return next;
      });
      setStreaming(false);
    }
  }, [token, turns]);
  return { turns, stories, citationsLoading, streaming, ask, clear };
}
