import React from 'react';
import { Box, Dialog, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import { useAuthToken } from '../../../hooks/useAuth0Token';
import { apiServices } from '../../../services/APIs/apiServices';
import { createTripAndOpen } from '../../../tripicianai/createTripAndOpen';
import {
  GUIDED_STEPS, buildCreatePayload, canContinue, initialNewTripState, newTripReducer, type CreateMode,
} from './newTripFlow';
import { DatesStep, FinishStep, FoodStep, OriginStep, PlacesStep, TripTypeStep } from './NewTripSteps';

interface NewTripDialogProps {
  open: boolean;
  onClose: () => void;
  /** A prefill from a group page or a chat that already knew some answers. Read defensively. */
  initial?: unknown;
}

const errorMessage = (err: any): string => {
  if (err?.code === 'ERR_NETWORK') return 'We could not reach Tripician. Check your connection and try again.';
  if (err?.response) return err.response.data?.message || 'Something went wrong on our side. Please try again.';
  return 'Something went wrong creating your trip. Please try again.';
};

// The new trip flow: one short question per screen, then TripicianAI plans it or the traveller does.
const NewTripDialog: React.FC<NewTripDialogProps> = ({ open, onClose, initial }) => {
  const theme = useTheme();
  const atLeastSm = useMediaQuery(theme.breakpoints.up('sm'));
  const navigate = useNavigate();
  const { token } = useAuthToken();
  const [state, dispatch] = React.useReducer(newTripReducer, initial, initialNewTripState);
  const [busy, setBusy] = React.useState<CreateMode | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [groupName, setGroupName] = React.useState<string | null>(null);

  // A fresh start every time it opens, carrying whatever the opener already knew.
  React.useEffect(() => {
    if (!open) return;
    dispatch({ type: 'reset', prefill: initial });
    setError(null);
    setBusy(null);
  }, [open, initial]);

  React.useEffect(() => {
    setGroupName(null);
    if (!open || !token || !state.organizationId) return;
    let live = true;
    apiServices.getMyOrganizations(token)
      .then((resp) => {
        const groups: { id?: string; name?: string }[] = Array.isArray(resp.data) ? resp.data : [];
        if (live) setGroupName(groups.find((g) => g.id === state.organizationId)?.name ?? null);
      })
      .catch(() => { /* the plan is still created for the group; only the name line is missing */ });
    return () => { live = false; };
  }, [open, token, state.organizationId]);

  const order = state.blank ? ['dates'] : GUIDED_STEPS;
  const index = Math.max(0, order.indexOf(state.step));
  const canGoBack = state.blank || index > 0;

  const create = async (mode: CreateMode) => {
    if (busy) return;
    if (!token) { setError('Please sign in to create a trip.'); return; }
    setError(null);
    setBusy(mode);
    try {
      await createTripAndOpen({
        token,
        navigate,
        payload: buildCreatePayload(state, mode),
        state: mode === 'ai' ? { aiGenerated: true } : undefined,
        beforeNavigate: onClose,
      });
    } catch (err) {
      console.error('[NewTripDialog] createTrip failed', err);
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  // Enter moves on, like the Next button. The place search stops its own Enter before it gets here.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('[role="dialog"] .MuiPickersLayout-root')) return;
    if (state.step === 'finish' || state.blank || !canContinue(state)) return;
    e.preventDefault();
    dispatch({ type: 'next' });
  };

  const stepProps = { state, dispatch, autoFocus: atLeastSm };
  const screen = (() => {
    switch (state.step) {
      case 'origin': return <OriginStep {...stepProps} />;
      case 'places': return <PlacesStep {...stepProps} />;
      case 'dates': return <DatesStep {...stepProps} onCreate={create} busy={busy} error={error} />;
      case 'tripType': return <TripTypeStep {...stepProps} />;
      case 'food': return <FoodStep {...stepProps} />;
      default: return <FinishStep {...stepProps} onCreate={create} busy={busy} error={error} groupName={groupName} />;
    }
  })();

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullScreen={!atLeastSm}
      fullWidth
      maxWidth="sm"
      aria-labelledby="new-trip-title"
      PaperProps={{ sx: { borderRadius: { xs: 0, sm: '24px' }, height: { sm: 'min(680px, calc(100% - 64px))' }, overflow: 'hidden', bgcolor: 'background.paper' } }}
    >
      <Box onKeyDown={onKeyDown} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 1.5, sm: 2.5 }, pt: { xs: 1.5, sm: 2 }, pb: 1 }}>
          <IconButton aria-label="Back" onClick={() => dispatch({ type: 'back' })} disabled={!canGoBack || busy !== null} sx={{ visibility: canGoBack ? 'visible' : 'hidden' }}>
            <IconArrowLeft size={20} />
          </IconButton>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Typography id="new-trip-title" component="h1" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              New trip
            </Typography>
            {state.blank ? (
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Just the dates</Typography>
            ) : (
              <Box role="progressbar" aria-label={`Step ${index + 1} of ${order.length}`} aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={order.length} sx={{ display: 'flex', gap: 0.75 }}>
                {order.map((s, i) => (
                  <Box
                    key={s}
                    sx={{
                      height: 6, borderRadius: '999px',
                      width: i === index ? 22 : 6,
                      bgcolor: i <= index ? 'text.primary' : theme.custom.surface.active,
                      transition: `width ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}, background-color ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
          <IconButton aria-label="Close" onClick={onClose} disabled={busy !== null}>
            <IconX size={20} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait" initial={false} custom={state.dir}>
            <motion.div
              key={`${state.blank ? 'blank' : 'guided'}-${state.step}`}
              custom={state.dir}
              initial={{ opacity: 0, x: 28 * state.dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 * state.dir }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}
            >
              {screen}
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Dialog>
  );
};

export default NewTripDialog;
