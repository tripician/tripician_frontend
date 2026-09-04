/**
 * The printed book, page by page, before anyone commits to anything.
 *
 * The pages here are server-side screenshots of the same document the PDF is
 * rendered from, at print media emulation and 2x scale. That is the whole point:
 * a preview built from screen CSS would be a promise about the book, and this
 * has to be a proof of it. It is also why the render is slow enough to need real
 * loading copy rather than a spinner and an apology.
 *
 * Pages are shown one at a time rather than as facing spreads. The book is
 * printed as single A5 sheets with a page break after each, so pairing them on
 * screen would invent a binding layout the renderer does not actually produce.
 */

import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconX,
} from '@tabler/icons-react';
import { afterStoryService } from '../afterStoryService';

interface BookPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  story: { id: string; title?: string | null } | null;
  /** Needed for the PDF download, which is a blob fetch outside apiClient. */
  token?: string | null;
}

/**
 * The PDF comes back as a blob rather than a link because the endpoint is
 * authenticated, and because a browser-side capture would lose the Cloudinary
 * photographs to CORS.
 */
async function downloadBookPdf(storyId: string, title: string, token?: string | null) {
  const apiBase = ((import.meta.env.VITE_API_BASE_URL as string) || '').replace(/\/$/, '');
  const resp = await fetch(
    `${apiBase}/api/stories/${storyId}/book.pdf`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
  if (!resp.ok) throw new Error(String(resp.status));

  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `tripician-${(title || 'story').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}

const BookPreviewDialog: React.FC<BookPreviewDialogProps> = ({ open, onClose, story, token }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [pages, setPages] = React.useState<string[]>([]);
  const [index, setIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const storyId = story?.id ?? null;

  const load = React.useCallback(async () => {
    if (!storyId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await afterStoryService.getBookPreview(storyId);
      if (result.length === 0) {
        setError('That book came back empty. It usually means the story has no pages yet.');
      }
      setPages(result);
      setIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not lay out that book.');
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  // Only ever on open, never on mount: this is a Playwright render per call and
  // it is rate limited server-side.
  React.useEffect(() => {
    if (!open || !storyId) return;
    setPages([]);
    void load();
  }, [open, storyId, load]);

  const total = pages.length;
  const go = React.useCallback(
    (delta: number) => setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0))),
    [total],
  );

  React.useEffect(() => {
    if (!open || total === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, total, go]);

  const handleDownload = async () => {
    if (!storyId || downloading) return;
    setDownloading(true);
    try {
      await downloadBookPdf(storyId, story?.title || 'story', token);
    } catch {
      window.dispatchEvent(
        new CustomEvent('app:error', { detail: { message: 'Could not build that book right now.' } }),
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="lg"
      fullWidth
      aria-label="Book preview"
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: { xs: 2, md: 3 },
          py: 1.5,
          borderBottom: `1px solid ${theme.custom.surface.border}`,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h2" noWrap sx={{ color: 'text.primary' }}>
            {story?.title || 'Your book'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {total > 0 ? `Page ${index + 1} of ${total}  ·  A5 hardcover` : 'A5 hardcover'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <IconX size={18} />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          bgcolor: theme.custom.surface.active,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          minHeight: { xs: 380, md: 560 },
          p: { xs: 2, md: 3 },
        }}
      >
        {loading && (
          <Box sx={{ m: 'auto', textAlign: 'center', maxWidth: 420 }}>
            <Typography sx={{ fontFamily: theme.custom.fontDisplay, fontSize: '1.25rem', color: 'text.primary' }}>
              Setting the pages
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              We print the real book and photograph every page, so this takes a moment.
              What you see is what arrives.
            </Typography>
          </Box>
        )}

        {!loading && error && (
          <Box sx={{ m: 'auto', textAlign: 'center', maxWidth: 420 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{error}</Typography>
            <Button variant="outlined" onClick={() => void load()} sx={{ mt: 2 }}>
              Try again
            </Button>
          </Box>
        )}

        {!loading && !error && total > 0 && (
          <>
            {/* Centred on the sheet, not stretched across the dialog. The arrows
                have to sit beside the page to read as page turns; parked at the
                dialog edges they read as furniture belonging to the window. */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 1, md: 2.5 },
                width: '100%',
                flex: 1,
                minHeight: 0,
              }}
            >
              <IconButton
                onClick={() => go(-1)}
                disabled={index === 0}
                aria-label="Previous page"
                sx={{ flexShrink: 0 }}
              >
                <IconChevronLeft size={20} />
              </IconButton>

              <Box
                sx={{
                  flex: '0 1 auto',
                  display: 'grid',
                  placeItems: 'center',
                  minWidth: 0,
                  height: '100%',
                }}
              >
                <Box
                  component="img"
                  src={pages[index]}
                  alt={`Page ${index + 1}`}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: { xs: '52vh', md: '66vh' },
                    height: '100%',
                    // A5 is 1:1.419. Letting the sheet keep its own ratio is the
                    // difference between a preview and a decoration.
                    aspectRatio: '148 / 210',
                    objectFit: 'contain',
                    borderRadius: '4px',
                    bgcolor: '#fff',
                    boxShadow: theme.custom.shadows.cardHover,
                  }}
                />
              </Box>

              <IconButton
                onClick={() => go(1)}
                disabled={index >= total - 1}
                aria-label="Next page"
                sx={{ flexShrink: 0 }}
              >
                <IconChevronRight size={20} />
              </IconButton>
            </Box>

            {/* Thumbnails, so a 60 page book is not 60 clicks away from its end. */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                overflowX: 'auto',
                maxWidth: '100%',
                flexShrink: 0,
                // Centred until they overflow, then they start from the left so
                // the first page is never scrolled off on a long book.
                justifyContent: 'safe center',
                pb: 1,
              }}
            >
              {pages.map((p, i) => (
                <Box
                  key={p}
                  component="img"
                  src={p}
                  alt=""
                  onClick={() => setIndex(i)}
                  sx={{
                    flex: '0 0 auto',
                    width: 44,
                    aspectRatio: '148 / 210',
                    objectFit: 'cover',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    bgcolor: '#fff',
                    opacity: i === index ? 1 : 0.55,
                    outline: i === index ? `2px solid ${theme.palette.primary.main}` : 'none',
                    outlineOffset: 1,
                    '&:hover': { opacity: 1 },
                  }}
                />
              ))}
            </Box>
          </>
        )}
      </DialogContent>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          px: { xs: 2, md: 3 },
          py: 2,
          borderTop: `1px solid ${theme.custom.surface.border}`,
        }}
      >
        {/* Said plainly, and said here rather than after a click. Ordering is
            genuinely not built, and a "Buy" button that opened a waitlist would
            be the kind of thing this product has decided not to do. */}
        <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, minWidth: 200 }}>
          Printed copies are not on sale yet. The PDF is the finished book, at print resolution.
        </Typography>
        <Button
          variant="contained"
          startIcon={<IconDownload size={16} />}
          onClick={() => void handleDownload()}
          disabled={downloading || !storyId}
        >
          {downloading ? 'Building the PDF…' : 'Download the PDF'}
        </Button>
      </Box>
    </Dialog>
  );
};

export default BookPreviewDialog;
