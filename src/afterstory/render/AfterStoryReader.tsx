/**
 * The read-only story.
 *
 * Same posture as TripShowcase: a visitor meets a finished thing, not the
 * workshop. No editor chrome, no completion meters, no "add a photo" prompts.
 * The editor mounts this too, for its preview, so what an author checks before
 * publishing is exactly what a reader gets.
 */

import React from 'react';
import { Box } from '@mui/material';
import { templateStyle } from './templates';
import {
  StoryTextBlock,
  StoryHeadingBlock,
  StoryQuoteBlock,
  StoryDividerBlock,
} from './blocks/TextBlocks';
import { StoryPhotoBlock, StoryGalleryBlock, StoryRelatedBlock } from './blocks/MediaBlocks';
import { StoryPlaceBlock, StoryListBlock, StoryMapBlock, StoryCostBlock } from './blocks/DataBlocks';
import type { StoryBlock, StoryTemplate } from '../types';

interface AfterStoryReaderProps {
  blocks: StoryBlock[];
  template: StoryTemplate;
}

const AfterStoryReader: React.FC<AfterStoryReaderProps> = ({ blocks, template }) => {
  const style = templateStyle(template);

  // The drop cap belongs to the story's opening paragraph, not to every text
  // block, and not to a block that happens to be first after a photo.
  const firstProseId = blocks.find((b) => b.type === 'text')?.id;

  return (
    <Box sx={{ display: 'grid', gap: style.blockGap }}>
      {blocks.map((block) => (
        <StoryBlockView
          key={block.id}
          block={block}
          template={template}
          isFirstProse={block.id === firstProseId}
        />
      ))}
    </Box>
  );
};

interface StoryBlockViewProps {
  block: StoryBlock;
  template: StoryTemplate;
  isFirstProse?: boolean;
}

/**
 * Exported so the editor can render a single block in place without duplicating
 * the switch. A block type this build does not know renders nothing rather than
 * throwing: one bad block must never cost the reader the whole story.
 */
export const StoryBlockView: React.FC<StoryBlockViewProps> = ({ block, template, isFirstProse }) => {
  const style = templateStyle(template);

  switch (block.type) {
    case 'text':
      return <StoryTextBlock block={block} style={style} dropCap={isFirstProse} />;
    case 'heading':
      return <StoryHeadingBlock block={block} style={style} />;
    case 'quote':
      return <StoryQuoteBlock block={block} style={style} />;
    case 'divider':
      return <StoryDividerBlock />;
    case 'photo':
      return <StoryPhotoBlock block={block} style={style} />;
    case 'gallery':
      return <StoryGalleryBlock block={block} style={style} />;
    case 'related':
      return <StoryRelatedBlock block={block} style={style} />;
    case 'place':
      return <StoryPlaceBlock block={block} style={style} />;
    case 'list':
      return <StoryListBlock block={block} style={style} />;
    case 'map':
      return <StoryMapBlock block={block} style={style} />;
    case 'cost':
      return <StoryCostBlock block={block} style={style} />;
    default:
      return null;
  }
};

export default AfterStoryReader;
