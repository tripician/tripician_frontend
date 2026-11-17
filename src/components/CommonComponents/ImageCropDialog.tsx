import React from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Slider, Typography,
} from '@mui/material';
import ZoomInRoundedIcon from '@mui/icons-material/ZoomInRounded';
import ZoomOutRoundedIcon from '@mui/icons-material/ZoomOutRounded';
import {
  clampView, displayBox, MAX_ZOOM, MIN_ZOOM, outputSize, panBy, sourceRect, zoomTo,
  type CropView, type Size,
} from '../../utils/imageCrop';

export interface ImageCropDialogProps {
  /** The picked file; the dialog is open while there is one. */
  file: File | null;
  title: string;
  /** Width over height of what is kept: 1 for a profile photo, 3 for a cover. */
  aspect: number;
  /** A round guide over the square, for pictures shown as a circle. */
  round?: boolean;
  /** The widest picture uploaded; its height follows the shape. A smaller selection is sent at its own size. */
  maxOutputWidth: number;
  onCancel: () => void;
  /** Uploads the cropped picture. A rejection keeps the dialog open with its message. */
  onConfirm: (cropped: Blob) => Promise<void>;
}

const START: CropView = { zoom: 1, x: 0, y: 0 };
const KEY_STEP = 12;

/** Draws the kept part onto a canvas and returns it as a JPEG, on white so a transparent PNG keeps a clean background. */
function renderCrop(image: HTMLImageElement, view: CropView, natural: Size, frame: Size, aspect: number, maxWidth: number): Promise<Blob> {
  const source = sourceRect(view, natural, frame);
  const out = outputSize(source, aspect, maxWidth);
  const canvas = document.createElement('canvas');
  canvas.width = out.width;
  canvas.height = out.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('This browser cannot prepare the photo.'));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, source.sx, source.sy, source.sw, source.sh, 0, 0, out.width, out.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('This browser cannot prepare the photo.'))), 'image/jpeg', 0.9);
  });
}

/**
 * Shows the picked photo behind the shape it will be saved in, so what is
 * uploaded is exactly what was seen: drag to place it, zoom with the slider, the
 * wheel or the + and - keys. Only the kept part goes up, already resized, which
 * is also what makes it display without being squashed or cut off later.
 */
const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  file, title, aspect, round = false, maxOutputWidth, onCancel, onConfirm,
}) => {
  const [src, setSrc] = React.useState<string | null>(null);
  const [natural, setNatural] = React.useState<Size | null>(null);
  const [frame, setFrame] = React.useState<Size | null>(null);
  const [view, setView] = React.useState<CropView>(START);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [unreadable, setUnreadable] = React.useState(false);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const drag = React.useRef<{ id: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);

  // A fresh object URL per file, released when the file changes or the dialog closes.
  React.useEffect(() => {
    setNatural(null);
    setView(START);
    setError(null);
    setUnreadable(false);
    setBusy(false);
    if (!file) { setSrc(null); return undefined; }
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // The frame follows the dialog's width; its height follows the shape.
  const measure = React.useCallback((node: HTMLDivElement | null) => {
    frameRef.current = node;
    if (!node) return;
    const update = () => {
      const width = node.clientWidth;
      if (width > 0) setFrame({ width, height: width / aspect });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [aspect]);

  // Re-clamp whenever the frame resizes, so no edge ever shows a gap.
  React.useEffect(() => {
    if (natural && frame) setView((v) => clampView(v, natural, frame));
  }, [natural, frame]);

  // The wheel zooms instead of scrolling the page, which needs a listener that may cancel it.
  React.useEffect(() => {
    const node = frameRef.current;
    if (!node || !natural || !frame) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setView((v) => zoomTo(v, v.zoom * Math.exp(-event.deltaY * 0.0015), natural, frame));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [natural, frame]);

  const ready = !!(src && natural && frame && !unreadable);
  const box = ready ? displayBox(view, natural!, frame!) : null;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!ready || busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setDragging(true);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const last = drag.current;
    if (!last || last.id !== event.pointerId || !natural || !frame) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    drag.current = { id: last.id, x: event.clientX, y: event.clientY };
    setView((v) => panBy(v, dx, dy, natural, frame));
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) {
      drag.current = null;
      setDragging(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!natural || !frame || busy) return;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [KEY_STEP, 0], ArrowRight: [-KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP],
    };
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      setView((v) => panBy(v, dx, dy, natural, frame));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setView((v) => zoomTo(v, v.zoom + 0.1, natural, frame));
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      setView((v) => zoomTo(v, v.zoom - 0.1, natural, frame));
    }
  };

  const confirm = async () => {
    if (!ready || !imageRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await renderCrop(imageRef.current, view, natural!, frame!, aspect, maxOutputWidth);
      await onConfirm(blob);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'That photo could not be saved. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!file}
      onClose={busy ? undefined : onCancel}
      fullWidth
      maxWidth={aspect > 1 ? 'md' : 'xs'}
      PaperProps={{ sx: { borderRadius: '18px' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        <Box
          ref={measure}
          role="img"
          tabIndex={0}
          aria-label="Photo position. Drag, or use the arrow keys, to move it. Use plus and minus to zoom."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: `${aspect} / 1`,
            overflow: 'hidden',
            borderRadius: '12px',
            bgcolor: 'action.hover',
            cursor: ready ? (dragging ? 'grabbing' : 'grab') : 'default',
            touchAction: 'none',
            userSelect: 'none',
            outline: 'none',
            '&:focus-visible': { boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}` },
          }}
        >
          {src && !unreadable && (
            <img
              ref={imageRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth > 0 && img.naturalHeight > 0) setNatural({ width: img.naturalWidth, height: img.naturalHeight });
                else setUnreadable(true);
              }}
              onError={() => setUnreadable(true)}
              style={{
                position: 'absolute',
                left: box?.left ?? 0,
                top: box?.top ?? 0,
                width: box?.width ?? '100%',
                height: box?.height ?? 'auto',
                maxWidth: 'none',
                visibility: box ? 'visible' : 'hidden',
                pointerEvents: 'none',
              }}
            />
          )}
          {/* A profile photo shows as a circle everywhere, so the corners are dimmed to show what will be seen. */}
          {round && ready && (
            <Box
              aria-hidden
              sx={{
                position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', border: '2px solid rgba(255,255,255,0.85)',
              }}
            />
          )}
          {!ready && !unreadable && src && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {unreadable && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="error">
                This photo can't be opened in the browser. Choose a JPG, PNG or WebP picture.
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
          <ZoomOutRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Slider
            aria-label="Zoom"
            size="small"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={view.zoom}
            disabled={!ready || busy}
            onChange={(_, value) => {
              if (natural && frame) setView((v) => zoomTo(v, value as number, natural, frame));
            }}
          />
          <ZoomInRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
          Drag the photo to place it. Only what is inside the frame is uploaded.
        </Typography>
        {error && (
          <Typography variant="body2" color="error" role="alert" sx={{ mt: 1.5 }}>{error}</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="inherit" onClick={onCancel} disabled={busy} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void confirm()}
          disabled={!ready || busy}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {busy ? <><CircularProgress size={14} sx={{ color: '#fff', mr: 1 }} />Saving…</> : 'Use this photo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageCropDialog;
