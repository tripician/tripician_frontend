/**
 * Prose blocks: text, heading, quote, divider.
 */

import React from 'react';
import { Box, Divider, Typography, useTheme } from '@mui/material';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';
import type { StoryTemplateStyle } from '../templates';
import type { StoryBlock } from '../../types';

interface BlockProps<T extends StoryBlock> {
  block: T;
  style: StoryTemplateStyle;
}

/**
 * The only place story html reaches innerHTML, and therefore the only place that
 * has to sanitize it.
 *
 * The server already sanitized this on write, so in normal operation this pass
 * changes nothing. It is here because defense belongs at the sink: it also
 * covers content stored before the server rule existed, and content from a
 * server that is a deploy behind.
 */
export const StoryTextBlock: React.FC<BlockProps<Extract<StoryBlock, { type: 'text' }>> & { dropCap?: boolean }> = ({
  block,
  style,
  dropCap,
}) => {
  const theme = useTheme();
  const html = React.useMemo(() => sanitizeHtml(block.html), [block.html]);

  if (!html.trim()) return null;

  return (
    <Box
      dangerouslySetInnerHTML={{ __html: html }}
      sx={{
        maxWidth: `${style.measure}ch`,
        color: 'text.primary',
        fontSize: { xs: '1.0625rem', md: '1.125rem' },
        lineHeight: 1.75,
        '& p': { margin: 0, marginBottom: 2 },
        '& p:last-child': { marginBottom: 0 },
        '& ul, & ol': { paddingLeft: 3, marginBottom: 2 },
        '& li': { marginBottom: 0.75 },
        ...(dropCap && style.dropCap
          ? {
              // Only ever on the opening paragraph, and never when it is short
              // enough that a three-line capital would swallow it.
              '& > p:first-of-type::first-letter': {
                float: 'left',
                fontFamily: theme.custom.fontDisplay,
                fontWeight: 700,
                fontSize: '3.6rem',
                lineHeight: 0.86,
                paddingRight: '0.12em',
                paddingTop: '0.06em',
                color: theme.palette.text.primary,
              },
            }
          : {}),
      }}
    />
  );
};

export const StoryHeadingBlock: React.FC<BlockProps<Extract<StoryBlock, { type: 'heading' }>>> = ({
  block,
  style,
}) => {
  const theme = useTheme();

  return (
    <Typography
      variant={block.level === 3 ? 'h4' : 'h3'}
      component={block.level === 3 ? 'h3' : 'h2'}
      sx={{
        maxWidth: `${style.measure}ch`,
        color: 'text.primary',
        ...(style.headingSerif ? { fontFamily: theme.custom.fontDisplay, fontWeight: 700 } : {}),
      }}
    >
      {block.text}
    </Typography>
  );
};

export const StoryQuoteBlock: React.FC<BlockProps<Extract<StoryBlock, { type: 'quote' }>>> = ({ block, style }) => {
  const theme = useTheme();

  // Set between two oversized quotation marks. They are decoration, so they are
  // aria-hidden and the blockquote still reads as one sentence to a screen reader.
  const mark = {
    fontFamily: theme.custom.fontDisplay,
    fontSize: { xs: '3.5rem', md: '5rem' },
    lineHeight: 0.7,
    fontWeight: 700,
    color: theme.palette.primary.main,
    opacity: 0.35,
    userSelect: 'none',
    display: 'block',
  } as const;

  return (
    <Box
      component="blockquote"
      sx={{
        margin: 0,
        maxWidth: `${style.measure}ch`,
        mx: 'auto',
        textAlign: 'center',
        py: { xs: 1, md: 2 },
      }}
    >
      <Box component="span" aria-hidden sx={mark}>&ldquo;</Box>

      <Typography
        sx={{
          fontFamily: theme.custom.fontDisplay,
          fontSize: { xs: '1.35rem', md: '1.75rem' },
          lineHeight: 1.45,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: 'text.primary',
          my: { xs: 0.5, md: 1 },
        }}
      >
        {block.text}
      </Typography>

      <Box component="span" aria-hidden sx={{ ...mark, transform: 'translateY(0.35em)' }}>&rdquo;</Box>

      {block.attribution && (
        <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
          {block.attribution}
        </Typography>
      )}
    </Box>
  );
};

export const StoryDividerBlock: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
    <Divider sx={{ width: 96, borderBottomWidth: 2, borderRadius: 99 }} />
  </Box>
);
