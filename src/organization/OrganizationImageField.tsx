import React from 'react';
import { Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import { IconPhotoPlus, IconTrash } from '@tabler/icons-react';
import { uploadSigned, UploadError } from '../utils/signedUpload';

const MAX_BYTES = 8 * 1024 * 1024;

interface OrganizationImageFieldProps {
  organizationId: string | null;
  slot: 'logo' | 'cover' | 'post';
  label: string;
  hint?: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Logos are square; covers and post pictures are wide. */
  aspect?: string;
  disabled?: boolean;
}

/**
 * Pick a picture for an organisation.
 *
 * Uploads straight to Cloudinary through a signature this organisation's admins
 * are the only ones who can mint. A brand-new organisation has no id yet, so the
 * field falls back to explaining that rather than offering a control that cannot
 * work.
 */
const OrganizationImageField: React.FC<OrganizationImageFieldProps> = ({
  organizationId, slot, label, hint, value, onChange, aspect = '16 / 6', disabled = false,
}) => {
  const theme = useTheme();
  const border = theme.custom.surface.border;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pick = async (file: File) => {
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadSigned({
        signUrl: `/api/organizations/${organizationId}/media/upload-url`,
        file,
        maxBytes: MAX_BYTES,
        signBody: { slot },
      });
      // Cache-bust: logo and cover keep a stable public id and overwrite, so the
      // URL does not change when the picture does.
      onChange(`${url}?v=${Date.now()}`);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'That upload did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
        {label}
      </Typography>

      <Box
        sx={{
          aspectRatio: slot === 'logo' ? '1 / 1' : aspect,
          width: slot === 'logo' ? 96 : '100%',
          borderRadius: slot === 'logo' ? '16px' : '12px',
          border: `1px ${value ? 'solid' : 'dashed'} ${border}`,
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          position: 'relative',
        }}
      >
        {value
          ? <Box component="img" src={value} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <IconPhotoPlus size={22} style={{ color: theme.palette.text.disabled }} />}
        {busy && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(0,0,0,0.35)' }}>
            <CircularProgress size={22} sx={{ color: '#fff' }} />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Button
          size="small"
          disabled={disabled || busy || !organizationId}
          onClick={() => inputRef.current?.click()}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {value ? 'Replace' : 'Upload'}
        </Button>
        {value && (
          <Button
            size="small"
            color="inherit"
            disabled={disabled || busy}
            onClick={() => onChange(null)}
            startIcon={<IconTrash size={14} />}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Remove
          </Button>
        )}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void pick(file);
        }}
      />

      {!organizationId && (
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
          Save the organization first, then add a picture.
        </Typography>
      )}
      {hint && !error && (
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
          {hint}
        </Typography>
      )}
      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default OrganizationImageField;
