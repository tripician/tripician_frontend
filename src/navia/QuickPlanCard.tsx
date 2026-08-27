import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, InputBase, IconButton, CircularProgress } from '@mui/material';
import { IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import NaviaOrb from './NaviaOrb';
import { draftTripFromPrompt, NaviaRequestError } from './naviaService';
import { usePlanImport } from './usePlanImport';
import { PlanImportAttachButton, PlanImportStrip } from './PlanImportControls';
import { stashPendingPrompt } from '../utils/pendingNaviaPrompt';
import { createTripAndOpen } from './createTripAndOpen';

/* Shown while the trip is being created. The heavy work (route, then places per
   stop) happens after navigation, under the planner's own overlay - these cover
   the two calls before that. */
const BUSY_MESSAGES = [
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

interface QuickPlanCardProps {
  /** Null/absent means the visitor is not signed in; they get routed to sign-in. */
  token?: string | null;
}

/**
 * One sentence in, a complete trip out.
 *
 * The flow deliberately reuses the create-dialog's "Let Navia draft it" path
 * rather than inventing a parallel one:
 *
 *   prompt -> POST /api/navia/draft-trip   (name, countries, vibe, nights)
 *          -> POST /api/trips              (the real trip)
 *          -> /tripplanner/:id  state.aiGenerated
 *
 * The one field this path cannot send is `preferences` (pace, who is going,
 * interests, dietary), because nobody was asked. A sentence is all we have. The
 * backend treats a trip with no stored preferences exactly as it did before they
 * existed, so this stays the fast lane rather than a degraded one, and the dialog
 * stays the path for anyone who wants the plan tuned to them.
 *
 * That last flag is what TripPlanner already watches. Its Phase 1 splits the
 * nights across the countries and calls suggest-itinerary for the route; Phase 2
 * calls plan-destination for every stop and verifies each place against Google
 * Places before it lands. So a trip built from one sentence is the *same* trip
 * the dialog builds - every day, every stop, every spot - not a thinner version
 * of it. Nothing here asks the user a follow-up question; the backend prompt is
 * explicitly forbidden from returning one.
 *
 * On the look: this used to be an ink panel, which was the only dark element on
 * an off-white page and read as foreign. It is now the page's own card - same
 * 16px radius, same hairline border, same `shadows.card` as CommunityTripCard -
 * lifted one tonal step toward the brand colour to mark it as the AI surface.
 * That is Material You's tonal-elevation idea: a special surface is a tint of
 * the base, not a different material dropped on top of it.
 */
export const QuickPlanCard: React.FC<QuickPlanCardProps> = ({ token }) => {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState(BUSY_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const importer = usePlanImport(token);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // A screenshot cannot be parked in sessionStorage the way a sentence can, so
  // signing in has to come first rather than after.
  const takeFiles = useCallback((files: File[]) => {
    if (!token) { navigate('/signin'); return; }
    importer.addFiles(files);
  }, [importer, navigate, token]);

  const submit = useCallback(async (raw: string) => {
    const prompt = raw.trim();
    if (busy || importer.busy) return;

    // Screenshots attached: this is a plan the traveller already wrote, so it is
    // read rather than drafted, and anything typed alongside is context for it.
    if (importer.screenshots.length > 0) {
      if (!token) { navigate('/signin'); return; }
      const ok = await importer.run(prompt);
      if (ok) setValue('');
      return;
    }

    if (!prompt) return;

    // Signed out: park the sentence and let sign-in replay it. /community is
    // semi-public, so this is a real path, not an edge case.
    if (!token) {
      stashPendingPrompt(prompt);
      navigate('/signin');
      return;
    }

    setError(null);
    setBusy(true);
    let i = 0;
    setBusyMsg(BUSY_MESSAGES[0]);
    timerRef.current = setInterval(() => {
      i = (i + 1) % BUSY_MESSAGES.length;
      setBusyMsg(BUSY_MESSAGES[i]);
    }, 1800);

    try {
      const draft = await draftTripFromPrompt(prompt, token);

      // A request with no stated timing still needs dates - the planner derives
      // the night count from the span, and Phase 1 falls back to a coarse
      // 3-nights-per-country guess without them. A month out is far enough to be
      // plausible and close enough to feel like a real plan.
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
      if (err instanceof NaviaRequestError) {
        setError(err.status === 402 ? 'You are out of Navia credits.' : err.message);
      } else {
        setError('Could not build that trip. Please try again.');
      }
      setBusy(false);
    } finally {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [busy, importer, navigate, token]);

  const hasShots = importer.screenshots.length > 0;
  const working = busy || importer.busy;
  const canSubmit = (Boolean(value.trim()) || hasShots) && !working && !importer.preparing;
  const status = error ?? importer.error ?? (importer.busy ? importer.busyMessage : busyMsg);

  return (
    <Box
      component="form"
      onSubmit={(e: React.FormEvent) => { e.preventDefault(); submit(value); }}
      onDragOver={(e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length > 0) takeFiles(files);
      }}
      sx={(t) => ({
        width: { xs: '100%', md: 380, lg: 420 },
        px: { xs: 2.25, sm: 2.5 },
        py: 2.25,
        // Same card language as the trip grid below it.
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: dragging ? `1px dashed ${t.palette.primary.main}` : `1px solid ${t.custom.surface.border}`,
        boxShadow: t.custom.shadows.card,
        // One tonal step toward the brand, which is what marks this as the AI
        // surface without making it a different material.
        backgroundImage: t.custom.gradients.brandSubtle,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.75,
      })}
    >
      {/*
        Title + one supporting line, so the card has a hierarchy instead of a flat
        stack of same-weight text. The old single 16px line was the whole problem:
        a display serif at 1rem is too small to read as display type, so it just
        looked cramped. At 21px with tight tracking the display serif works.

        On the copy: the title states the TRADE rather than naming the feature.
        "Draft a plan with Navia" described a button; a title built around what you
        put in and what you get out is the only reason anyone would pick this over
        the blank form.

        The eyebrow carries the orb, which does two jobs: it labels the shortcut and
        it keeps the Navia mark on the block without the orb having to align against
        a three-line text stack. It also hands the headline the card's full width.
        Plain uppercase overline rather than a filled pill on purpose - the input and
        the two suggestion chips are already paper-on-wash, and a fourth pill would
        both crowd the card and look tappable when it is only a label.
      */}
      {/* `mb: auto` here, not `mt: auto` on the pill. The slack in an equal-height
          row has to land under the heading, so the screenshot strip stays with
          the field it belongs to instead of being pushed away from it. */}
      <Box sx={{ mb: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.85 }}>
          <NaviaOrb size={14} processing={working} />
          {/* `overline` already uppercases and letter-spaces via the theme. */}
          <Typography variant="overline" sx={{ color: 'primary.main', lineHeight: 1 }}>
            Quick Plan
          </Typography>
        </Box>
        {/* Was a hand-sized serif at 1.3125rem, which existed because a display
            serif below that size stops reading as display type. On the UI face
            that floor does not apply, so this returns to the scale. */}
        <Typography
          variant="h4"
          component="h2"
          sx={{ lineHeight: 1.2, color: 'text.primary' }}
        >
          One sentence, a whole trip
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.8125rem', lineHeight: 1.45, color: 'text.secondary' }}>
          Say where and how long, or dump all your rough screenshots
        </Typography>
      </Box>

      <PlanImportStrip
        screenshots={importer.screenshots}
        onRemove={importer.removeScreenshot}
        disabled={working}
      />

      <Box
        sx={(t) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pl: 2,
          pr: 0.625,
          py: 0.875,
          borderRadius: '999px',
          bgcolor: 'background.paper',
          border: `1px solid ${t.custom.surface.border}`,
          transition: `border-color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}, box-shadow ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
          // A ring: zero blur, sitting on the field's edge.
          '&:focus-within': { borderColor: 'primary.main', boxShadow: t.custom.shadows.ringFocus },
        })}
      >
        <InputBase
          value={value}
          onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
          onPaste={(e) => {
            // Pasting a screenshot straight from the clipboard, which is how most
            // people get one out of another app in the first place.
            const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
            if (files.length === 0) return;
            e.preventDefault();
            takeFiles(files);
          }}
          disabled={working}
          placeholder={hasShots ? 'Anything to add? (optional)' : 'Three days in Lisbon, food and jazz…'}
          inputProps={{ 'aria-label': 'Describe the trip you want and Navia will plan it', maxLength: 280 }}
          sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem', color: 'text.primary' }}
        />
        <PlanImportAttachButton
          onFiles={takeFiles}
          disabled={working || importer.atCapacity}
          preparing={importer.preparing}
          size={30}
        />
        <IconButton
          type="submit"
          disabled={!canSubmit}
          aria-label={hasShots ? 'Read this plan and build the trip' : 'Build this trip with Navia'}
          sx={(t) => ({
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: '#fff',
            transition: `background-color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': { bgcolor: t.custom.surface.active, color: 'text.disabled' },
          })}
        >
          {working
            ? <CircularProgress size={14} thickness={5} sx={{ color: 'text.disabled' }} />
            : <IconArrowRight size={15} />}
        </IconButton>
      </Box>

      {/*
        Status line, rendered only while it has something to say.
        This used to be a permanent slot holding "Try" plus two example chips, with
        progress and errors borrowing the same row so the card never changed height.
        With the chips gone there is nothing to show at rest, and a reserved 26px of
        empty space at the bottom of the card is worse than the small growth when you
        submit. The inner minHeight keeps busy and error from jostling each other.
      */}
      {(working || error || importer.error) && (
        <Box sx={{ minHeight: 20, display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.75rem', color: (error || importer.error) ? 'error.main' : 'text.secondary' }}>
            {status}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default QuickPlanCard;
