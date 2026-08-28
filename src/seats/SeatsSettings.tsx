import React from 'react';
import {
  Alert, Box, Button, FormControlLabel, MenuItem, Select, Switch, TextField, Typography,
} from '@mui/material';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import type { JoinPolicy, TripSeats } from './types';
import { useVerification } from './useVerification';

interface SeatsSettingsProps {
  tripId: string;
  /**
   * A draft is excluded from every listing query, so recruiting on one saves the
   * intent and shows nothing. Required rather than optional: a default would
   * silently pick a side on the one thing this has to be right about.
   */
  published: boolean;
}

const POLICIES: { value: JoinPolicy; label: string; hint: string }[] = [
  { value: 'Closed', label: 'Closed', hint: 'Nobody can ask to join.' },
  { value: 'InviteOnly', label: 'Invite only', hint: 'Only people you add.' },
  { value: 'OpenToRequests', label: 'Open to requests', hint: 'Listed publicly. You approve everyone.' },
];

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } as const;

const SeatsSettings: React.FC<SeatsSettingsProps> = ({ tripId, published }) => {
  const { token } = useAuthToken();
  const verification = useVerification();

  const [seats, setSeats] = React.useState<TripSeats | null>(null);
  const [policy, setPolicy] = React.useState<JoinPolicy>('Closed');
  const [capacity, setCapacity] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [blurb, setBlurb] = React.useState('');
  const [confirmed, setConfirmed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    void apiServices.getTripSeats(token, tripId)
      .then((resp) => {
        if (!active) return;
        const s = resp.data;
        setSeats(s);
        setPolicy(s.joinPolicy);
        setCapacity(s.capacity != null ? String(s.capacity) : '');
        setPrice(s.pricePerPerson != null ? String(s.pricePerPerson) : '');
        setBlurb(s.listingBlurb ?? '');
        setConfirmed(s.confirmed);
      })
      .catch(() => { /* leave defaults */ });
    return () => { active = false; };
  }, [token, tripId]);

  const save = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiServices.updateTripSeats(token, tripId, {
        joinPolicy: policy,
        capacity: capacity.trim() === '' ? null : Number(capacity),
        pricePerPerson: price.trim() === '' ? null : Number(price),
        listingBlurb: blurb.trim() === '' ? null : blurb.trim(),
        confirmed,
      });
      setSaved(true);
      const resp = await apiServices.getTripSeats(token, tripId);
      setSeats(resp.data);
    } catch {
      setError(
        seats && capacity.trim() !== '' && Number(capacity) < seats.takenSeats
          ? `You already have ${seats.takenSeats} people on this trip.`
          : 'Could not save those listing settings.',
      );
    } finally {
      setBusy(false);
    }
  };

  const active = POLICIES.find((p) => p.value === policy);
  const listingPending = policy === 'OpenToRequests' && !published;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 0.75 }}>
          Who can join
        </Typography>
        <Select
          fullWidth
          size="small"
          value={policy}
          onChange={(e) => setPolicy(e.target.value as JoinPolicy)}
          sx={{ borderRadius: '12px' }}
        >
          {POLICIES.map((p) => (
            <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
          ))}
        </Select>
        {active && (
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>{active.hint}</Typography>
        )}
      </Box>

      {policy === 'OpenToRequests' && (
        <>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              size="small"
              type="number"
              label="Total places"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              helperText="Including you"
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField
              size="small"
              type="number"
              label="Cost per person"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              helperText="Settled between you"
              sx={{ ...fieldSx, flex: 1 }}
            />
          </Box>

          <TextField
            size="small"
            multiline
            minRows={2}
            maxRows={6}
            label="What should people know?"
            value={blurb}
            onChange={(e) => setBlurb(e.target.value.slice(0, 600))}
            sx={fieldSx}
          />

          {/*
            The badge for this already rendered on the public listing and the
            field already existed on the request DTO - but no control anywhere
            could set it, so "Confirmed" was decoration that could never turn on.
          */}
          <FormControlLabel
            control={<Switch checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} size="small" />}
            label={
              <Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>This departure is going ahead</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  Puts a Confirmed mark on the listing. Say it only once you are sure,
                  because people book flights against it.
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', ml: 0, mr: 0, mt: 0.5 }}
          />

          {listingPending && (
            <Alert severity="info" sx={{ borderRadius: '12px', fontSize: 12.5, py: 0.25 }}>
              Saved now, listed when you publish. A draft does not appear under
              "Trips looking for people", so nobody can ask to join it yet.
            </Alert>
          )}

          <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
            Tripician does not take payment. You approve every person who asks.
          </Typography>

          {verification.blocked && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                disabled={verification.starting}
                onClick={() => void verification.start()}
              >
                {verification.starting ? 'Opening…' : 'Verify your identity'}
              </Button>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>
                Required before a trip can be listed publicly.
              </Typography>
            </Box>
          )}
        </>
      )}

      {error && <Typography sx={{ fontSize: 12.5, color: 'error.main' }}>{error}</Typography>}
      {saved && !error && (
        <Typography sx={{ fontSize: 12.5, color: 'success.main' }}>
          {listingPending ? 'Saved. It goes live when you publish this trip.' : 'Listing saved.'}
        </Typography>
      )}

      <Box>
        <Button variant="contained" size="small" onClick={() => void save()} disabled={busy || (policy === 'OpenToRequests' && verification.blocked)}>
          {busy ? 'Saving…' : 'Save listing'}
        </Button>
      </Box>
    </Box>
  );
};

export default SeatsSettings;
