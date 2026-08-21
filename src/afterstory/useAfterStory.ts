/**
 * Load, edit and autosave one story.
 *
 * Autosave is debounced and always sends the whole story. Block reordering makes
 * a field-level diff more expensive to get right than it is worth at this size,
 * and a full write keeps the server's rebuild-from-scratch validation honest.
 *
 * The version number is the important part. Two tabs open on the same story is
 * the normal case for a story with several admins, and silently losing the older tab's
 * work is the failure mode worth spending a round trip on.
 */

import React from 'react';
import { afterStoryService, AfterStoryError, draftFromDto } from './afterStoryService';
import { parseBlocks, serializeBlocks } from './blockSchema';
import type { AfterStoryDto, StoryBlock, StoryDraft, StoryStatus } from './types';

const AUTOSAVE_DELAY_MS = 1200;

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export interface UseAfterStoryResult {
  story: AfterStoryDto | null;
  draft: StoryDraft | null;
  loading: boolean;
  loadError: string | null;
  saveState: SaveState;
  saveError: string | null;
  lastSavedAt: Date | null;

  update: (patch: Partial<StoryDraft>) => void;
  setBlocks: (next: StoryBlock[] | ((prev: StoryBlock[]) => StoryBlock[])) => void;
  /**
   * Accepts a server story after a side change (contributors, and anything else
   * that returns the whole story without touching its body). Only the metadata
   * and version are adopted; the working draft is left alone, because replacing
   * it would discard whatever is being typed right now.
   */
  applyStory: (next: AfterStoryDto) => void;
  saveNow: () => Promise<void>;
  setStatus: (status: StoryStatus) => Promise<void>;
  attachTrip: (tripId: string | null) => Promise<void>;
  reload: () => Promise<void>;
}

export function useAfterStory(storyIdOrSlug: string | null | undefined): UseAfterStoryResult {
  const [story, setStory] = React.useState<AfterStoryDto | null>(null);
  const [draft, setDraft] = React.useState<StoryDraft | null>(null);
  const [loading, setLoading] = React.useState(Boolean(storyIdOrSlug));
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<SaveState>('idle');
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);

  // Held in refs so the debounce timer always reads current values without
  // being torn down and rebuilt on every keystroke.
  const draftRef = React.useRef<StoryDraft | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = React.useRef(false);
  const lastSavedSignature = React.useRef<string>('');

  draftRef.current = draft;

  const load = React.useCallback(async () => {
    if (!storyIdOrSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const dto = await afterStoryService.get(storyIdOrSlug);
      const next = draftFromDto(dto, parseBlocks(dto.bodyJson));
      setStory(dto);
      setDraft(next);
      lastSavedSignature.current = signature(next);
      setSaveState('idle');
    } catch (err) {
      setLoadError(err instanceof AfterStoryError ? err.message : 'Could not load that story.');
    } finally {
      setLoading(false);
    }
  }, [storyIdOrSlug]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const flush = React.useCallback(async () => {
    const current = draftRef.current;
    if (!current || savingRef.current) return;

    const next = signature(current);
    if (next === lastSavedSignature.current) {
      setSaveState('saved');
      return;
    }

    savingRef.current = true;
    setSaveState('saving');
    setSaveError(null);

    try {
      const dto = await afterStoryService.save(current);
      setStory(dto);
      // Only the version is adopted from the response. Replacing the whole draft
      // would discard anything typed while the request was in flight.
      setDraft((prev) => (prev ? { ...prev, version: dto.version } : prev));
      lastSavedSignature.current = next;
      setLastSavedAt(new Date());
      setSaveState('saved');
    } catch (err) {
      const error = err instanceof AfterStoryError ? err : null;
      setSaveError(error?.message ?? 'Could not save your story.');
      setSaveState(error?.conflict ? 'conflict' : 'error');
    } finally {
      savingRef.current = false;
    }
  }, []);

  const schedule = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState('dirty');
    timerRef.current = setTimeout(() => {
      void flush();
    }, AUTOSAVE_DELAY_MS);
  }, [flush]);

  const update = React.useCallback(
    (patch: Partial<StoryDraft>) => {
      setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
      schedule();
    },
    [schedule],
  );

  const setBlocks = React.useCallback(
    (next: StoryBlock[] | ((prev: StoryBlock[]) => StoryBlock[])) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const blocks = typeof next === 'function' ? next(prev.blocks) : next;
        return { ...prev, blocks };
      });
      schedule();
    },
    [schedule],
  );

  const applyStory = React.useCallback((next: AfterStoryDto) => {
    setStory(next);
    setDraft((prev) => (prev ? { ...prev, version: next.version } : prev));
  }, []);

  const saveNow = React.useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await flush();
  }, [flush]);

  const setStatus = React.useCallback(
    async (status: StoryStatus) => {
      const current = draftRef.current;
      if (!current) return;

      // Publishing a story whose last edits are still queued would put a stale
      // version in front of readers, so the pending save goes first.
      await saveNow();

      try {
        const dto = await afterStoryService.setStatus(current.id, status);
        setStory(dto);
        setDraft((prev) => (prev ? { ...prev, version: dto.version } : prev));
      } catch (err) {
        setSaveError(err instanceof AfterStoryError ? err.message : 'Could not change who can see this story.');
        setSaveState('error');
        throw err;
      }
    },
    [saveNow],
  );

  const attachTrip = React.useCallback(async (tripId: string | null) => {
    const current = draftRef.current;
    if (!current) return;
    try {
      const dto = await afterStoryService.attachTrip(current.id, tripId);
      setStory(dto);
      setDraft((prev) => (prev ? { ...prev, version: dto.version } : prev));
    } catch (err) {
      setSaveError(err instanceof AfterStoryError ? err.message : 'Could not attach that trip.');
      setSaveState('error');
      throw err;
    }
  }, []);

  // A tab closing mid-edit loses at most the debounce window. Nothing here can
  // await, so this is a best effort flush rather than a guarantee.
  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && saveStateIsPending()) void flush();
    };
    const saveStateIsPending = () =>
      draftRef.current !== null && signature(draftRef.current) !== lastSavedSignature.current;

    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flush]);

  return {
    story,
    draft,
    loading,
    loadError,
    saveState,
    saveError,
    lastSavedAt,
    update,
    setBlocks,
    applyStory,
    saveNow,
    setStatus,
    attachTrip,
    reload: load,
  };
}

/**
 * What a save would send. Comparing this rather than a dirty flag means moving a
 * block and moving it back counts as no change, and an autosave that would be a
 * no-op never leaves the browser.
 */
function signature(draft: StoryDraft): string {
  return JSON.stringify([
    draft.title,
    draft.summary,
    draft.destination,
    draft.countries,
    draft.travelStartDate,
    draft.travelEndDate,
    draft.vibe,
    draft.template,
    draft.coverKind,
    draft.coverImageUrl,
    draft.coverVideoProvider,
    draft.coverVideoId,
    serializeBlocks(draft.blocks),
  ]);
}
