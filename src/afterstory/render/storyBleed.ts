import React from 'react';

/**
 * Whether a full-bleed photo may break out of its column to the edges of the
 * screen. Only the public story page says yes, because only there is the column
 * centred on the page and the page clipped against the scrollbar.
 *
 * Everywhere else the reader is mounted (the editor's preview beside the
 * settings panel, the contributor invite's preview box) a 100vw image centred
 * on a narrow, off-centre column ran off the left edge of the screen and over
 * the panel beside it. There it fills its column instead.
 */
export const StoryBleedContext = React.createContext(false);
