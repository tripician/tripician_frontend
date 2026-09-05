import React from 'react';
import { Box, InputBase, IconButton, Typography, CircularProgress, Tooltip, useTheme } from '@mui/material';
import { IconArrowRight } from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import NaviaOrb from '../NaviaOrb';
import { PlanImportAttachButton, PlanImportStrip } from '../PlanImportControls';
import SegmentedControl, { type SegmentedOption } from '../../components/ui/SegmentedControl';
import { DESKTOP_NAV_MIN_WIDTH } from '../../pages/PageLayout/navConfig';
import StoryCreationModal from '../../afterstory/StoryCreationModal';
import { springs, chipReveal } from '../../utils/animations';
import {
  COMMAND_MODES,
  COMMAND_MODE_ORDER,
  COMMAND_BAR_STATE_EVENT,
  onCommandBarRoute,
  type CommandMode,
} from './commandModes';
import { COMMAND_BAR_LABEL, PLACEHOLDER_EXAMPLES, PLACEHOLDER_INTERVAL_MS } from './placeholders';
import { useCommandBar, COMMAND_BAR_DRAFT_KEY } from './useCommandBar';
import CommandResultPanel from './CommandResultPanel';
import { useAskNavia } from './useAskNavia';

const MotionForm = motion.create('form');

const NaviaCommandBar: React.FC = () => {
  const { pathname } = useLocation();
  const bar = useCommandBar();
  const ask = useAskNavia(bar.token);
  const reduceMotion = useReducedMotion();
  const theme = useTheme();

  const [focusWithin, setFocusWithin] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [exampleIndex, setExampleIndex] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const visible = onCommandBarRoute(pathname);
  const spec = COMMAND_MODES[bar.effectiveMode];
  const showResults = ask.turns.length > 0;
  const hasText = Boolean(bar.text.trim());

  const open = focusWithin || hasText || bar.hasImages || showResults || bar.busy;
  // Auto has resolved nothing yet on an empty field, so it must not promise a trip.
  const contractSpec = bar.mode === 'auto' && !hasText && !bar.hasImages ? COMMAND_MODES.auto : spec;
  const contract = contractSpec.contract(bar.hasImages);

  // A restored draft means sign-in interrupted someone mid-sentence.
  React.useEffect(() => {
    if (bar.text) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bar.text.length > 0]);

  // The support FAB shares this corner below lg and cannot measure us, so say so.
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent(COMMAND_BAR_STATE_EVENT, { detail: open }));
    return () => {
      window.dispatchEvent(new CustomEvent(COMMAND_BAR_STATE_EVENT, { detail: false }));
    };
  }, [open]);

  // Rests through the examples so the one thing on screen still says what this does.
  React.useEffect(() => {
    if (!visible || open || reduceMotion) return;
    const id = setInterval(
      () => setExampleIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length),
      PLACEHOLDER_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [visible, open, reduceMotion]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showResults) { ask.clear(); return; }
      inputRef.current?.blur();
      setFocusWithin(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, showResults, ask]);

  // Pasting a screenshot is how most people get one out of another app, so the
  // dock claims that gesture rather than requiring a click first.
  React.useEffect(() => {
    if (!visible) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typingElsewhere = target
        && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
        && !rootRef.current?.contains(target);
      if (typingElsewhere) return;
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;
      e.preventDefault();
      bar.takeFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [visible, bar]);

  if (!visible) return null;

  const modeOptions: SegmentedOption<CommandMode>[] = COMMAND_MODE_ORDER
    .filter((id) => id !== 'story' || bar.storyEnabled)
    .map((id) => {
      const m = COMMAND_MODES[id];
      return { value: id, label: m.label, Icon: m.Icon, tip: m.contract(bar.hasImages) };
    });

  const submit = async () => {
    const prompt = bar.text.trim();
    if (bar.busy || bar.importer.preparing) return;
    if (!prompt && !bar.hasImages) return;

    // Every mode needs an account: NaviaController is [Authorize] throughout.
    if (!bar.token) {
      bar.requireAuth({
        reason: 'Sign in and Navia will pick this up where you left it.',
        draft: { key: COMMAND_BAR_DRAFT_KEY, text: prompt, meta: bar.mode },
      });
      return;
    }

    if (bar.hasImages) {
      const ok = await bar.importer.run(prompt);
      if (ok) bar.reset();
      return;
    }

    if (bar.effectiveMode === 'ask') {
      bar.setText('');
      await ask.ask(prompt);
      return;
    }

    if (bar.effectiveMode === 'story') {
      await bar.runStory(prompt);
      return;
    }

    await bar.runPlan(prompt);
  };

  const canSubmit = (hasText || bar.hasImages) && !bar.busy && !bar.importer.preparing;
  const status = bar.error ?? (bar.busy ? bar.busyMsg : null);
  const lift = reduceMotion ? 0 : -6;

  return (
    <>
      {/* Positioning only. The centring transform lives here so the lift below
          cannot fight it for the transform property. */}
      <Box
        ref={rootRef}
        sx={{
          /*
           * Keyed to the same width the bottom bar is, not to lg.
           *
           * These two disagreed: the bar hides at DESKTOP_NAV_MIN_WIDTH (1280)
           * while this switched to its desktop position at lg (1200), so between
           * 1200 and 1279 the dock dropped to bottom:24 and sat on top of a bar
           * that was still there. Reading the one shared constant is what that
           * constant is for, and it matters more now that the dock is the route
           * to Navia on every destination the bar can reach.
           */
          position: 'fixed',
          zIndex: 1250,
          left: 16,
          right: 16,
          // Clears AppBottomNav (72px plus safe area) wherever the bar is showing.
          bottom: 'calc(72px + env(safe-area-inset-bottom, 0px) + 12px)',
          [`@media (min-width:${DESKTOP_NAV_MIN_WIDTH}px)`]: {
            left: '50%',
            right: 'auto',
            transform: 'translateX(-50%)',
            width: 'min(720px, calc(100vw - 48px))',
            bottom: 24,
          },
        }}
      >
        <Box
          component={MotionForm}
          initial={false}
          animate={{
            y: open ? lift : 0,
            // A plain number so framer animates it rather than snapping between strings.
            borderRadius: open ? 20 : 999,
          }}
          transition={reduceMotion ? { duration: 0 } : springs.snappy}
          onSubmit={(e: React.FormEvent) => { e.preventDefault(); void submit(); }}
          // focusin / focusout bubble, so this covers the field, the chips and the
          // attach button. Without the containment check, clicking a chip collapses
          // the bar out from under the click.
          onFocus={() => setFocusWithin(true)}
          onBlur={(e: React.FocusEvent<HTMLElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
          }}
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
            if (files.length > 0) bar.takeFiles(files);
          }}
          sx={(t) => ({
            overflow: 'hidden',
            bgcolor: 'background.paper',
            backgroundImage: t.custom.gradients.brandSubtle,
            border: dragging
              ? '1px dashed ' + t.palette.primary.main
              : '1px solid ' + t.custom.surface.border,
            boxShadow: open ? t.custom.shadows.overlay : t.custom.shadows.card,
            transition: 'box-shadow ' + t.custom.motion.duration.base + ' ' + t.custom.motion.easing.standard,
          })}
        >
          <AnimatePresence initial={false}>
            {showResults && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : undefined}
              >
                <CommandResultPanel
                  turns={ask.turns}
                  stories={ask.stories}
                  citationsLoading={ask.citationsLoading}
                  onClose={ask.clear}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Box
            sx={{
              px: { xs: 1, sm: 1.25 },
              py: { xs: 1, sm: 1.25 },
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="modes"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={reduceMotion ? { duration: 0 } : springs.snappy}
                  style={{ overflow: 'hidden' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 0.75, pt: 0.5 }}>
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      variants={{
                        visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
                      }}
                    >
                      <motion.div variants={reduceMotion ? undefined : chipReveal}>
                        <SegmentedControl
                          options={modeOptions}
                          value={bar.mode}
                          onChange={(m) => {
                            bar.setMode(m);
                            // Picking a mode leaves focus on the chip, so anything
                            // typed next would go nowhere. Hand it back to the field.
                            inputRef.current?.focus();
                          }}
                          size="small"
                          aria-label="What Navia should do"
                        />
                      </motion.div>
                    </motion.div>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            <PlanImportStrip
              screenshots={bar.importer.screenshots}
              onRemove={bar.importer.removeScreenshot}
              disabled={bar.busy}
            />

            {/* The card's lift, shadow and radius already say "this is active", so
                the field takes a white ground and a hairline rather than a second
                coral focus ring competing with them. */}
            <Box
              sx={(t) => ({
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                pl: 1.5,
                pr: 0.5,
                py: 0.625,
                borderRadius: '999px',
                bgcolor: open ? 'background.paper' : 'transparent',
                border: '1px solid ' + (open ? t.custom.surface.border : 'transparent'),
                transition: [
                  'background-color ' + t.custom.motion.duration.base,
                  'border-color ' + t.custom.motion.duration.base,
                ].join(', '),
              })}
            >
              <NaviaOrb size={18} processing={bar.busy || ask.streaming} />

              <Box sx={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                <InputBase
                  inputRef={inputRef}
                  value={bar.text}
                  onChange={(e) => { bar.setText(e.target.value); if (bar.error) bar.setError(null); }}
                  disabled={bar.busy}
                  inputProps={{ 'aria-label': COMMAND_BAR_LABEL, maxLength: 280 }}
                  sx={{ flex: 1, minWidth: 0, fontSize: '0.9375rem', color: 'text.primary' }}
                />

                {/* A placeholder attribute cannot cross-fade, so the resting text is
                    drawn here instead. Decorative: the field keeps a stable name. */}
                {!hasText && (
                  <Box
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                      overflow: 'hidden',
                    }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={bar.hasImages ? 'attached' : open ? 'focused' : exampleIndex}
                        initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: 'easeOut' }}
                        style={{
                          fontSize: '0.9375rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {bar.hasImages
                          ? 'Anything to add?'
                          : open
                            ? 'Say it in one line'
                            : PLACEHOLDER_EXAMPLES[exampleIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </Box>
                )}
              </Box>

              <Tooltip
                title={spec.acceptsImages
                  ? 'Import a plan from screenshots'
                  : spec.label + ' does not read pictures'}
              >
                <Box component="span" sx={{ display: 'inline-flex' }}>
                  <PlanImportAttachButton
                    onFiles={bar.takeFiles}
                    disabled={bar.busy || bar.importer.atCapacity || !spec.acceptsImages}
                    preparing={bar.importer.preparing}
                    size={30}
                  />
                </Box>
              </Tooltip>

              <IconButton
                type="submit"
                disabled={!canSubmit}
                aria-label={contract}
                sx={(t) => ({
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: '#fff',
                  transition: 'background-color ' + t.custom.motion.duration.fast + ' ' + t.custom.motion.easing.standard,
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': { bgcolor: t.custom.surface.active, color: 'text.disabled' },
                })}
              >
                {bar.busy
                  ? <CircularProgress size={14} thickness={5} sx={{ color: 'text.disabled' }} />
                  : <IconArrowRight size={16} />}
              </IconButton>
            </Box>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="contract"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { ...springs.snappy, delay: 0.04 }}
                  style={{ overflow: 'hidden' }}
                >
                  <Box sx={{ pl: 1.75, pb: 0.25, minHeight: 18 }}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={status ?? contract}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
                      >
                        <Typography
                          aria-live="polite"
                          sx={{
                            fontSize: '0.75rem',
                            lineHeight: 1.4,
                            color: bar.error ? 'error.main' : 'text.secondary',
                          }}
                        >
                          {status ?? contract}
                        </Typography>
                      </motion.div>
                    </AnimatePresence>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Box>
      </Box>

      {bar.storySeed && (
        <StoryCreationModal
          open
          onClose={() => { bar.clearStorySeed(); bar.reset(); }}
          initial={bar.storySeed}
        />
      )}
    </>
  );
};

export default NaviaCommandBar;
