import React from 'react';
import { useNavigate } from 'react-router-dom';
import { importPlan, IMPORT_MAX_IMAGES, NaviaRequestError } from './naviaService';
import { downscaleImage, DownscaleError } from '../utils/downscaleImage';
import { createTripAndOpen } from './createTripAndOpen';
import { composeImportantNotes } from '../pages/CreateTripPage/planSeed';

/* What the traveller sees while their plan is being read. Long enough to cover a
   vision call over several screenshots, and honest about which part is running. */
const IMPORT_MESSAGES = [
  'Reading your screenshots…',
  'Picking out the places…',
  'Working out the days…',
  'Sorting your notes and checklist…',
  'Putting your plan together…',
];

const TEXT_MESSAGES = [
  'Reading your plan…',
  'Picking out the places…',
  'Working out the days…',
  'Putting your plan together…',
];

export interface PendingScreenshot {
  id: string;
  /** Object URL for the thumbnail. Revoked on removal and on unmount. */
  previewUrl: string;
  dataUrl: string;
  name: string;
}

/** Local yyyy-MM-dd. `toISOString` would shift the day for anyone west of UTC. */
function toIsoDate(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Turning a plan somebody already wrote into a trip here.
 *
 * Screenshots are downscaled in the browser and sent inside the request as
 * base64. They are never uploaded, so nothing about a group chat outlives the
 * call that reads it - which is the reason this does not use `signedUpload` like
 * every other picture in the app.
 *
 * What comes back is handed to the planner as a seed, so an imported plan gets
 * the same geocoding and the same Places verification as any other, and every
 * place carries an honest provenance mark rather than being asserted because a
 * screenshot said so.
 */
export function usePlanImport(token?: string | null) {
  const navigate = useNavigate();
  const [screenshots, setScreenshots] = React.useState<PendingScreenshot[]>([]);
  const [preparing, setPreparing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [busyMessage, setBusyMessage] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Object URLs are a real leak if the component goes away mid-compose.
  const screenshotsRef = React.useRef(screenshots);
  screenshotsRef.current = screenshots;
  React.useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    screenshotsRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
  }, []);

  const addFiles = React.useCallback(async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) return;

    setError(null);
    setPreparing(true);
    try {
      const room = IMPORT_MAX_IMAGES - screenshotsRef.current.length;
      if (room <= 0) {
        setError(`Up to ${IMPORT_MAX_IMAGES} screenshots at a time.`);
        return;
      }
      if (images.length > room) {
        setError(`Only the first ${room} added: ${IMPORT_MAX_IMAGES} screenshots at a time.`);
      }

      const accepted: PendingScreenshot[] = [];
      for (const file of images.slice(0, room)) {
        try {
          accepted.push({
            id: `${Date.now()}-${accepted.length}-${file.name}`,
            previewUrl: URL.createObjectURL(file),
            dataUrl: await downscaleImage(file),
            name: file.name,
          });
        } catch (err) {
          setError(err instanceof DownscaleError ? err.message : 'That image could not be read.');
        }
      }
      if (accepted.length > 0) setScreenshots((prev) => [...prev, ...accepted]);
    } finally {
      setPreparing(false);
    }
  }, []);

  // Revoking outside the updater: StrictMode can invoke an updater twice, and a
  // state setter is not the place to do anything the world can notice.
  const removeScreenshot = React.useCallback((id: string) => {
    const target = screenshotsRef.current.find((s) => s.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setScreenshots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearScreenshots = React.useCallback(() => {
    screenshotsRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    screenshotsRef.current = [];
    setScreenshots([]);
  }, []);

  /**
   * Reads what has been attached and opens the resulting trip in the planner.
   * Returns false when it did not run or did not succeed, so a caller can fall
   * back to whatever it does with plain text.
   */
  const run = React.useCallback(async (text: string): Promise<boolean> => {
    const images = screenshotsRef.current.map((s) => s.dataUrl);
    const pasted = text.trim();
    if (images.length === 0 && !pasted) return false;
    if (busy || !token) return false;

    setError(null);
    setBusy(true);
    const messages = images.length > 0 ? IMPORT_MESSAGES : TEXT_MESSAGES;
    let i = 0;
    setBusyMessage(messages[0]);
    timerRef.current = setInterval(() => {
      i = (i + 1) % messages.length;
      setBusyMessage(messages[i]);
    }, 2200);

    try {
      const plan = await importPlan(images, pasted, token);

      const nights = plan.stops.reduce((total, s) => total + Math.max(1, s.nights), 0);
      // No date in the plan means the plan did not state one, and guessing at a
      // real date would be putting words in it. A month out is the same neutral
      // placeholder the one-sentence path uses, and the planner needs a span.
      const start = plan.startDate
        ? new Date(`${plan.startDate}T00:00:00`)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + Math.max(1, nights) * 24 * 60 * 60 * 1000);

      await createTripAndOpen({
        token,
        navigate,
        beforeNavigate: clearScreenshots,
        state: {
          planSeed: {
            stops: plan.stops,
            importantNotes: composeImportantNotes(plan.importantNotes, plan.unplaced),
            checklist: plan.checklist,
            budget: plan.budget,
            expenses: plan.expenses,
          },
        },
        payload: {
          name: plan.name || 'My imported plan',
          description: '',
          countries: plan.countries,
          startDate: toIsoDate(start),
          endDate: toIsoDate(end),
          visibility: 0, // trips start private; publishing is an explicit later step
          currencyCode: plan.currency || 'USD',
          vibe: plan.vibe ?? '',
          invites: [] as string[],
          plannerMode: 'Easy',
        },
      });
      return true;
    } catch (err) {
      if (err instanceof NaviaRequestError) {
        setError(err.status === 402 ? 'You are out of Navia credits.' : err.message);
      } else {
        setError('Could not read that plan. Please try again.');
      }
      setBusy(false);
      return false;
    } finally {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [busy, clearScreenshots, navigate, token]);

  return {
    screenshots,
    addFiles,
    removeScreenshot,
    clearScreenshots,
    preparing,
    busy,
    busyMessage,
    error,
    setError,
    run,
    atCapacity: screenshots.length >= IMPORT_MAX_IMAGES,
  };
}
