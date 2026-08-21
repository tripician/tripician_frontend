/**
 * The edit form for each block type.
 *
 * Every editor is a controlled component over one block and reports the whole
 * replacement block, so the canvas never has to know what any block type
 * contains. Adding a block type touches this file, the schema, and the reader,
 * and nothing else.
 */

import React from 'react';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconTrash,
  IconPhotoPlus,
  IconPlus,
  IconLink,
  IconHeartFilled,
  IconThumbUp,
  IconArrowRampRight,
  IconSparkles,
} from '@tabler/icons-react';
import RichTextField from './RichTextField';
import PolishPopover from './PolishPopover';
import { useUpload } from './useUpload';
import { parseVideoUrl, defaultThumbUrl } from '../videoEmbed';
import { stripHtml, plainTextToHtml } from '../blockSchema';
import { safeExternalUrl } from '../../utils/sanitizeHtml';
import { STORY_LIMITS } from '../types';
import { STORY_FIELD_SX } from '../storyFormat';
import type { StoryBlock, PhotoWidth, GalleryLayout, ListStyle, PlaceVerdict } from '../types';

export interface BlockEditorProps<T extends StoryBlock = StoryBlock> {
  block: T;
  onChange: (next: T) => void;
  /** Uploads one file and resolves to its stored URL. */
  onUpload: (file: File) => Promise<string>;
  measure: number;
  photoBudgetLeft: number;
}


// ── prose ───────────────────────────────────────────────────────────────────

export const TextBlockEditor: React.FC<BlockEditorProps<Extract<StoryBlock, { type: 'text' }>>> = ({
  block,
  onChange,
  measure,
}) => {
  const [polishAnchor, setPolishAnchor] = React.useState<HTMLElement | null>(null);
  const hasText = stripHtml(block.html).trim().length >= 12;

  return (
    <Box>
      <RichTextField
        value={block.html}
        onChange={(html) => onChange({ ...block, html })}
        measure={measure}
        placeholder="What happened here?"
      />

      {hasText && (
        <Button
          size="small"
          startIcon={<IconSparkles size={14} />}
          onClick={(e) => setPolishAnchor(e.currentTarget)}
          sx={{ mt: 0.5, color: 'text.secondary' }}
        >
          Check this passage
        </Button>
      )}

      <PolishPopover
        anchorEl={polishAnchor}
        html={block.html}
        onClose={() => setPolishAnchor(null)}
        // Accepting replaces the block with plain text. Navia is handed text and
        // returns text, so re-applying old formatting to a rewritten sentence
        // would put emphasis on words that may no longer be there.
        onAccept={(text) => onChange({ ...block, html: plainTextToHtml(text) })}
      />
    </Box>
  );
};

export const HeadingBlockEditor: React.FC<BlockEditorProps<Extract<StoryBlock, { type: 'heading' }>>> = ({
  block,
  onChange,
}) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
      <TextField
        fullWidth
        variant="standard"
        placeholder="Section heading"
        value={block.text}
        onChange={(e) => onChange({ ...block, text: e.target.value.slice(0, 160) })}
        slotProps={{
          input: {
            disableUnderline: true,
            sx: {
              fontFamily: theme.custom.fontDisplay,
              fontWeight: 700,
              fontSize: block.level === 3 ? '1.25rem' : '1.5rem',
              letterSpacing: '-0.02em',
            },
          },
        }}
      />
      <ToggleButtonGroup
        exclusive
        size="small"
        value={block.level}
        onChange={(_, level) => level && onChange({ ...block, level })}
        aria-label="Heading level"
      >
        <ToggleButton value={2} sx={{ px: 1.25, py: 0.25, fontSize: 12 }}>
          H2
        </ToggleButton>
        <ToggleButton value={3} sx={{ px: 1.25, py: 0.25, fontSize: 12 }}>
          H3
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export const QuoteBlockEditor: React.FC<BlockEditorProps<Extract<StoryBlock, { type: 'quote' }>>> = ({
  block,
  onChange,
}) => (
  <Box sx={{ display: 'grid', gap: 1 }}>
    <TextField
      fullWidth
      multiline
      minRows={2}
      placeholder="Something worth pulling out"
      value={block.text}
      onChange={(e) => onChange({ ...block, text: e.target.value.slice(0, 600) })}
      sx={STORY_FIELD_SX}
    />
    <TextField
      fullWidth
      size="small"
      placeholder="Who said it (optional)"
      value={block.attribution ?? ''}
      onChange={(e) => onChange({ ...block, attribution: e.target.value.slice(0, 120) || undefined })}
      sx={STORY_FIELD_SX}
    />
  </Box>
);

// ── media ───────────────────────────────────────────────────────────────────

export const PhotoBlockEditor: React.FC<BlockEditorProps<Extract<StoryBlock, { type: 'photo' }>>> = ({
  block,
  onChange,
  onUpload,
  photoBudgetLeft,
}) => {
  const { busy, error, pick } = useUpload(onUpload);

  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      {block.url ? (
        <Box
          component="img"
          src={block.url}
          alt=""
          sx={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: '12px' }}
        />
      ) : (
        <UploadDropZone
          busy={busy}
          disabled={photoBudgetLeft <= 0}
          label={photoBudgetLeft <= 0 ? 'Photo limit reached for this story' : 'Add a photo'}
          onPick={(file) => pick(file, (url) => onChange({ ...block, url }))}
        />
      )}

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {error}
        </Typography>
      )}

      {block.url && (
        <>
          <TextField
            fullWidth
            size="small"
            placeholder="Caption (optional)"
            value={block.caption ?? ''}
            onChange={(e) => onChange({ ...block, caption: e.target.value.slice(0, 300) || undefined })}
            sx={STORY_FIELD_SX}
          />
          <TextField
            fullWidth
            size="small"
            placeholder="Describe the photo for screen readers"
            value={block.alt ?? ''}
            onChange={(e) => onChange({ ...block, alt: e.target.value.slice(0, 200) || undefined })}
            sx={STORY_FIELD_SX}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={block.width}
            onChange={(_, width: PhotoWidth | null) => width && onChange({ ...block, width })}
            aria-label="Photo width"
          >
            <ToggleButton value="inset" sx={{ px: 1.5, py: 0.4, fontSize: 12 }}>
              Inset
            </ToggleButton>
            <ToggleButton value="wide" sx={{ px: 1.5, py: 0.4, fontSize: 12 }}>
              Wide
            </ToggleButton>
            <ToggleButton value="full" sx={{ px: 1.5, py: 0.4, fontSize: 12 }}>
              Full bleed
            </ToggleButton>
          </ToggleButtonGroup>
        </>
      )}
    </Box>
  );
};

export const GalleryBlockEditor: React.FC<BlockEditorProps<Extract<StoryBlock, { type: 'gallery' }>>> = ({
  block,
  onChange,
  onUpload,
  photoBudgetLeft,
}) => {
  const theme = useTheme();
  const { busy, error, pick } = useUpload(onUpload);

  const room = Math.min(STORY_LIMITS.maxGalleryItems - block.items.length, photoBudgetLeft);

  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: 1,
        }}
      >
        {block.items.map((item, index) => (
          <Box key={`${item.url}-${index}`} sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={item.url}
              alt=""
              sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px' }}
            />
            <IconButton
              size="small"
              aria-label="Remove photo"
              onClick={() =>
                onChange({ ...block, items: block.items.filter((_, i) => i !== index) })
              }
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 24,
                height: 24,
                color: '#fff',
                bgcolor: 'rgba(15,15,19,0.6)',
                '&:hover': { bgcolor: 'rgba(15,15,19,0.8)' },
              }}
            >
              <IconTrash size={13} />
            </IconButton>
          </Box>
        ))}

        {room > 0 && (
          <Box
            component="label"
            sx={{
              display: 'grid',
              placeItems: 'center',
              aspectRatio: '1',
              borderRadius: '10px',
              cursor: busy ? 'progress' : 'pointer',
              border: `1px dashed ${theme.custom.surface.border}`,
              color: 'text.secondary',
              '&:hover': { bgcolor: theme.custom.surface.hover },
            }}
          >
            <IconPhotoPlus size={20} />
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={busy}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).slice(0, room);
                e.target.value = '';
                void (async () => {
                  const added = [...block.items];
                  for (const file of files) {
                    // Sequential rather than parallel: a phone photo library
                    // selection can be twenty files, and firing twenty uploads
                    // at once is how a mobile connection stalls all of them.
                    await pick(file, (url) => added.push({ url }));
                  }
                  onChange({ ...block, items: added });
                })();
              }}
            />
          </Box>
        )}
      </Box>

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {error}
        </Typography>
      )}

      <ToggleButtonGroup
        exclusive
        size="small"
        value={block.layout}
        onChange={(_, layout: GalleryLayout | null) => layout && onChange({ ...block, layout })}
        aria-label="Gallery layout"
      >
        <ToggleButton value="grid" sx={{ px: 1.5, py: 0.4, fontSize: 12 }}>
          Grid
        </ToggleButton>
        <ToggleButton value="strip" sx={{ px: 1.5, py: 0.4, fontSize: 12 }}>
          Scrolling strip
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

/**
 * The block that holds extra videos. Anything pasted here becomes a card, never
 * a player: a story shows one moving image and it is the cover.
 */
export const RelatedBlockEditor: React.FC<BlockEditorProps<Extract<StoryBlock, { type: 'related' }>>> = ({
  block,
  onChange,
}) => {
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const add = () => {
    const url = safeExternalUrl(draft);
    if (!url) {
      setError('That does not look like a link.');
      return;
    }
    if (block.items.length >= STORY_LIMITS.maxRelatedItems) {
      setError(`You can add up to ${STORY_LIMITS.maxRelatedItems} links here.`);
      return;
    }

    const video = parseVideoUrl(url);
    onChange({
      ...block,
      items: [
        ...block.items,
        video
          ? {
              kind: 'video',
              url,
              provider: video.provider,
              ...(defaultThumbUrl(video.provider, video.id)
                ? { thumbUrl: defaultThumbUrl(video.provider, video.id) as string }
                : {}),
            }
          : { kind: 'link', url },
      ],
    });
    setDraft('');
    setError(null);
  };

  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      {block.items.map((item, index) => (
        <Box key={`${item.url}-${index}`} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Title (optional)"
            value={item.title ?? ''}
            onChange={(e) => {
              const items = [...block.items];
              items[index] = { ...item, title: e.target.value.slice(0, 160) || undefined };
              onChange({ ...block, items });
            }}
            helperText={item.url}
            sx={STORY_FIELD_SX}
          />
          <IconButton
            aria-label="Remove link"
            onClick={() => onChange({ ...block, items: block.items.filter((_, i) => i !== index) })}
            sx={{ color: 'text.secondary' }}
          >
            <IconTrash size={16} />
          </IconButton>
        </Box>
      ))}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Paste a YouTube, Vimeo or any other link"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          error={Boolean(error)}
          helperText={error}
          sx={STORY_FIELD_SX}
        />
        <Button onClick={add} startIcon={<IconLink size={15} />} sx={{ flexShrink: 0 }}>
          Add
        </Button>
      </Box>
    </Box>
  );
};

// ── structured ──────────────────────────────────────────────────────────────

const VERDICTS: Array<{ value: PlaceVerdict; label: string; Icon: React.ElementType }> = [
  { value: 'loved', label: 'Loved it', Icon: IconHeartFilled },
  { value: 'liked', label: 'Worth it', Icon: IconThumbUp },
  { value: 'skip', label: 'Would skip', Icon: IconArrowRampRight },
];

export const PlaceBlockEditor: React.FC<BlockEditorProps<Extract<StoryBlock, { type: 'place' }>>> = ({
  block,
  onChange,
}) => (
  <Box sx={{ display: 'grid', gap: 1.25 }}>
    <TextField
      fullWidth
      size="small"
      placeholder="Place name"
      value={block.name}
      onChange={(e) => onChange({ ...block, name: e.target.value.slice(0, 160) })}
      sx={STORY_FIELD_SX}
    />
    <TextField
      fullWidth
      multiline
      minRows={2}
      size="small"
      placeholder="What was it actually like?"
      value={block.note ?? ''}
      onChange={(e) => onChange({ ...block, note: e.target.value.slice(0, 600) || undefined })}
      sx={STORY_FIELD_SX}
    />
    <ToggleButtonGroup
      exclusive
      size="small"
      value={block.verdict ?? null}
      onChange={(_, verdict: PlaceVerdict | null) => onChange({ ...block, verdict: verdict ?? undefined })}
      aria-label="Your verdict"
    >
      {VERDICTS.map(({ value, label, Icon }) => (
        <ToggleButton key={value} value={value} sx={{ px: 1.5, py: 0.4, fontSize: 12, gap: 0.5 }}>
          <Icon size={13} />
          {label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  </Box>
);

export const ListBlockEditor: React.FC<BlockEditorProps<Extract<StoryBlock, { type: 'list' }>>> = ({
  block,
  onChange,
}) => {
  const setItem = (index: number, value: string) => {
    const items = [...block.items];
    items[index] = value.slice(0, 200);
    onChange({ ...block, items });
  };

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Select
          size="small"
          value={block.style}
          onChange={(e) => onChange({ ...block, style: e.target.value as ListStyle })}
          sx={{ borderRadius: '12px', minWidth: 150 }}
        >
          <MenuItem value="musttry">Must try</MenuItem>
          <MenuItem value="tips">Worth knowing</MenuItem>
          <MenuItem value="plain">Plain list</MenuItem>
        </Select>
        <TextField
          fullWidth
          size="small"
          placeholder="Custom title (optional)"
          value={block.title ?? ''}
          onChange={(e) => onChange({ ...block, title: e.target.value.slice(0, 120) || undefined })}
          sx={STORY_FIELD_SX}
        />
      </Box>

      {block.items.map((item, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={`Item ${index + 1}`}
            value={item}
            onChange={(e) => setItem(index, e.target.value)}
            onKeyDown={(e) => {
              // Enter adds the next line, which is what anyone typing a list
              // expects. Backspace on an empty line removes it.
              if (e.key === 'Enter') {
                e.preventDefault();
                if (block.items.length < 40) {
                  const items = [...block.items];
                  items.splice(index + 1, 0, '');
                  onChange({ ...block, items });
                }
              } else if (e.key === 'Backspace' && item === '' && block.items.length > 1) {
                e.preventDefault();
                onChange({ ...block, items: block.items.filter((_, i) => i !== index) });
              }
            }}
            sx={STORY_FIELD_SX}
          />
          {block.items.length > 1 && (
            <IconButton
              size="small"
              aria-label="Remove item"
              onClick={() => onChange({ ...block, items: block.items.filter((_, i) => i !== index) })}
              sx={{ color: 'text.secondary' }}
            >
              <IconTrash size={15} />
            </IconButton>
          )}
        </Box>
      ))}

      {block.items.length < 40 && (
        <Button
          size="small"
          startIcon={<IconPlus size={14} />}
          onClick={() => onChange({ ...block, items: [...block.items, ''] })}
          sx={{ justifySelf: 'start' }}
        >
          Add item
        </Button>
      )}
    </Box>
  );
};

export const CostBlockEditor: React.FC<BlockEditorProps<Extract<StoryBlock, { type: 'cost' }>>> = ({
  block,
  onChange,
}) => (
  <Box sx={{ display: 'grid', gap: 1 }}>
    <TextField
      size="small"
      label="Currency"
      value={block.currency}
      onChange={(e) => onChange({ ...block, currency: e.target.value.slice(0, 3).toUpperCase() })}
      sx={{ ...STORY_FIELD_SX, width: 120 }}
    />

    {block.rows.map((row, index) => (
      <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="What it was for"
          value={row.label}
          onChange={(e) => {
            const rows = [...block.rows];
            rows[index] = { ...row, label: e.target.value.slice(0, 120) };
            onChange({ ...block, rows });
          }}
          sx={STORY_FIELD_SX}
        />
        <TextField
          size="small"
          type="number"
          placeholder="0"
          value={Number.isFinite(row.amount) ? row.amount : ''}
          onChange={(e) => {
            const rows = [...block.rows];
            const amount = Number(e.target.value);
            rows[index] = { ...row, amount: Number.isFinite(amount) ? amount : 0 };
            onChange({ ...block, rows });
          }}
          sx={{ ...STORY_FIELD_SX, width: 130 }}
        />
        {block.rows.length > 1 && (
          <IconButton
            size="small"
            aria-label="Remove row"
            onClick={() => onChange({ ...block, rows: block.rows.filter((_, i) => i !== index) })}
            sx={{ color: 'text.secondary' }}
          >
            <IconTrash size={15} />
          </IconButton>
        )}
      </Box>
    ))}

    {block.rows.length < 30 && (
      <Button
        size="small"
        startIcon={<IconPlus size={14} />}
        onClick={() => onChange({ ...block, rows: [...block.rows, { label: '', amount: 0 }] })}
        sx={{ justifySelf: 'start' }}
      >
        Add row
      </Button>
    )}

    <TextField
      fullWidth
      size="small"
      placeholder="Anything the numbers do not say (optional)"
      value={block.note ?? ''}
      onChange={(e) => onChange({ ...block, note: e.target.value.slice(0, 300) || undefined })}
      sx={STORY_FIELD_SX}
    />
  </Box>
);

export const MapBlockEditor: React.FC<BlockEditorProps<Extract<StoryBlock, { type: 'map' }>>> = ({
  block,
  onChange,
}) => {
  const theme = useTheme();

  if (block.stops.length === 0) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: '12px',
          border: `1px dashed ${theme.custom.surface.border}`,
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">
          A route needs stops with coordinates. Use "Bring in from your plan" to pull them from the trip you
          already mapped.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {block.stops.map((stop, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', width: 20 }}>
            {index + 1}
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={stop.name}
            onChange={(e) => {
              const stops = [...block.stops];
              stops[index] = { ...stop, name: e.target.value.slice(0, 160) };
              onChange({ ...block, stops });
            }}
            sx={STORY_FIELD_SX}
          />
          <IconButton
            size="small"
            aria-label="Remove stop"
            onClick={() => onChange({ ...block, stops: block.stops.filter((_, i) => i !== index) })}
            sx={{ color: 'text.secondary' }}
          >
            <IconTrash size={15} />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
};

// ── shared bits ─────────────────────────────────────────────────────────────

export const UploadDropZone: React.FC<{
  busy: boolean;
  disabled?: boolean;
  label: string;
  onPick: (file: File) => void;
}> = ({ busy, disabled, label, onPick }) => {
  const theme = useTheme();
  const [over, setOver] = React.useState(false);

  return (
    <Box
      component="label"
      onDragOver={(e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e: React.DragEvent) => {
        e.preventDefault();
        setOver(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) onPick(file);
      }}
      sx={{
        display: 'grid',
        placeItems: 'center',
        gap: 0.75,
        py: 4,
        borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : busy ? 'progress' : 'pointer',
        border: `1px dashed ${over ? theme.palette.primary.main : theme.custom.surface.border}`,
        bgcolor: over ? theme.custom.surface.brandTint : 'transparent',
        color: disabled ? 'text.disabled' : 'text.secondary',
        transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
      }}
    >
      <IconPhotoPlus size={22} />
      <Typography variant="body2">{busy ? 'Uploading...' : label}</Typography>
      <input
        type="file"
        accept="image/*"
        hidden
        disabled={disabled || busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onPick(file);
        }}
      />
    </Box>
  );
};
