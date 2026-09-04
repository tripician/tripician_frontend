/**
 * Bring the shape of a trip into a story.
 *
 * This is the reason After Story belongs inside a planner rather than beside
 * one, and it contains no AI at all. Everything it produces is the author's own
 * plan data, reshaped into blocks with the captions left empty. Nothing is
 * written for them.
 *
 * The barrier to a travel story is not writing, it is the blank page. Journaling
 * research is blunt that friction per entry is what decides whether people keep
 * posting, and a generated draft solves the blank page by putting words in
 * someone's mouth, which is both worse content and a worse product promise for
 * a company whose whole position is that it would rather delete the model's
 * answer than ship an unchecked one. This solves it with facts the author
 * already supplied.
 */

import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
  useTheme,
} from '@mui/material';
import dayjs from 'dayjs';
import { apiServices } from '../../services/APIs/apiServices';
import { safeExternalUrl } from '../../utils/sanitizeHtml';
import { createBlock, newBlockId } from '../blockSchema';
import type { StoryBlock } from '../types';

interface ImportFromPlanDialogProps {
  open: boolean;
  tripId: string;
  onClose: () => void;
  onImport: (blocks: StoryBlock[]) => void;
}

interface ImportOptions {
  stops: boolean;
  places: boolean;
  foods: boolean;
  route: boolean;
  photos: boolean;
  costs: boolean;
}

const DEFAULTS: ImportOptions = {
  stops: true,
  places: true,
  foods: true,
  route: true,
  photos: true,
  // Off by default. Money is the one thing on a trip people share selectively,
  // and defaulting it on would publish a budget by accident.
  costs: false,
};

const ImportFromPlanDialog: React.FC<ImportFromPlanDialogProps> = ({ open, tripId, onClose, onImport }) => {
  const theme = useTheme();
  const [trip, setTrip] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [options, setOptions] = React.useState<ImportOptions>(DEFAULTS);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    apiServices
      .getTripById(null, tripId)
      .then((response) => {
        if (!cancelled) setTrip(response.data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not read that trip.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, tripId]);

  const preview = React.useMemo(() => (trip ? summarise(trip) : null), [trip]);

  const toggle = (key: keyof ImportOptions) => setOptions((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleImport = () => {
    if (!trip) return;
    onImport(buildBlocks(trip, options));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: theme.custom.fontDisplay, fontWeight: 700 }}>
        Bring in from your plan
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          This lays out the sections from the trip you planned, with the captions empty. Nothing is written for
          you.
        </Typography>

        {loading && <Typography variant="body2">Reading your plan...</Typography>}
        {error && (
          <Typography variant="body2" sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        )}

        {preview && (
          <Box sx={{ display: 'grid', gap: 0.25 }}>
            <Row
              label="Each stop as a section heading"
              count={preview.stops}
              checked={options.stops}
              onToggle={() => toggle('stops')}
            />
            <Row
              label="Places you marked worth visiting"
              count={preview.places}
              checked={options.places}
              onToggle={() => toggle('places')}
            />
            <Row
              label="Food you wanted to try"
              count={preview.foods}
              checked={options.foods}
              onToggle={() => toggle('foods')}
            />
            <Row
              label="The route, in order"
              count={preview.route}
              checked={options.route}
              onToggle={() => toggle('route')}
            />
            <Row
              label="Photos already on the trip"
              count={preview.photos}
              checked={options.photos}
              onToggle={() => toggle('photos')}
            />
            <Row
              label="What it cost"
              count={preview.costs}
              checked={options.costs}
              onToggle={() => toggle('costs')}
              hint="Off by default, so a budget is never published by accident."
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleImport} disabled={!trip || loading}>
          Add to my story
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Row: React.FC<{
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
  hint?: string;
}> = ({ label, count, checked, onToggle, hint }) => (
  <Box sx={{ opacity: count === 0 ? 0.45 : 1 }}>
    <FormControlLabel
      control={<Checkbox checked={checked && count > 0} disabled={count === 0} onChange={onToggle} />}
      label={
        <Box>
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            {label}
            {count > 0 && (
              <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
                {'  '}
                {count}
              </Typography>
            )}
          </Typography>
          {hint && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {hint}
            </Typography>
          )}
        </Box>
      }
    />
  </Box>
);

// ── plan to blocks ──────────────────────────────────────────────────────────

interface Stop {
  name: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  photoUrl?: string;
  lat?: number;
  lng?: number;
  spots: Array<{ name: string; description?: string; photoUrl?: string; mapUrl?: string; placeId?: string; mustVisit?: boolean; lat?: number; lng?: number }>;
  foods: string[];
}

/**
 * The backend is inconsistent about JSON casing on trip reads, which
 * TripView.tsx already works around by trying several spellings. Same approach
 * here rather than assuming one.
 */
function pick<T>(source: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

function readStops(trip: Record<string, unknown>): Stop[] {
  const itinerary = pick<unknown[]>(trip, 'itinerary', 'Itinerary') ?? [];
  if (!Array.isArray(itinerary)) return [];

  return itinerary
    .filter((it): it is Record<string, unknown> => Boolean(it) && typeof it === 'object')
    .map((it, index) => {
      const rawSpots = Array.isArray(it.spots) ? it.spots : [];
      const rawFoods = Array.isArray(it.foods) ? it.foods : [];

      return {
        name: (typeof it.name === 'string' && it.name.trim()) || `Stop ${index + 1}`,
        title: typeof it.title === 'string' && it.title.trim() ? it.title.trim() : undefined,
        startDate: typeof it.startDate === 'string' ? it.startDate : undefined,
        endDate: typeof it.endDate === 'string' ? it.endDate : undefined,
        photoUrl: typeof it.photoUrl === 'string' ? it.photoUrl : undefined,
        lat: typeof it.lat === 'number' ? it.lat : undefined,
        lng: typeof it.lng === 'number' ? it.lng : undefined,
        spots: rawSpots
          .filter((s: unknown): s is Record<string, unknown> => Boolean(s) && typeof s === 'object' && typeof (s as Record<string, unknown>).name === 'string')
          .map((s) => ({
            name: s.name as string,
            description: typeof s.description === 'string' ? s.description : undefined,
            photoUrl: typeof s.photoUrl === 'string' ? s.photoUrl : undefined,
            mapUrl: typeof s.mapUrl === 'string' ? s.mapUrl : undefined,
            placeId: typeof s.placeId === 'string' ? s.placeId : undefined,
            mustVisit: s.mustVisit === true || s.category === 'must_visit',
            lat: typeof s.lat === 'number' ? s.lat : undefined,
            lng: typeof s.lng === 'number' ? s.lng : undefined,
          })),
        foods: rawFoods
          .map((f: unknown) =>
            typeof f === 'string' ? f : (f as Record<string, unknown> | null)?.name,
          )
          .filter((f: unknown): f is string => typeof f === 'string' && f.trim().length > 0),
      };
    });
}

function summarise(trip: Record<string, unknown>) {
  const stops = readStops(trip);
  const expenses = pick<unknown[]>(trip, 'expenses', 'Expenses');

  return {
    stops: stops.length,
    places: stops.reduce((n, s) => n + s.spots.filter((sp) => sp.mustVisit).length, 0),
    foods: stops.reduce((n, s) => n + s.foods.length, 0),
    route: stops.filter((s) => s.lat != null && s.lng != null).length,
    photos:
      stops.filter((s) => Boolean(s.photoUrl)).length +
      (safeExternalUrl(pick<string>(trip, 'bannerPhotoUrl', 'BannerPhotoUrl', 'bannerUrl')) ? 1 : 0),
    costs: Array.isArray(expenses) ? expenses.length : 0,
  };
}

function buildBlocks(trip: Record<string, unknown>, options: ImportOptions): StoryBlock[] {
  const stops = readStops(trip);
  const blocks: StoryBlock[] = [];

  const banner = safeExternalUrl(pick<string>(trip, 'bannerPhotoUrl', 'BannerPhotoUrl', 'bannerUrl'));
  if (options.photos && banner) {
    blocks.push({ id: newBlockId(), type: 'photo', url: banner, width: 'full' });
  }

  for (const stop of stops) {
    if (options.stops) {
      const when = formatWhen(stop.startDate, stop.endDate);
      blocks.push({
        id: newBlockId(),
        type: 'heading',
        // The stop name plus dates, which is fact. The stop's plan title is
        // deliberately not used: it described an intention, and the story is
        // about what actually happened.
        text: when ? `${stop.name}, ${when}` : stop.name,
        level: 2,
      });
      // An empty paragraph under each heading, so there is somewhere obvious to
      // start typing rather than a wall of imported structure.
      blocks.push(createBlock('text'));
    }

    if (options.photos && stop.photoUrl) {
      const url = safeExternalUrl(stop.photoUrl);
      if (url) blocks.push({ id: newBlockId(), type: 'photo', url, width: 'inset' });
    }

    if (options.places) {
      for (const spot of stop.spots.filter((s) => s.mustVisit)) {
        blocks.push({
          id: newBlockId(),
          type: 'place',
          name: spot.name,
          // The plan's description is not carried over. It was a reason to go,
          // not a report of going, and leaving it would read as the author's
          // verdict when it is not.
          ...(safeExternalUrl(spot.mapUrl) ? { mapsHref: safeExternalUrl(spot.mapUrl) as string } : {}),
          ...(spot.placeId ? { placeId: spot.placeId } : {}),
          ...(safeExternalUrl(spot.photoUrl) ? { photoUrl: safeExternalUrl(spot.photoUrl) as string } : {}),
          ...(spot.lat != null && spot.lng != null ? { lat: spot.lat, lng: spot.lng } : {}),
        });
      }
    }

    if (options.foods && stop.foods.length > 0) {
      blocks.push({
        id: newBlockId(),
        type: 'list',
        style: 'musttry',
        title: `Food in ${stop.name}`,
        items: stop.foods,
      });
    }
  }

  if (options.route) {
    const routeStops = stops
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({ name: s.name, lat: s.lat as number, lng: s.lng as number }));
    if (routeStops.length > 0) {
      blocks.push({ id: newBlockId(), type: 'map', stops: routeStops });
    }
  }

  if (options.costs) {
    const expenses = pick<unknown[]>(trip, 'expenses', 'Expenses');
    const currency = pick<string>(trip, 'currencyCode', 'CurrencyCode') ?? 'USD';
    if (Array.isArray(expenses) && expenses.length > 0) {
      const rows = expenses
        .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === 'object')
        .map((e) => ({
          label: String(e.label ?? e.category ?? 'Expense').slice(0, 120),
          amount: Number(e.amount) || 0,
        }))
        .filter((r) => r.amount > 0)
        .slice(0, 30);

      if (rows.length > 0) {
        blocks.push({ id: newBlockId(), type: 'cost', currency: currency.slice(0, 3).toUpperCase(), rows });
      }
    }
  }

  return blocks;
}

function formatWhen(start?: string, end?: string): string | null {
  if (!start) return null;
  const from = dayjs(start);
  if (!from.isValid()) return null;
  if (!end) return from.format('MMM D');

  const to = dayjs(end);
  if (!to.isValid() || from.isSame(to, 'day')) return from.format('MMM D');
  return from.isSame(to, 'month')
    ? `${from.format('MMM D')} to ${to.format('D')}`
    : `${from.format('MMM D')} to ${to.format('MMM D')}`;
}

export default ImportFromPlanDialog;
