/**
 * The editable story body.
 *
 * Blocks are edited in place in the order they will be read, rather than in a
 * form beside a preview. A story is a visual object, so the closer the editing
 * surface sits to the finished page the fewer surprises there are at publish.
 *
 * Reordering uses dnd-kit, which is already the drag library in this codebase
 * (DestinationCardsPanel). Keyboard sensors are wired on purpose: a drag-only
 * reorder locks out anyone who cannot use a pointer.
 */

import React from 'react';
import { Box, IconButton, Menu, MenuItem, Tooltip, Typography, useTheme } from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconGripVertical,
  IconPlus,
  IconDotsVertical,
  IconTrash,
  IconCopy,
} from '@tabler/icons-react';
import AddBlockMenu from './AddBlockMenu';
import {
  TextBlockEditor,
  HeadingBlockEditor,
  QuoteBlockEditor,
  PhotoBlockEditor,
  GalleryBlockEditor,
  RelatedBlockEditor,
  PlaceBlockEditor,
  ListBlockEditor,
  CostBlockEditor,
  MapBlockEditor,
} from './BlockEditors';
import { StoryDividerBlock } from '../render/blocks/TextBlocks';
import { createBlock, newBlockId, countPhotos } from '../blockSchema';
import { templateStyle } from '../render/templates';
import { STORY_LIMITS } from '../types';
import type { StoryBlock, StoryBlockType, StoryTemplate } from '../types';

interface BlockCanvasProps {
  blocks: StoryBlock[];
  template: StoryTemplate;
  onChange: (next: StoryBlock[] | ((prev: StoryBlock[]) => StoryBlock[])) => void;
  onUpload: (file: File) => Promise<string>;
}

const BlockCanvas: React.FC<BlockCanvasProps> = ({ blocks, template, onChange, onUpload }) => {
  const style = templateStyle(template);

  const [addAnchor, setAddAnchor] = React.useState<HTMLElement | null>(null);
  const [addIndex, setAddIndex] = React.useState<number>(blocks.length);

  const sensors = useSensors(
    // A small activation distance so a click into a text field is not read as
    // the start of a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const photosUsed = countPhotos(blocks);
  const photoBudgetLeft = Math.max(0, STORY_LIMITS.maxPhotosPerStory - photosUsed);
  const atBlockLimit = blocks.length >= STORY_LIMITS.maxBlocks;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    onChange((prev) => {
      const from = prev.findIndex((b) => b.id === active.id);
      const to = prev.findIndex((b) => b.id === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  };

  const insertAt = (index: number, type: StoryBlockType) => {
    onChange((prev) => {
      if (prev.length >= STORY_LIMITS.maxBlocks) return prev;
      const block = createBlock(type);
      // A photo added under a template that favours full bleed should arrive
      // that way, rather than making the author fix it every time.
      const seeded =
        block.type === 'photo' ? { ...block, width: style.defaultPhotoWidth } : block;
      const next = [...prev];
      next.splice(index, 0, seeded);
      return next;
    });
  };

  const openAdd = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setAddIndex(index);
    setAddAnchor(event.currentTarget);
  };

  return (
    <Box>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <Box sx={{ display: 'grid' }}>
            {blocks.map((block, index) => (
              <React.Fragment key={block.id}>
                <InsertRail onClick={(e) => openAdd(e, index)} disabled={atBlockLimit} />
                <SortableBlock
                  block={block}
                  template={template}
                  photoBudgetLeft={photoBudgetLeft}
                  onUpload={onUpload}
                  onChange={(next) =>
                    onChange((prev) => prev.map((b) => (b.id === next.id ? next : b)))
                  }
                  onRemove={() => onChange((prev) => prev.filter((b) => b.id !== block.id))}
                  onDuplicate={() =>
                    onChange((prev) => {
                      if (prev.length >= STORY_LIMITS.maxBlocks) return prev;
                      const at = prev.findIndex((b) => b.id === block.id);
                      const copy = { ...block, id: newBlockId() } as StoryBlock;
                      const next = [...prev];
                      next.splice(at + 1, 0, copy);
                      return next;
                    })
                  }
                />
              </React.Fragment>
            ))}

            <InsertRail onClick={(e) => openAdd(e, blocks.length)} disabled={atBlockLimit} always />
          </Box>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">
            Nothing here yet. Add a block, or bring the shape of the trip in from your plan.
          </Typography>
        </Box>
      )}

      {atBlockLimit && (
        <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
          This story has reached {STORY_LIMITS.maxBlocks} blocks, which is the limit.
        </Typography>
      )}

      {photoBudgetLeft <= 5 && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
          {photosUsed} of {STORY_LIMITS.maxPhotosPerStory} photos used.
        </Typography>
      )}

      <AddBlockMenu
        anchorEl={addAnchor}
        onClose={() => setAddAnchor(null)}
        onPick={(type) => insertAt(addIndex, type)}
      />
    </Box>
  );
};

/**
 * The thin strip between blocks that reveals a plus on hover. Always-visible
 * buttons between every block turn the page into a control panel; hiding them
 * until the cursor is in the gap keeps the draft readable while it is written.
 */
const InsertRail: React.FC<{
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  always?: boolean;
}> = ({ onClick, disabled, always }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: always ? 44 : 20,
        opacity: always ? 1 : 0,
        transition: `opacity ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover': { opacity: 1 },
        '&:focus-within': { opacity: 1 },
      }}
    >
      <Tooltip title={disabled ? 'Block limit reached' : 'Add a block'}>
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={onClick}
            aria-label="Add a block here"
            sx={{
              width: 26,
              height: 26,
              color: 'text.secondary',
              border: `1px dashed ${theme.custom.surface.border}`,
              '&:hover': { bgcolor: theme.custom.surface.hover },
            }}
          >
            <IconPlus size={14} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

interface SortableBlockProps {
  block: StoryBlock;
  template: StoryTemplate;
  photoBudgetLeft: number;
  onChange: (next: StoryBlock) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpload: (file: File) => Promise<string>;
}

const SortableBlock: React.FC<SortableBlockProps> = ({
  block,
  template,
  photoBudgetLeft,
  onChange,
  onRemove,
  onDuplicate,
  onUpload,
}) => {
  const theme = useTheme();
  const style = templateStyle(template);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

  const shared = {
    onUpload,
    measure: style.measure,
    photoBudgetLeft,
  };

  return (
    <Box
      ref={setNodeRef}
      sx={{
        position: 'relative',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        borderRadius: '12px',
        px: { xs: 0, md: 1.5 },
        py: 1,
        ml: { xs: 0, md: 4 },
        '&:hover .story-block-handle, &:focus-within .story-block-handle': { opacity: 1 },
      }}
    >
      <Box
        className="story-block-handle"
        sx={{
          position: 'absolute',
          left: { xs: 'auto', md: -34 },
          right: { xs: 4, md: 'auto' },
          top: 10,
          display: 'flex',
          gap: 0.25,
          opacity: 0,
          transition: `opacity ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        }}
      >
        <Tooltip title="Drag to reorder">
          <IconButton
            size="small"
            aria-label={`Reorder ${block.type} block`}
            {...attributes}
            {...listeners}
            sx={{ width: 24, height: 24, cursor: 'grab', color: 'text.disabled' }}
          >
            <IconGripVertical size={14} />
          </IconButton>
        </Tooltip>
        <IconButton
          size="small"
          aria-label="Block options"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ width: 24, height: 24, color: 'text.disabled' }}
        >
          <IconDotsVertical size={14} />
        </IconButton>
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            onDuplicate();
            setMenuAnchor(null);
          }}
        >
          <IconCopy size={15} style={{ marginRight: 10 }} />
          Duplicate
        </MenuItem>
        <MenuItem
          onClick={() => {
            onRemove();
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <IconTrash size={15} style={{ marginRight: 10 }} />
          Delete
        </MenuItem>
      </Menu>

      {renderEditor(block, onChange, shared)}
    </Box>
  );
};

function renderEditor(
  block: StoryBlock,
  onChange: (next: StoryBlock) => void,
  shared: { onUpload: (file: File) => Promise<string>; measure: number; photoBudgetLeft: number },
) {
  const props = { ...shared, onChange: onChange as never };

  switch (block.type) {
    case 'text':
      return <TextBlockEditor {...props} block={block} />;
    case 'heading':
      return <HeadingBlockEditor {...props} block={block} />;
    case 'quote':
      return <QuoteBlockEditor {...props} block={block} />;
    case 'photo':
      return <PhotoBlockEditor {...props} block={block} />;
    case 'gallery':
      return <GalleryBlockEditor {...props} block={block} />;
    case 'related':
      return <RelatedBlockEditor {...props} block={block} />;
    case 'place':
      return <PlaceBlockEditor {...props} block={block} />;
    case 'list':
      return <ListBlockEditor {...props} block={block} />;
    case 'cost':
      return <CostBlockEditor {...props} block={block} />;
    case 'map':
      return <MapBlockEditor {...props} block={block} />;
    case 'divider':
      return <StoryDividerBlock />;
    default:
      return null;
  }
}

export default BlockCanvas;
