import React from 'react';
import { Avatar, Box, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { IconHash, IconPhoto, IconSearch } from '@tabler/icons-react';
import CountryFlag from '../../components/ui/CountryFlag';
import { squareThumb } from '../../utils/imageThumb';

const VISUAL = 44;

interface ResultRowProps {
  to: string;
  state?: unknown;
  visual: React.ReactNode;
  title: string;
  subtitle?: string | null;
  /** Sits outside the link, so a button here never nests inside an anchor. */
  trailing?: React.ReactNode;
  onOpen?: () => void;
}

// One row for every kind of result, so people, places, groups and tags scan as one list.
const ResultRow: React.FC<ResultRowProps> = ({ to, state, visual, title, subtitle, trailing, onOpen }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderRadius: '12px',
        transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover': { bgcolor: theme.custom.surface.hover },
      }}
    >
      <Box
        component={RouterLink}
        to={to}
        state={state}
        onClick={onOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flex: 1,
          minWidth: 0,
          px: 1.25,
          py: 1,
          color: 'inherit',
          textDecoration: 'none',
          borderRadius: '12px',
          '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
        }}
      >
        <Box sx={{ flexShrink: 0, display: 'flex' }}>{visual}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: 'text.primary' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" noWrap component="div" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {trailing && <Box sx={{ flexShrink: 0, pr: 1.25 }}>{trailing}</Box>}
    </Box>
  );
};

export default ResultRow;

export const PersonVisual: React.FC<{ name: string; src?: string | null }> = ({ name, src }) => (
  <Avatar src={src ?? undefined} alt="" sx={{ width: VISUAL, height: VISUAL, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>
    {name.charAt(0).toUpperCase()}
  </Avatar>
);

export const GroupVisual: React.FC<{ name: string; src?: string | null }> = ({ name, src }) => (
  <Avatar src={src ?? undefined} alt="" variant="rounded" sx={{ width: VISUAL, height: VISUAL, borderRadius: '12px', bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>
    {name.charAt(0).toUpperCase()}
  </Avatar>
);

export const PlaceVisual: React.FC<{ name: string }> = ({ name }) => (
  <CountryFlag country={name} size={VISUAL} variant="circle" />
);

const GlyphCircle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        width: VISUAL,
        height: VISUAL,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        border: `1px solid ${theme.custom.surface.border}`,
        color: 'text.primary',
        bgcolor: 'background.paper',
      }}
    >
      {children}
    </Box>
  );
};

export const TagVisual: React.FC = () => <GlyphCircle><IconHash size={20} stroke={1.9} /></GlyphCircle>;

export const QueryVisual: React.FC = () => <GlyphCircle><IconSearch size={19} stroke={1.9} /></GlyphCircle>;

export const ThumbVisual: React.FC<{ src?: string | null }> = ({ src }) => {
  const theme = useTheme();
  const [failed, setFailed] = React.useState(false);
  const thumb = failed ? null : squareThumb(src, VISUAL * 2);
  return (
    <Box
      sx={{
        width: VISUAL,
        height: VISUAL,
        borderRadius: '10px',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        bgcolor: theme.custom.surface.active,
        color: 'text.disabled',
      }}
    >
      {thumb ? (
        <Box component="img" src={thumb} alt="" loading="lazy" onError={() => setFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <IconPhoto size={18} />
      )}
    </Box>
  );
};
