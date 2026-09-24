import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip, useMediaQuery, Switch, CircularProgress, useTheme } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import { apiServices } from '../services/APIs/apiServices';
import { tripInviteUrl } from '../seats/tripInvite';
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
  /** Whether the current user owns this trip: only an owner gets the invite link and the visibility switch. */
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
 * The plan link, for anywhere a link is worth reading. Instagram is gone with the
 * share card: it allows no clickable link in a caption, so without an image to
 * post there was nothing left for it to do.
 */
const SHARE_BUTTONS: ShareButtonConfig[] = [
  { id: 'whatsapp',  label: 'Send on WhatsApp',  Icon: WhatsAppIcon,  brandColor: '#25D366' },
  { id: 'facebook',  label: 'Share on Facebook', Icon: FacebookIcon,  brandColor: '#1877F2' },
  { id: 'x',         label: 'Share on X',        Icon: XIcon,         brandColor: 'text.primary' },
  { id: 'reddit',    label: 'Share on Reddit',   Icon: RedditIcon,    brandColor: '#FF4500' },
  { id: 'copy',      label: 'Copy link',         Icon: LinkIcon,      brandColor: '#6366f1' },
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

  const { shareText, tripUrl } = useTripShare(tripId, { tripName, destinationCount, totalNights });

  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const [linkShareToggling, setLinkShareToggling] = useState(false);

  /* The invite link: the one link that puts somebody ON the trip rather than in
     front of it. Only an owner can read or make it, so guests never ask. */
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!open || !isOwner || !tripId) return;
    let active = true;
    setInviteLoading(true);
    apiServices.getTripInvite(tripId)
      .then((resp) => { if (active) setInviteToken(resp.data?.token ?? null); })
      .catch(() => { if (active) setInviteToken(null); })
      .finally(() => { if (active) setInviteLoading(false); });
    return () => { active = false; };
  }, [open, isOwner, tripId]);

  const inviteUrl = inviteToken ? tripInviteUrl(window.location.origin, inviteToken) : null;
  const inviteText = `Come on this trip with me: ${tripName}`;

  const encodedUrl = encodeURIComponent(tripUrl);
  const encodedText = encodeURIComponent(shareText);

  const supportsNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
  const [nativeShareBusy, setNativeShareBusy] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tripUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable - nothing useful to say */ }
  }, [tripUrl]);

  const createInvite = useCallback(async () => {
    setInviteBusy(true);
    setInviteError(null);
    try {
      const resp = await apiServices.rotateTripInvite(tripId);
      setInviteToken(resp.data?.token ?? null);
    } catch {
      setInviteError('The link could not be made. Try again.');
    } finally {
      setInviteBusy(false);
    }
  }, [tripId]);

  const copyInvite = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      setInviteError('Copy failed. Select the link and copy it by hand.');
    }
  }, [inviteUrl]);

  /** The share sheet, carrying whichever link this button belongs to. */
  const nativeShare = useCallback(async (url: string, text: string) => {
    if (nativeShareBusy) return;
    setNativeShareBusy(true);
    try {
      await navigator.share({ text, title: tripName, url });
    } catch {
      // AbortError just means the sheet was dismissed - nothing to report.
    } finally {
      setNativeShareBusy(false);
    }
  }, [nativeShareBusy, tripName]);

  const handleShareButton = useCallback(
    async (id: string) => {
      switch (id) {
        case 'facebook':
          // The link previews properly (server-rendered OG tags on /t/{id}), so
          // the sharer dialog shows this trip's own photo and title.
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, '_blank', 'noopener,noreferrer');
          break;
        case 'whatsapp':
          window.open(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`, '_blank', 'noopener,noreferrer');
          break;
        case 'x':
          window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank', 'noopener,noreferrer');
          break;
        case 'reddit':
          window.open(`https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`, '_blank', 'noopener,noreferrer');
          break;
        case 'copy':
          await copyLink();
          break;
      }
    },
    [copyLink, encodedText, encodedUrl],
  );

  if (!open) return null;

  const border = theme.custom.surface.border;
  const overline = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.disabled' } as const;

  const primaryButton = (label: string, active: boolean, onClick: () => void, icon: React.ReactNode) => (
    <Box
      component="button"
      onClick={onClick}
      disabled={nativeShareBusy || inviteBusy}
      sx={{
        width: '100%',
        borderRadius: '12px',
        padding: '13px',
        fontSize: 14.5,
        fontWeight: 600,
        font: 'inherit',
        fontFamily: 'inherit',
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        border: 'none',
        cursor: nativeShareBusy || inviteBusy ? 'wait' : 'pointer',
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
      {active ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : icon}
      {label}
    </Box>
  );

  // What an owner sees first: the link that brings somebody onto the trip.
  const invitePanel = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography sx={overline}>Invite people to join</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
        Anyone who opens this link joins the trip and can plan it with you, even if they are new to Tripician.
      </Typography>

      {inviteLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
          <CircularProgress size={20} />
        </Box>
      ) : inviteUrl ? (
        <>
          <Box
            component="input"
            readOnly
            value={inviteUrl}
            aria-label="Invite link"
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()}
            sx={{
              width: '100%', height: 40, px: 1.5, borderRadius: '10px', boxSizing: 'border-box',
              border: `1px solid ${border}`, bgcolor: 'background.default',
              color: 'text.secondary', font: 'inherit', fontSize: 13,
            }}
          />
          {primaryButton(
            inviteCopied ? 'Invite link copied' : supportsNativeShare ? 'Send invite' : 'Copy invite link',
            inviteCopied,
            () => { if (supportsNativeShare) void nativeShare(inviteUrl, inviteText); else void copyInvite(); },
            supportsNativeShare ? <IosShareRoundedIcon sx={{ fontSize: 18 }} /> : <LinkRoundedIcon sx={{ fontSize: 18 }} />,
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              component="button"
              onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${inviteText} ${inviteUrl}`)}`, '_blank', 'noopener,noreferrer')}
              sx={{
                background: 'none', border: 'none', p: 0, font: 'inherit', fontSize: 13, fontWeight: 500,
                color: 'text.secondary', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.75,
                '&:hover': { color: '#25D366' },
              }}
            >
              <Box component="span" sx={{ display: 'inline-flex', '& svg': { width: 16, height: 16 } }}><WhatsAppIcon /></Box>
              Send on WhatsApp
            </Box>
            {supportsNativeShare && (
              <>
                <Box component="span" sx={{ color: 'text.disabled', fontSize: 12 }}>·</Box>
                <Box
                  component="button"
                  onClick={() => void copyInvite()}
                  sx={{
                    background: 'none', border: 'none', p: 0, font: 'inherit', fontSize: 13, fontWeight: 500,
                    color: inviteCopied ? 'success.main' : 'text.secondary', cursor: 'pointer',
                    '&:hover': { color: 'text.primary' },
                  }}
                >
                  {inviteCopied ? 'Copied' : 'Copy instead'}
                </Box>
              </>
            )}
          </Box>
          <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center' }}>
            Replace it or switch it off in Trip settings, under Crew.
          </Typography>
        </>
      ) : (
        primaryButton('Create an invite link', false, () => void createInvite(), <LinkRoundedIcon sx={{ fontSize: 18 }} />)
      )}

      {inviteError && (
        <Typography sx={{ fontSize: 12, color: 'error.main', textAlign: 'center' }}>{inviteError}</Typography>
      )}
    </Box>
  );

  const panel = (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label="Share your trip"
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
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary' }}>
            {isOwner ? 'Share your trip' : 'Share this trip'}
          </Typography>
          <Typography noWrap sx={{ fontSize: 12.5, color: 'text.secondary' }}>{tripName}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', flexShrink: 0, '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {isOwner && invitePanel}

      {isOwner && <Box sx={{ height: '1px', bgcolor: border }} />}

      {/* The plan link: for people who should read it, not come along. */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {isOwner && <Typography sx={overline}>Or just share the plan</Typography>}

        {!isOwner && primaryButton(
          copied ? 'Link copied' : supportsNativeShare ? 'Share trip' : 'Copy link',
          copied,
          () => { if (supportsNativeShare) void nativeShare(tripUrl, shareText); else void copyLink(); },
          supportsNativeShare ? <IosShareRoundedIcon sx={{ fontSize: 18 }} /> : <LinkRoundedIcon sx={{ fontSize: 18 }} />,
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25, flexWrap: 'wrap' }}>
          {SHARE_BUTTONS.map((btn) => {
            const isActive = btn.id === 'copy' && copied;
            return (
              <Tooltip
                key={btn.id}
                title={isActive ? 'Copied!' : btn.label}
                placement="top"
                arrow
                open={isActive ? true : undefined}
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
      </Box>

      {/* Who the plan link works for (owner only - Google Drive style) */}
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
                {linkShareEnabled ? 'Link sharing is on - anyone can see this trip' : 'Only trip members can open the plan link'}
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
