import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Skeleton, Tooltip, useMediaQuery, Switch, CircularProgress } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import { useTripShare } from '../hooks/useTripShare';

// Props 
interface TripShareModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  destinationCount: number;
  totalNights: number;
  /** Whether the current user owns this trip (shows link-share toggle when true) */
  isOwner?: boolean;
  /** Whether link sharing is currently enabled (Visibility = ReadOnly) */
  linkShareEnabled?: boolean;
  /** Callback when the link-share toggle changes */
  onLinkShareToggle?: (enabled: boolean) => Promise<void> | void;
}

// Inline SVG brand icons 

const FacebookIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const XIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const RedditIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const LinkIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

//  Share button configs

interface ShareButtonConfig {
  id: string;
  label: string;
  Icon: React.FC;
  /** Color applied on hover - MUI theme tokens like 'text.primary' are supported */
  brandColor: string;
}

const SHARE_BUTTONS: ShareButtonConfig[] = [
  { id: 'facebook',  label: 'Share on Facebook',   Icon: FacebookIcon,  brandColor: '#1877F2' },
  { id: 'whatsapp',  label: 'Share on WhatsApp',   Icon: WhatsAppIcon,  brandColor: '#25D366' },
  { id: 'x',         label: 'Share on X',           Icon: XIcon,         brandColor: 'text.primary' },
  { id: 'instagram', label: 'Copy for Instagram',  Icon: InstagramIcon, brandColor: '#E1306C' },
  { id: 'reddit',    label: 'Share on Reddit',      Icon: RedditIcon,    brandColor: '#FF4500' },
  { id: 'copy',      label: 'Copy link',            Icon: LinkIcon,      brandColor: '#6366f1' },
];

// Main component

const TripShareModal: React.FC<TripShareModalProps> = ({
  open,
  onClose,
  tripId,
  tripName,
  destinationCount,
  totalNights,
  isOwner = false,
  linkShareEnabled = false,
  onLinkShareToggle,
}) => {
  const isMobile = useMediaQuery('(max-width:767px)');

  const { isLoading, cardImageUrl, cardBlob, error, shareText, tripUrl } = useTripShare(tripId, {
    tripName,
    destinationCount,
    totalNights,
  });

  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [igTooltip, setIgTooltip] = useState(false);
  const [visible, setVisible] = useState(false);
  const [linkShareToggling, setLinkShareToggling] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);

  // Drive entry animation
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const encodedUrl = encodeURIComponent(tripUrl);
  const encodedText = encodeURIComponent(shareText);

  const handleCopyImage = useCallback(async () => {
    try {
      if (cardBlob) {
        const item = new ClipboardItem({ [cardBlob.type || 'image/png']: cardBlob });
        await navigator.clipboard.write([item]);
        setImageCopied(true);
        setTimeout(() => setImageCopied(false), 2000);
      }
    } catch {
      // Clipboard write not supported silently ignore
    }
  }, [cardBlob]);

  const handleShareButton = useCallback(
    async (id: string) => {
      switch (id) {
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, '_blank', 'noopener,noreferrer');
          break;
        case 'whatsapp':
          window.open(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`, '_blank', 'noopener,noreferrer');
          break;
        case 'x':
          window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank', 'noopener,noreferrer');
          break;
        case 'instagram': {
          if (cardBlob) {
            const a = document.createElement('a');
            const blobUrl = URL.createObjectURL(cardBlob);
            a.href = blobUrl;
            a.download = `tripician-${tripName.replace(/\s+/g, '-').toLowerCase()}.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          } else if (cardImageUrl) {
            const a = document.createElement('a');
            a.href = cardImageUrl;
            a.download = `tripician-${tripName.replace(/\s+/g, '-').toLowerCase()}.png`;
            a.click();
          }
          try { await navigator.clipboard.writeText(shareText); } catch {}
          setIgTooltip(true);
          setTimeout(() => setIgTooltip(false), 3000);
          break;
        }
        case 'reddit':
          window.open(`https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`, '_blank', 'noopener,noreferrer');
          break;
        case 'copy':
          try {
            await navigator.clipboard.writeText(tripUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
          break;
      }
    },
    [cardBlob, cardImageUrl, encodedText, encodedUrl, shareText, tripName, tripUrl],
  );

  const handleDownload = useCallback(() => {
    if (cardBlob) {
      const a = document.createElement('a');
      const blobUrl = URL.createObjectURL(cardBlob);
      a.href = blobUrl;
      a.download = `tripician-${tripName.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } else if (cardImageUrl) {
      const a = document.createElement('a');
      a.href = cardImageUrl;
      a.download = `tripician-${tripName.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
    }
  }, [cardBlob, cardImageUrl, tripName]);

  if (!open) return null;

  const panel = (
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 420,
        background: 'var(--color-background-primary, #fff)',
        backgroundColor: 'background.paper',
        borderRadius: isMobile ? '16px 16px 0 0' : 'var(--border-radius-xl, 20px)',
        p: '24px',
        boxSizing: 'border-box',
        transform: visible ? 'scale(1)' : isMobile ? 'translateY(100%)' : 'scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        maxHeight: isMobile ? '95dvh' : 'auto',
        overflowY: 'auto',
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { borderRadius: 4, bgcolor: 'rgba(0,0,0,0.15)' },
      }}
    >
      {/*Header*/}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '16px', fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif", color: 'text.primary' }}>
          Share your trip
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/*Section 1: Card preview with hover copy button*/}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        {isLoading ? (
          <Skeleton variant="rectangular" width={372} height={210} sx={{ borderRadius: '12px', maxWidth: '100%' }} />
        ) : error && error !== 'generating' ? (
          <Box sx={{ width: 372, maxWidth: '100%', height: 210, borderRadius: '12px', border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 13, color: 'text.disabled', fontFamily: "'Inter', sans-serif" }}>Could not load share card</Typography>
          </Box>
        ) : (
          <Box
            onMouseEnter={() => setCardHovered(true)}
            onMouseLeave={() => setCardHovered(false)}
            sx={{ position: 'relative', width: 372, maxWidth: '100%', borderRadius: '12px', lineHeight: 0 }}
          >
            <Box
              component="img"
              src={cardImageUrl ?? undefined}
              alt={`Share card for ${tripName}`}
              sx={{ width: '100%', borderRadius: '12px', display: 'block', objectFit: 'cover' }}
            />
            {/* Copy image button visible on hover only */}
            <Tooltip title={imageCopied ? 'Copied!' : 'Copy image'} placement="top" arrow>
              <Box
                component="button"
                onClick={handleCopyImage}
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  px: '10px',
                  py: '6px',
                  borderRadius: '20px',
                  border: 'none',
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(6px)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  cursor: 'pointer',
                  outline: 'none',
                  opacity: cardHovered ? 1 : 0,
                  transform: cardHovered ? 'translateY(0)' : 'translateY(-4px)',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                  pointerEvents: cardHovered ? 'auto' : 'none',
                  '&:hover': { background: 'rgba(0,0,0,0.72)' },
                  '&:active': { transform: 'scale(0.95)' },
                }}
              >
                {imageCopied
                  ? <><CheckRoundedIcon sx={{ fontSize: 14 }} /><span>Copied!</span></>
                  : <><ContentCopyRoundedIcon sx={{ fontSize: 14 }} /><span>Copy image</span></>
                }
              </Box>
            </Tooltip>
          </Box>
        )}
        <Typography sx={{ fontSize: '12px', color: 'text.secondary', textAlign: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
          {isLoading
            ? error === 'generating' ? 'Generating your card ¦' : 'Loading your card ¦'
            : 'Your trip card is ready to share'}
        </Typography>
      </Box>

      {/*  Section 2: Share icon-only buttons  */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        {SHARE_BUTTONS.map((btn) => {
          const isInstagram = btn.id === 'instagram';
          const isCopy = btn.id === 'copy';
          const isActive = isCopy && copied;

          return (
            <Tooltip
              key={btn.id}
              title={
                isInstagram && igTooltip
                  ? 'Image downloaded - paste it on Instagram!'
                  : isActive
                  ? 'Copied!'
                  : btn.label
              }
              placement="top"
              arrow
              open={isInstagram ? igTooltip || undefined : isActive ? true : undefined}
            >
              <Box
                component="button"
                onClick={() => handleShareButton(btn.id)}
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#22c55e' : 'text.disabled',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'color 0.22s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                  '&:hover': {
                    color: isActive ? '#22c55e' : btn.brandColor,
                    transform: 'scale(1.35)',
                  },
                  '&:active': { transform: 'scale(0.9)', transition: 'transform 0.08s ease' },
                  boxSizing: 'border-box',
                }}
              >
                {isActive ? <CheckRoundedIcon sx={{ fontSize: 30 }} /> : <btn.Icon />}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Section: Link sharing toggle (owner only - Google Drive style) */}
      {isOwner && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '12px',
            border: '0.5px solid',
            borderColor: 'divider',
            px: 2,
            py: 1.5,
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <LinkRoundedIcon sx={{ fontSize: 20, color: linkShareEnabled ? '#6366f1' : 'text.disabled', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", color: 'text.primary', lineHeight: 1.4 }}>
                Anyone with the link can view
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.4 }}>
                {linkShareEnabled ? 'Link sharing is on - anyone can see this trip' : 'Only trip members can access this link'}
              </Typography>
            </Box>
          </Box>
          {linkShareToggling ? (
            <CircularProgress size={20} sx={{ flexShrink: 0 }} />
          ) : (
            <Switch
              checked={linkShareEnabled}
              size="small"
              disabled={!onLinkShareToggle}
              onChange={async (e) => {
                if (!onLinkShareToggle) return;
                setLinkShareToggling(true);
                try { await onLinkShareToggle(e.target.checked); } finally { setLinkShareToggling(false); }
              }}
              sx={{
                flexShrink: 0,
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6366f1' },
              }}
            />
          )}
        </Box>
      )}

      {/*Section 3: Download button*/}
      <Box
        component="button"
        onClick={handleDownload}
        disabled={!cardImageUrl && !cardBlob}
        sx={{
          width: '100%',
          borderRadius: '12px',
          padding: '12px',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: "'Inter', system-ui, sans-serif",
          background: 'transparent',
          backgroundColor: 'transparent',
          color: 'text.primary',
          border: '0.5px solid',
          borderColor: 'divider',
          cursor: (!cardImageUrl && !cardBlob) ? 'not-allowed' : 'pointer',
          opacity: (!cardImageUrl && !cardBlob) ? 0.45 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          outline: 'none',
          transition: 'background-color 0.15s, opacity 0.15s',
          '&:hover:not(:disabled)': { backgroundColor: 'action.hover' },
          boxSizing: 'border-box',
        }}
      >
        <DownloadIcon />
        Download as image
      </Box>
    </Box>
  );

  return (
    <Box
      onClick={onClose}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        p: isMobile ? 0 : 2,
      }}
    >
      {panel}
    </Box>
  );
};

export default TripShareModal;
