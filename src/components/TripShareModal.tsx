import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Skeleton, Tooltip, useMediaQuery, Switch, CircularProgress, useTheme } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import { useTripShare } from '../hooks/useTripShare';
import { BRAND } from '../theme';

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
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const XIcon = () => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const RedditIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const LinkIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
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

/**
 * Labels say what each platform actually does with a link, rather than pretending
 * they all behave the same:
 *  - WhatsApp and Messenger render link previews natively, so a link is ideal
 *  - Facebook throttles posts containing external links, so the image is the post
 *    and the link belongs in the first comment
 *  - Instagram has no clickable caption links at all, so it's image + link in bio
 */
const SHARE_BUTTONS: ShareButtonConfig[] = [
  { id: 'whatsapp',  label: 'WhatsApp - link previews perfectly here', Icon: WhatsAppIcon,  brandColor: '#25D366' },
  { id: 'facebook',  label: 'Facebook - post it, then put the link in your first comment', Icon: FacebookIcon,  brandColor: '#1877F2' },
  { id: 'instagram', label: 'Instagram - saves the image, copies your caption', Icon: InstagramIcon, brandColor: '#E1306C' },
  { id: 'x',         label: 'Share on X',           Icon: XIcon,         brandColor: 'text.primary' },
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
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:767px)');

  const { isLoading, cardImageUrl, cardBlob, error, shareText, tripUrl } = useTripShare(tripId, {
    tripName,
    destinationCount,
    totalNights,
  });

  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [igHint, setIgHint] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [linkShareToggling, setLinkShareToggling] = useState(false);

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

  const fileName = `tripician-${tripName.replace(/\s+/g, '-').toLowerCase()}.png`;

  /**
   * Can this device hand the card image to the OS share sheet?
   *
   * This is the only realistic route from a web app into Instagram: the
   * `instagram-stories://` scheme is native-app only, and Instagram does not
   * accept clickable links in captions at all. A shared *file* lands in the
   * normal share sheet next to Instagram, WhatsApp and Messenger.
   */
  const canShareFile = useCallback((blob: Blob | null): boolean => {
    if (!blob || typeof navigator === 'undefined' || !navigator.canShare) return false;
    try {
      const file = new File([blob], 'trip.png', { type: blob.type || 'image/png' });
      return navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  }, []);

  const [nativeShareBusy, setNativeShareBusy] = useState(false);

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tripUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable - nothing useful to say */ }
  }, [tripUrl]);

  /** One tap: image + caption + link straight into the OS share sheet. */
  const handleNativeShare = useCallback(async () => {
    if (nativeShareBusy) return;
    setNativeShareBusy(true);
    try {
      const file = cardBlob
        ? new File([cardBlob], fileName, { type: cardBlob.type || 'image/png' })
        : null;

      // Sharing the image and the link together is what makes this worth a tap:
      // the picture travels natively, the link still comes along for chat apps.
      if (file && canShareFile(cardBlob)) {
        await navigator.share({ files: [file], text: shareText, title: tripName, url: tripUrl });
      } else {
        await navigator.share({ text: shareText, title: tripName, url: tripUrl });
      }
    } catch {
      // AbortError just means the user dismissed the sheet - nothing to report.
    } finally {
      setNativeShareBusy(false);
    }
  }, [cardBlob, canShareFile, fileName, nativeShareBusy, shareText, tripName, tripUrl]);

  /**
   * The primary action, and it is never dead. Where the OS has a share sheet that
   * is the shortest path anywhere; where it does not - most desktops - the useful
   * primary is the link, so that is what the button becomes. Previously the button
   * simply did not render without navigator.share, which left desktop with a modal
   * that had no primary action at all.
   */
  const primaryIsNativeShare = supportsNativeShare;
  const handlePrimary = primaryIsNativeShare ? handleNativeShare : copyLink;

  const primaryLabel = primaryIsNativeShare
    ? (cardBlob ? 'Share trip & image' : 'Share trip')
    : (copied ? 'Link copied' : 'Copy link');

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

  const saveImage = useCallback(() => {
    const a = document.createElement('a');
    if (cardBlob) {
      const blobUrl = URL.createObjectURL(cardBlob);
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } else if (cardImageUrl) {
      a.href = cardImageUrl;
      a.download = fileName;
      a.click();
    } else {
      return false;
    }
    return true;
  }, [cardBlob, cardImageUrl, fileName]);

  const handleDownload = useCallback(() => {
    if (!saveImage()) return;
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }, [saveImage]);

  const handleShareButton = useCallback(
    async (id: string) => {
      switch (id) {
        case 'facebook':
          // The link now previews properly (server-rendered OG tags on /t/{id}),
          // so the sharer dialog finally shows this trip's own photo and title.
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, '_blank', 'noopener,noreferrer');
          break;
        case 'whatsapp':
          window.open(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`, '_blank', 'noopener,noreferrer');
          break;
        case 'x':
          window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank', 'noopener,noreferrer');
          break;
        case 'instagram': {
          // Instagram accepts no clickable link in a caption, so there is nothing
          // to "share" as a URL. The image is the post; the caption is copied for
          // pasting, and the link belongs in the bio. Prefer the native sheet when
          // the device has one - that goes straight into the app.
          const viaSheet = cardBlob !== null && canShareFile(cardBlob);
          if (viaSheet) {
            await handleNativeShare();
          } else {
            saveImage();
          }
          try { await navigator.clipboard.writeText(shareText); } catch { /* clipboard optional */ }
          // The hint has to match the branch taken: it used to say the image had
          // been downloaded even when it had gone to the share sheet instead.
          setIgHint(viaSheet
            ? 'Caption copied - paste it in Instagram'
            : 'Image saved - caption copied, ready to paste');
          setTimeout(() => setIgHint(null), 3000);
          break;
        }
        case 'reddit':
          window.open(`https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`, '_blank', 'noopener,noreferrer');
          break;
        case 'copy':
          await copyLink();
          break;
      }
    },
    [cardBlob, canShareFile, copyLink, encodedText, encodedUrl, handleNativeShare, saveImage, shareText],
  );

  // When the primary button already is Copy link, the icon would be the same
  // action twice in the same modal.
  const shareButtons = primaryIsNativeShare
    ? SHARE_BUTTONS
    : SHARE_BUTTONS.filter((b) => b.id !== 'copy');

  const hasImage = !!(cardBlob || cardImageUrl);
  const canCopyImage = typeof window !== 'undefined' && 'ClipboardItem' in window && !!cardBlob;

  if (!open) return null;

  const border = theme.custom.surface.border;

  /** Quiet text action - Download / Copy image live here rather than as buttons. */
  const textAction = (
    label: string,
    active: boolean,
    activeLabel: string,
    onClick: () => void,
    disabled = false,
  ) => (
    <Box
      component="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        background: 'none',
        border: 'none',
        p: 0,
        font: 'inherit',
        
        fontSize: 13,
        fontWeight: 500,
        color: active ? 'success.main' : 'text.secondary',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        outline: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        transition: `color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover:not(:disabled)': { color: 'text.primary' },
      }}
    >
      {active && <CheckRoundedIcon sx={{ fontSize: 15 }} />}
      {active ? activeLabel : label}
    </Box>
  );

  const panel = (
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 400,
        backgroundColor: 'background.paper',
        borderRadius: isMobile ? '20px 20px 0 0' : '20px',
        boxShadow: theme.custom.shadows.overlay,
        p: '22px',
        boxSizing: 'border-box',
        transform: visible ? 'scale(1)' : isMobile ? 'translateY(100%)' : 'scale(0.96)',
        opacity: visible ? 1 : 0,
        transition: `transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.enter}, opacity ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.enter}`,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxHeight: isMobile ? '95dvh' : 'auto',
        overflowY: 'auto',
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { borderRadius: 4, bgcolor: border },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary' }}>
          Share your trip
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Card preview. The box is 4:5 whatever happens, so the modal never resizes
          when the image arrives - the old fixed 372x210 skeleton matched neither
          the card's real shape nor its replacement. */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: 240, maxWidth: '100%', aspectRatio: '4 / 5', position: 'relative' }}>
          {isLoading ? (
            <Skeleton variant="rectangular" sx={{ width: '100%', height: '100%', borderRadius: '14px' }} />
          ) : error && error !== 'generating' ? (
            <Box sx={{
              width: '100%', height: '100%', borderRadius: '14px',
              border: '1px dashed', borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2,
            }}>
              <Typography sx={{ fontSize: 13, color: 'text.disabled', textAlign: 'center' }}>
                Could not load the card. Your link still works.
              </Typography>
            </Box>
          ) : (
            <Box
              component="img"
              src={cardImageUrl ?? undefined}
              alt={`Share card for ${tripName}`}
              sx={{
                width: '100%', height: '100%', objectFit: 'cover',
                borderRadius: '14px', display: 'block',
                boxShadow: theme.custom.shadows.card,
              }}
            />
          )}
        </Box>
      </Box>

      {isLoading && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center', mt: -1 }}>
          {error === 'generating' ? 'Generating your card…' : 'Loading your card…'}
        </Typography>
      )}

      {/* Primary action */}
      <Box
        component="button"
        onClick={handlePrimary}
        disabled={nativeShareBusy}
        sx={{
          width: '100%',
          borderRadius: '12px',
          padding: '13px',
          fontSize: 14.5,
          fontWeight: 600,
          
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          border: 'none',
          cursor: nativeShareBusy ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          outline: 'none',
          transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
          '&:hover:not(:disabled)': { backgroundColor: BRAND.coralDark },
          '&:active:not(:disabled)': { backgroundColor: BRAND.coralDeep },
          boxSizing: 'border-box',
        }}
      >
        {primaryIsNativeShare
          ? <IosShareRoundedIcon sx={{ fontSize: 18 }} />
          : copied ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : <LinkRoundedIcon sx={{ fontSize: 18 }} />}
        {primaryLabel}
      </Box>

      {/* Secondary: the per-platform routes */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25, flexWrap: 'wrap' }}>
        {shareButtons.map((btn) => {
          const isInstagram = btn.id === 'instagram';
          const isCopy = btn.id === 'copy';
          const isActive = isCopy && copied;

          return (
            <Tooltip
              key={btn.id}
              title={isInstagram && igHint ? igHint : isActive ? 'Copied!' : btn.label}
              placement="top"
              arrow
              open={isInstagram ? (igHint ? true : undefined) : isActive ? true : undefined}
            >
              <Box
                component="button"
                aria-label={btn.label}
                onClick={() => handleShareButton(btn.id)}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'none',
                  border: 'none',
                  color: isActive ? 'success.main' : 'text.secondary',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: `color ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}, background-color ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
                  '&:hover': {
                    color: isActive ? 'success.main' : btn.brandColor,
                    backgroundColor: theme.custom.surface.hover,
                  },
                  '&:active': { transform: 'scale(0.92)' },
                  boxSizing: 'border-box',
                }}
              >
                {isActive ? <CheckRoundedIcon sx={{ fontSize: 24 }} /> : <btn.Icon />}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Tertiary: image actions. These were a full-width button and a pill that
          only appeared on hover - which meant it did not exist on touch at all. */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5 }}>
        {textAction('Download image', downloaded, 'Saved', handleDownload, !hasImage)}
        {canCopyImage && (
          <>
            <Box component="span" sx={{ color: 'text.disabled', fontSize: 12 }}>·</Box>
            {textAction('Copy image', imageCopied, 'Copied', handleCopyImage)}
          </>
        )}
      </Box>

      {/* Link sharing toggle (owner only - Google Drive style) */}
      {isOwner && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '12px',
            border: `1px solid ${border}`,
            px: 2,
            py: 1.5,
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <LinkRoundedIcon sx={{ fontSize: 20, color: linkShareEnabled ? 'primary.main' : 'text.disabled', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', lineHeight: 1.4 }}>
                Anyone with the link can view
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.4 }}>
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
              sx={{ flexShrink: 0 }}
            />
          )}
        </Box>
      )}
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
