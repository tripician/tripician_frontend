import React from 'react';
import { Grow, Paper, Popper, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

interface HeaderPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** 'below' drops down from the header; 'above' rises from the phone's bottom bar. */
  placement?: 'below' | 'above';
  /** Space between the button and the panel, in px. */
  gap?: number;
  /** Names the panel for screen readers. */
  label: string;
  id?: string;
  paperSx?: SxProps<Theme>;
  children: React.ReactNode;
}

/**
 * The header's dropdown panels (Studio, Messages, Notifications, Account).
 *
 * Not MUI's Popover, on purpose. Popover is a modal: it lays an invisible layer
 * over the whole page and locks scrolling, so with Messages open the feed under
 * it would not move, and the first scroll did nothing at all. This is a Popper,
 * which sits over the page without taking it: the feed keeps scrolling, a click
 * anywhere else closes the panel (the same click also does what it was for), and
 * Escape closes it and puts focus back on the button that opened it.
 *
 * The outside click is heard in the capture phase, not with MUI's
 * ClickAwayListener. That listens as the click bubbles up to the document, and
 * plenty of the page stops a click on its way (a post's buttons, for one), so
 * tapping one left the panel open. The Popover's backdrop used to hide this.
 */
const HeaderPopover: React.FC<HeaderPopoverProps> = ({
  open, anchorEl, onClose, placement = 'below', gap = 8, label, id, paperSx, children,
}) => {
  const theme = useTheme();
  const paperRef = React.useRef<HTMLDivElement | null>(null);
  const above = placement === 'above';
  const shown = open && Boolean(anchorEl);

  // Read through a ref, so a parent passing a fresh arrow each render does not rebind the listener.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!shown) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onCloseRef.current();
      anchorEl?.focus({ preventScroll: true });
    };
    /*
     * Clicks only, not touchend: on a phone the end of a swipe is a touchend, and
     * scrolling the page should not throw the panel away. A tap still makes a click.
     * Added after the click that opened the panel has passed the document, so it
     * never hears that one.
     */
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target || paperRef.current?.contains(target)) return;
      onCloseRef.current();
      // A second tap on the bell closes the panel. Stopped here, or the button's own
      // click would open it again straight away.
      if (anchorEl?.contains(target)) e.stopPropagation();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick, true);
    };
  }, [shown, anchorEl]);

  return (
    <Popper
      open={shown}
      anchorEl={anchorEl}
      placement={above ? 'top' : 'bottom-end'}
      transition
      modifiers={[
        { name: 'offset', options: { offset: [0, gap] } },
        { name: 'preventOverflow', options: { padding: 8 } },
      ]}
      // Over the header (1100) and the page's floating buttons, as the Popover was.
      sx={{ zIndex: theme.zIndex.modal }}
    >
      {({ TransitionProps }) => (
        <Grow
          {...TransitionProps}
          style={{ transformOrigin: above ? 'center bottom' : 'right top' }}
          // Focus moves into the panel, as it did with the Popover, so Tab walks its rows next.
          onEntered={() => paperRef.current?.focus({ preventScroll: true })}
        >
          <div>
            <Paper
              ref={paperRef}
              id={id}
              role="dialog"
              aria-label={label}
              tabIndex={-1}
              elevation={8}
              sx={[
                // A tall panel on a short screen scrolls inside itself, as the Popover's did, and stops there.
                { outline: 'none', maxHeight: 'calc(100dvh - 96px)', overflowX: 'hidden', overflowY: 'auto', overscrollBehavior: 'contain' },
                ...(Array.isArray(paperSx) ? paperSx : [paperSx]),
              ]}
            >
              {children}
            </Paper>
          </div>
        </Grow>
      )}
    </Popper>
  );
};

export default HeaderPopover;
