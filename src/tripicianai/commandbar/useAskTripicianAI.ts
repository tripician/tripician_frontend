import React from 'react';
import {
  streamTripicianAIResponse,
  type TripicianAIHistoryMessage,
  type TripicianAINewsSource,
} from '../tripicianAIService';
import { createStagePacer } from '../stagePacer';
import { afterStoryService } from '../../afterstory/afterStoryService';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import type { TripicianAIOffer } from '../useTripicianAI';
import type { AskTurn } from './CommandResultPanel';

/**
 * Streams the staged general chat (steps, a decorated answer, the plan offer)
 * and pulls matching published stories alongside it.
 */
export function useAskTripicianAI(token?: string | null) {
  const [turns, setTurns] = React.useState<AskTurn[]>([]);
  const [stories, setStories] = React.useState<AfterStorySummaryDto[]>([]);
  const [citationsLoading, setCitationsLoading] = React.useState(false);
  const [streaming, setStreaming] = React.useState(false);
  const clear = React.useCallback(() => {
    setTurns([]);
    setStories([]);
    setCitationsLoading(false);
  }, []);

  const updateLast = React.useCallback((mutator: (turn: AskTurn) => AskTurn) => {
    setTurns((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last) next[next.length - 1] = mutator(last);
      return next;
    });
  }, []);

  const updateOffer = React.useCallback((index: number, patch: Partial<TripicianAIOffer>) => {
    setTurns((prev) => prev.map((turn, i) => (i === index && turn.offer ? { ...turn, offer: { ...turn.offer, ...patch } } : turn)));
  }, []);

  const ask = React.useCallback(async (question: string) => {
    setStreaming(true);
    const startedAt = Date.now();
    setTurns((prev) => [...prev, { question, answer: '', streaming: true, steps: [] }]);
    // Citations run beside the stream, never gate it.
    setCitationsLoading(true);
    void afterStoryService
      .listPublished({ q: question, pageSize: 8 })
      .then((r) => setStories(Array.isArray(r?.items) ? r.items : []))
      .catch(() => setStories([]))
      .finally(() => setCitationsLoading(false));
    const history: TripicianAIHistoryMessage[] = turns.flatMap((t) => [
      { role: 'user' as const, content: t.question },
      { role: 'tripicianai' as const, content: t.answer },
    ]);

    const pacer = createStagePacer({
      onSteps: (steps) => updateLast((turn) => ({ ...turn, steps })),
      onText: (chunk) =>
        updateLast((turn) => ({
          ...turn,
          answer: turn.answer + chunk,
          ...(turn.thinkingMs === undefined ? { thinkingMs: Date.now() - startedAt } : {}),
        })),
    });
    let offer: TripicianAIOffer | undefined;
    let sources: TripicianAINewsSource[] | undefined;

    try {
      for await (const chunk of streamTripicianAIResponse('', question, token, history, {
        staged: true,
        onStage: (stage) => pacer.pushStep(stage),
        onOffer: (next) => {
          offer = { ...next, state: 'open' };
        },
        onSources: (next) => {
          sources = next;
        },
      })) {
        pacer.pushText(chunk);
      }
      await new Promise<void>((resolve) => pacer.finish(resolve));
      updateLast((turn) => ({
        ...turn,
        ...(offer && turn.answer.trim() ? { offer } : {}),
        ...(sources ? { sources } : {}),
      }));
    } finally {
      pacer.flush();
      updateLast((turn) => ({ ...turn, streaming: false }));
      setStreaming(false);
    }
  }, [token, turns, updateLast]);
  return { turns, stories, citationsLoading, streaming, ask, clear, updateOffer };
}
