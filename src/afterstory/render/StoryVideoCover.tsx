/**
 * The one moving image in a story.
 *
 * Behaviour, in order of why it matters:
 *  - The poster paints first. An iframe on first paint costs a third-party
 *    connection and a player bundle before the reader has decided to stay.
 *  - The player is attached only once the cover is actually on screen, and the
 *    src is cleared when it leaves, which stops playback and releases the
 *    decoder rather than leaving a muted video running in a scrolled-past
 *    element.
 *  - Muted and looping, because a story page that starts making noise is a page
 *    people close. A sound control is offered rather than assumed.
 *  - prefers-reduced-motion gets the still with a play button. Autoplaying video
 *    at someone who asked the system not to move is not a small discourtesy.
 */

import React from 'react';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import { IconVolume, IconVolumeOff, IconPlayerPlayFilled } from '@tabler/icons-react';
import { embedUrl, fallbackThumbUrl, defaultThumbUrl, isValidVideoId } from '../videoEmbed';
import type { VideoProvider } from '../types';

interface StoryVideoCoverProps {
  provider: VideoProvider;
  videoId: string;
  thumbUrl?: string | null;
  title: string;
  /** Rendered over the video by the caller: title, byline, chips. */
  children?: React.ReactNode;
  /** Editor previews are smaller and should not chase the viewport. */
  height?: { xs: number; md: number };
}

const StoryVideoCover: React.FC<StoryVideoCoverProps> = ({
  provider,
  videoId,
  thumbUrl,
  title,
  children,
  height,
}) => {
  const theme = useTheme();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const [inView, setInView] = React.useState(false);
  const [withSound, setWithSound] = React.useState(false);
  const [posterFailed, setPosterFailed] = React.useState(false);
  const [manualPlay, setManualPlay] = React.useState(false);

  const reducedMotion = usePrefersReducedMotion();
  const valid = isValidVideoId(provider, videoId);

  const poster =
    (!posterFailed ? thumbUrl : null) ??
    (!posterFailed ? defaultThumbUrl(provider, videoId) : fallbackThumbUrl(provider, videoId)) ??
    null;

  // Reduced motion means nothing plays until asked. Otherwise, visibility drives
  // playback both ways.
  const shouldPlay = valid && (reducedMotion ? manualPlay : inView);

  React.useEffect(() => {
    if (reducedMotion) return undefined;

    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      // No observer means no way to know when to stop, so it stays a still.
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      // A little margin so the player is ready by the time the cover arrives,
      // and a third of the frame so it does not start on a sliver.
      { threshold: 0.35, rootMargin: '200px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const boxHeight = height ?? { xs: 420, md: 620 };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: boxHeight,
        overflow: 'hidden',
        // The player letterboxes itself; a dark ground keeps the bars from
        // reading as a rendering fault against a light page.
        bgcolor: '#0F0F13',
      }}
    >
      {poster && (
        <Box
          component="img"
          src={poster}
          alt=""
          aria-hidden
          onError={() => setPosterFailed(true)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Left underneath rather than removed: it covers the player's own
            // load, so the cover never flashes black.
            opacity: 1,
          }}
        />
      )}

      {shouldPlay && (
        <Box
          component="iframe"
          key={withSound ? 'sound' : 'muted'}
          src={embedUrl(provider, videoId, withSound)}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; encrypted-media; picture-in-picture"
          sx={{
            position: 'absolute',
            // A 16:9 player inside a taller box has to be scaled up and centred,
            // or it sits in a letterbox. This crops instead, which is what a
            // cover wants.
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100vw',
            height: '56.25vw',
            minHeight: '100%',
            minWidth: '177.77vh',
            border: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Readable text over an unpredictable image needs a scrim, not luck. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(15,15,19,0.30) 0%, rgba(15,15,19,0.10) 35%, rgba(15,15,19,0.78) 100%)',
        }}
      />

      {reducedMotion && !manualPlay && valid && (
        <IconButton
          onClick={() => setManualPlay(true)}
          aria-label="Play cover video"
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 64,
            height: 64,
            color: '#fff',
            bgcolor: 'rgba(15,15,19,0.55)',
            '&:hover': { bgcolor: 'rgba(15,15,19,0.75)' },
          }}
        >
          <IconPlayerPlayFilled size={26} />
        </IconButton>
      )}

      {shouldPlay && (
        <Tooltip title={withSound ? 'Mute' : 'Sound on'}>
          <IconButton
            onClick={() => setWithSound((s) => !s)}
            aria-label={withSound ? 'Mute cover video' : 'Turn on sound for cover video'}
            sx={{
              position: 'absolute',
              right: { xs: 12, md: 20 },
              top: { xs: 12, md: 20 },
              color: '#fff',
              bgcolor: 'rgba(15,15,19,0.45)',
              backdropFilter: 'blur(6px)',
              '&:hover': { bgcolor: 'rgba(15,15,19,0.65)' },
              '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
            }}
          >
            {withSound ? <IconVolume size={18} /> : <IconVolumeOff size={18} />}
          </IconButton>
        </Tooltip>
      )}

      {children && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end' }}>{children}</Box>
      )}
    </Box>
  );
};

/** Live, because someone can change the setting without reloading the page. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export default StoryVideoCover;
