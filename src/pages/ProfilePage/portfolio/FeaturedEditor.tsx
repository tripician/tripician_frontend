import React from 'react';
import {
  Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, IconButton, Skeleton, Tooltip, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import { IconArrowDown, IconArrowUp, IconCheck, IconX } from '@tabler/icons-react';
import FilterChip from '../../../components/ui/FilterChip';
import { apiServices } from '../../../services/APIs/apiServices';
import type { AfterStorySummaryDto } from '../../../afterstory/types';
import type { TripVM } from '../tripViewModel';
import {
  FEATURED_MAX,
  FEATURED_TYPE_LABEL,
  featuredMeta,
  normalizeFeaturedItems,
  type FeaturedItem,
  type FeaturedType,
} from '../featuredItems';
import { FeaturedCover } from './FeaturedShelf';
import type { PhotobookState } from './usePortfolio';

const keyOf = (item: Pick<FeaturedItem, 'type' | 'id'>) => `${item.type}:${item.id}`;

function fromTrip(trip: TripVM): FeaturedItem {
  return { type: 'plan', id: trip.id, title: trip.title, coverUrl: trip.image || null, place: trip.countries[0] ?? null, countries: trip.countries, slug: null, postId: null };
}

function fromStory(story: AfterStorySummaryDto): FeaturedItem {
  return {
    type: 'story',
    id: story.id,
    title: story.title?.trim() || 'Untitled story',
    coverUrl: story.coverImageUrl ?? story.coverVideoThumbUrl ?? null,
    place: story.destination ?? story.countries?.[0] ?? null,
    countries: story.countries ?? [],
    slug: story.slug ?? null,
    postId: null,
  };
}

/** The candidate a reader can tick: a row for a plan or story, a square for a photo. */
const Candidate: React.FC<{ item: FeaturedItem; selected: boolean; disabled: boolean; onToggle: () => void; square?: boolean }> = ({
  item, selected, disabled, onToggle, square,
}) => (
  <ButtonBase
    onClick={onToggle}
    disabled={disabled && !selected}
    aria-pressed={selected}
    aria-label={`${selected ? 'Remove' : 'Add'} ${item.title}`}
    sx={(theme) => ({
      position: 'relative',
      display: 'flex',
      flexDirection: square ? 'column' : 'row',
      alignItems: square ? 'stretch' : 'center',
      gap: 1.5,
      p: square ? 0 : 1,
      width: '100%',
      textAlign: 'left',
      borderRadius: '12px',
      fontFamily: 'inherit',
      outline: selected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
      outlineOffset: square ? 0 : -2,
      transition: `background-color ${theme.custom.motion.duration.fast} ease, outline-color ${theme.custom.motion.duration.fast} ease`,
      '&:hover': { bgcolor: square ? undefined : theme.custom.surface.hover },
      '&.Mui-disabled': { opacity: 0.45 },
    })}
  >
    <Box sx={{ width: square ? '100%' : 88, flexShrink: 0 }}>
      <FeaturedCover item={item} radius={10} />
    </Box>
    {square ? null : (
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }} noWrap>{item.title}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="p">{featuredMeta(item)}</Typography>
      </Box>
    )}
    <Box
      sx={(theme) => ({
        position: square ? 'absolute' : 'static',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: selected ? 'primary.main' : square ? 'rgba(0,0,0,0.35)' : 'transparent',
        border: selected ? 'none' : `1.5px solid ${square ? 'rgba(255,255,255,0.9)' : theme.palette.text.disabled}`,
        color: '#fff',
        mr: square ? 0 : 0.5,
      })}
    >
      {selected ? <IconCheck size={14} stroke={3} /> : null}
    </Box>
  </ButtonBase>
);

/**
 * Choosing the Featured row on the web, as the app's FeaturedManage does it:
 * what is chosen at the top in its order, with up and down to rearrange, and
 * below it everything that can be featured. Only things already posted can be
 * chosen (a published plan or story, or a photo from the Photobook), never a
 * text post. Saving replaces the row and shows what the server kept.
 */
const FeaturedEditor: React.FC<{
  open: boolean;
  onClose: () => void;
  current: FeaturedItem[];
  plans: readonly TripVM[];
  stories: readonly AfterStorySummaryDto[];
  photos: PhotobookState;
  onSaved: (items: FeaturedItem[]) => void;
}> = ({ open, onClose, current, plans, stories, photos, onSaved }) => {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const [chosen, setChosen] = React.useState<FeaturedItem[]>(current);
  const [kind, setKind] = React.useState<FeaturedType>('plan');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setChosen(current);
      setError(null);
    }
  }, [open, current]);

  const chosenKeys = new Set(chosen.map(keyOf));
  const full = chosen.length >= FEATURED_MAX;

  const toggle = (item: FeaturedItem) => {
    setChosen((prev) =>
      prev.some((c) => keyOf(c) === keyOf(item))
        ? prev.filter((c) => keyOf(c) !== keyOf(item))
        : prev.length >= FEATURED_MAX ? prev : [...prev, item],
    );
  };

  const move = (index: number, delta: number) => {
    setChosen((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await apiServices.saveProfileFeatured(chosen.map(({ type, id }) => ({ type, id })));
      onSaved(normalizeFeaturedItems(data));
      window.dispatchEvent(new CustomEvent('app:success', { detail: { message: 'Highlights saved' } }));
      onClose();
    } catch {
      setError('Your highlights couldn’t be saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const candidates: FeaturedItem[] =
    kind === 'plan'
      ? plans.map(fromTrip)
      : kind === 'story'
        ? stories.map(fromStory)
        : photos.items.map((p) => ({ type: 'photo', id: p.id, title: p.caption ?? 'A travel moment', coverUrl: p.url, place: p.placeName, countries: [], slug: null, postId: p.postId }));

  const emptyLine: Record<FeaturedType, string> = {
    plan: 'Publish a plan and it can lead your profile.',
    story: 'Publish an Afterstory and it can lead your profile.',
    photo: 'Share a photo and it can lead your profile.',
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="md" fullScreen={phone} scroll="paper" aria-labelledby="featured-editor-title">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, px: { xs: 2, md: 3 }, pt: 2.25, pb: 1.5 }}>
        <Box>
          <Typography id="featured-editor-title" sx={{ fontFamily: theme.custom.fontDisplay, fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.015em' }}>
            Edit highlights
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Up to {FEATURED_MAX} plans, stories or photos. They lead your profile, in this order.
          </Typography>
        </Box>
        <IconButton aria-label="Close" onClick={onClose} disabled={saving}><IconX size={20} /></IconButton>
      </Box>

      <DialogContent dividers sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
          Chosen · {chosen.length} of {FEATURED_MAX}
        </Typography>
        {chosen.length === 0 ? (
          <Box sx={{ borderRadius: '12px', border: `1px dashed ${theme.custom.surface.border}`, py: 3, mt: 1, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Nothing chosen yet. Pick from below.</Typography>
          </Box>
        ) : (
          <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, mt: 1, display: 'grid', gap: 1 }}>
            {chosen.map((item, i) => (
              <Box
                component="li"
                key={keyOf(item)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: '12px', bgcolor: theme.custom.surface.hover }}
              >
                <Typography sx={{ width: 20, textAlign: 'center', fontWeight: 700, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</Typography>
                <Box sx={{ width: 72, flexShrink: 0 }}><FeaturedCover item={item} radius={8} /></Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }} noWrap>{item.title}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{FEATURED_TYPE_LABEL[item.type]}</Typography>
                </Box>
                <Tooltip title="Move up"><span><IconButton size="small" aria-label={`Move ${item.title} up`} disabled={i === 0} onClick={() => move(i, -1)}><IconArrowUp size={17} /></IconButton></span></Tooltip>
                <Tooltip title="Move down"><span><IconButton size="small" aria-label={`Move ${item.title} down`} disabled={i === chosen.length - 1} onClick={() => move(i, 1)}><IconArrowDown size={17} /></IconButton></span></Tooltip>
                <Tooltip title="Remove"><IconButton size="small" aria-label={`Remove ${item.title}`} onClick={() => toggle(item)}><IconX size={17} /></IconButton></Tooltip>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 3.5, mb: 1.75, flexWrap: 'wrap' }}>
          {(['plan', 'story', 'photo'] as const).map((k) => (
            <FilterChip key={k} label={k === 'plan' ? 'Plans' : k === 'story' ? 'Stories' : 'Photos'} active={kind === k} onClick={() => setKind(k)} />
          ))}
        </Box>

        {kind === 'photo' && photos.status === 'loading' && photos.items.length === 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1 }}>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="rounded" sx={{ aspectRatio: '4 / 3', height: 'auto' }} />)}
          </Box>
        ) : candidates.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>{emptyLine[kind]}</Typography>
        ) : kind === 'photo' ? (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1 }}>
              {candidates.map((item) => (
                <Candidate key={keyOf(item)} item={item} square selected={chosenKeys.has(keyOf(item))} disabled={full} onToggle={() => toggle(item)} />
              ))}
            </Box>
            {photos.hasMore ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button variant="outlined" size="small" onClick={() => void photos.loadMore()} disabled={photos.loadingMore}>
                  {photos.loadingMore ? 'Loading…' : 'More photos'}
                </Button>
              </Box>
            ) : null}
          </>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 0.5 }}>
            {candidates.map((item) => (
              <Candidate key={keyOf(item)} item={item} selected={chosenKeys.has(keyOf(item))} disabled={full} onToggle={() => toggle(item)} />
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, md: 3 }, py: 1.75, gap: 1 }}>
        <Typography variant="body2" sx={{ color: error ? 'error.main' : 'text.secondary', mr: 'auto' }}>
          {error ?? (full ? `That’s all ${FEATURED_MAX}. Remove one to swap it.` : '')}
        </Typography>
        <Button color="inherit" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeaturedEditor;
