import React from 'react';
import { Box, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { IconPhotoPlus, IconX } from '@tabler/icons-react';
import type { PendingScreenshot } from './usePlanImport';

interface AttachButtonProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  preparing?: boolean;
  size?: number;
}

/**
 * The way in: pick screenshots of a plan you already wrote.
 *
 * `type="button"` is not optional. Quick Plan is a real <form>, and a bare
 * button inside it submits the form instead of opening the picker.
 */
export const PlanImportAttachButton: React.FC<AttachButtonProps> = ({
  onFiles, disabled = false, preparing = false, size = 32,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <>
      <Tooltip title="Import a plan from screenshots" arrow placement="top">
        <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0 }}>
          <IconButton
            type="button"
            disabled={disabled || preparing}
            onClick={() => inputRef.current?.click()}
            aria-label="Import a plan from screenshots"
            sx={(t) => ({
              width: size,
              height: size,
              borderRadius: '50%',
              color: 'text.secondary',
              transition: `color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
              '&:hover': { color: 'primary.main', bgcolor: t.custom.surface.brandTint },
            })}
          >
            {preparing
              ? <CircularProgress size={14} thickness={5} sx={{ color: 'text.disabled' }} />
              : <IconPhotoPlus size={Math.round(size * 0.55)} stroke={1.8} />}
          </IconButton>
        </Box>
      </Tooltip>

      <Box
        component="input"
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        sx={{ display: 'none' }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(e.target.files ?? []);
          // Cleared first so picking the same file twice still fires a change.
          e.target.value = '';
          if (files.length > 0) onFiles(files);
        }}
      />
    </>
  );
};

interface StripProps {
  screenshots: PendingScreenshot[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

/** What is attached, small, with a way to take one back out. */
export const PlanImportStrip: React.FC<StripProps> = ({ screenshots, onRemove, disabled = false }) => {
  if (screenshots.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {screenshots.map((shot) => (
        <Box
          key={shot.id}
          sx={(t) => ({
            position: 'relative',
            width: 54,
            height: 54,
            borderRadius: '10px',
            overflow: 'hidden',
            border: `1px solid ${t.custom.surface.border}`,
            flexShrink: 0,
          })}
        >
          <Box
            component="img"
            src={shot.previewUrl}
            alt={shot.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {!disabled && (
            <IconButton
              type="button"
              size="small"
              onClick={() => onRemove(shot.id)}
              aria-label={`Remove ${shot.name}`}
              sx={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 18,
                height: 18,
                bgcolor: 'rgba(0,0,0,0.55)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
              }}
            >
              <IconX size={11} stroke={2.4} />
            </IconButton>
          )}
        </Box>
      ))}
    </Box>
  );
};
