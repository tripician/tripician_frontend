import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useRequireAuth } from '../../auth/AuthGate';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { apiServices } from '../../services/APIs/apiServices';
import { draftTripFromPrompt, NaviaRequestError } from '../naviaService';
import { usePlanImport } from '../usePlanImport';
import { createTripAndOpen } from '../createTripAndOpen';
import { takeDraftWithMeta } from '../../utils/pendingDraft';
import { resolveIntent, type ResolvedMode } from './resolveIntent';
import { COMMAND_MODES, type CommandMode } from './commandModes';

export const COMMAND_BAR_DRAFT_KEY = 'navia-command-bar';

const PLAN_MESSAGES = [
  'Reading your request…',
  'Choosing where to go…',
  'Setting up your trip…',
];

/** Local yyyy-MM-dd. `toISOString` would shift the day for anyone west of UTC. */
function toIsoDate(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Status text the bar shows while a mode runs, mapped away from the emoji copy. */
function messageForError(err: unknown): string {
  if (err instanceof NaviaRequestError) {
    if (err.status === 402) return 'You are out of Navia credits.';
    if (err.status === 429) return 'Navia has hit its hourly limit. Try again shortly.';
    return err.message;
  }
  return 'That did not work. Please try again.';
}

export interface StorySeed {
  tripId?: string;
  title?: string;
  destination?: string;
  countries?: string[];
  vibe?: string | null;
}

export function useCommandBar() {
  const { token } = useAuthToken();
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const importer = usePlanImport(token);

  const [mode, setMode] = React.useState<CommandMode>('auto');
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [busyMsg, setBusyMsg] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [storySeed, setStorySeed] = React.useState<StorySeed | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const storyEnabled = FEATURE_FLAGS.afterStory;
  const hasImages = importer.screenshots.length > 0;

  const resolution = React.useMemo(
    () => resolveIntent(text, hasImages, storyEnabled),
    [text, hasImages, storyEnabled],
  );
  const effectiveMode: ResolvedMode = mode === 'auto' ? resolution.mode : (mode as ResolvedMode);

  // A mode that cannot take pictures must not silently keep the ones already attached.
  React.useEffect(() => {
    if (hasImages && !COMMAND_MODES[effectiveMode].acceptsImages) importer.clearScreenshots();
  }, [effectiveMode, hasImages, importer]);

  const rotate = React.useCallback((messages: string[]) => {
    let i = 0;
    setBusyMsg(messages[0]);
    timerRef.current = setInterval(() => {
      i = (i + 1) % messages.length;
      setBusyMsg(messages[i]);
    }, 1800);
  }, []);

  const stopRotating = React.useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setBusyMsg('');
  }, []);

  const takeFiles = React.useCallback((files: File[]) => {
    // A screenshot cannot be parked in sessionStorage, so sign-in has to come first.
    if (!requireAuth({ reason: 'Sign in to let Navia read your screenshots.' })) return;
    importer.addFiles(files);
  }, [importer, requireAuth]);

  /** Restores a sentence typed before sign-in. Destructive, so it runs once. */
  React.useEffect(() => {
    const restored = takeDraftWithMeta(COMMAND_BAR_DRAFT_KEY);
    if (!restored) return;
    setText(restored.text);
    // Auto re-derives from the text, so meta only matters after a manual override.
    if (restored.meta && restored.meta in COMMAND_MODES) setMode(restored.meta as CommandMode);
  }, []);

  const runPlan = React.useCallback(async (prompt: string) => {
    if (!token) return;
    setError(null);
    setBusy(true);
    rotate(PLAN_MESSAGES);
    try {
      const draft = await draftTripFromPrompt(prompt, token);
      const start = draft.startDate
        ? new Date(`${draft.startDate}T00:00:00`)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + Math.max(1, draft.nights) * 24 * 60 * 60 * 1000);

      await createTripAndOpen({
        token,
        navigate,
        state: { aiGenerated: true },
        payload: {
          name: draft.name,
          description: '',
          countries: draft.countries,
          startDate: toIsoDate(start),
          endDate: toIsoDate(end),
          visibility: 0, // trips start private; publishing is an explicit later step
          currencyCode: 'USD',
          vibe: draft.vibe ?? '',
          invites: [] as string[],
          plannerMode: 'Easy', // every new trip opens in the simple planner
        },
      });
    } catch (err) {
      setError(messageForError(err));
      setBusy(false);
    } finally {
      stopRotating();
    }
  }, [navigate, rotate, stopRotating, token]);

  /** Matches the sentence against the traveller's own trips so the composer opens filled. */
  const runStory = React.useCallback(async (prompt: string) => {
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      const resp = await apiServices.getDashboardTrips(token);
      const trips: any[] = Array.isArray(resp?.data) ? resp.data : (resp?.data?.trips ?? []);
      const lower = prompt.toLowerCase();
      const hit = trips.find((t) => {
        const name = String(t?.name ?? t?.Name ?? '').toLowerCase();
        return name.length > 2 && lower.includes(name);
      }) ?? trips.find((t) => {
        const countries: string[] = t?.countries ?? t?.Countries ?? [];
        return countries.some((c) => c && lower.includes(String(c).toLowerCase()));
      });

      setStorySeed(hit
        ? {
            tripId: String(hit.id ?? hit.Id ?? hit.tripId),
            destination: (hit.countries ?? hit.Countries ?? [])[0],
            countries: hit.countries ?? hit.Countries ?? [],
            vibe: hit.vibe ?? hit.Vibe ?? null,
          }
        : {});
    } catch {
      // A trips outage must not block writing. Open the composer blank instead.
      setStorySeed({});
    } finally {
      setBusy(false);
    }
  }, [token]);

  const clearStorySeed = React.useCallback(() => setStorySeed(null), []);

  const reset = React.useCallback(() => {
    setText('');
    setError(null);
    importer.clearScreenshots();
  }, [importer]);

  return {
    mode,
    setMode,
    effectiveMode,
    text,
    setText,
    importer,
    hasImages,
    takeFiles,
    busy: busy || importer.busy,
    busyMsg: importer.busy ? importer.busyMessage : busyMsg,
    error: error ?? importer.error,
    setError,
    storyEnabled,
    storySeed,
    clearStorySeed,
    runPlan,
    runStory,
    reset,
    token,
    requireAuth,
  };
}
