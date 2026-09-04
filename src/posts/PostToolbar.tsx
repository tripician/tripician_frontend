import React from 'react';
import { Box, Typography } from '@mui/material';
import SearchField from '../components/ui/SearchField';
import SegmentedControl from '../components/ui/SegmentedControl';
import FilterChip from '../components/ui/FilterChip';
import ChipRail from '../components/ui/ChipRail';
import type { PostTagCount, QuestionSort } from './types';

export type FeedKind = 'all' | 'questions' | 'notes';

const KIND_OPTIONS: { value: FeedKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'questions', label: 'Questions' },
  { value: 'notes', label: 'Notes' },
];

const SORT_OPTIONS: { value: QuestionSort; label: string; tip: string }[] = [
  { value: 'latest', label: 'Latest', tip: 'Most recently answered' },
  { value: 'unanswered', label: 'Unanswered', tip: 'Nobody has replied yet' },
  { value: 'top', label: 'Top', tip: 'Best answered' },
];

interface PostToolbarProps {
  kind: FeedKind;
  onKindChange: (kind: FeedKind) => void;
  search: string;
  onSearchChange: (value: string) => void;
  sort: QuestionSort;
  onSortChange: (sort: QuestionSort) => void;
  tags: PostTagCount[];
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
  /** Rendered beside the sort switch, e.g. "142 questions". */
  countLine?: string;
}

/**
 * What you are looking at, and how to narrow it.
 *
 * The sort switch and the tag row only appear on questions. A note has nothing
 * to be unanswered about, and offering a control that does nothing on the tab
 * you are on is worse than not offering it.
 */
const PostToolbar: React.FC<PostToolbarProps> = ({
  kind, onKindChange, search, onSearchChange, sort, onSortChange,
  tags, selectedTags, onToggleTag, countLine,
}) => {
  const showQuestionControls = kind !== 'notes';

  // Places are only listed once something carries them, so an unused half of the
  // country list never appears. Topics always show, so the vocabulary is legible
  // before anybody has used it.
  const visibleTags = React.useMemo(
    () => tags.filter((t) => t.group === 'topic' || t.count > 0),
    [tags],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <SegmentedControl
          value={kind}
          options={KIND_OPTIONS}
          onChange={onKindChange}
          aria-label="What to show"
        />
        <Box sx={{ flex: 1, minWidth: 0 }} />
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder="Search questions..."
          sx={{ width: { xs: '100%', sm: 280 } }}
        />
      </Box>

      {showQuestionControls && visibleTags.length > 0 && (
        <ChipRail>
          {visibleTags.map((tag) => (
            <FilterChip
              key={tag.id}
              label={tag.count > 0 ? `${tag.label} ${tag.count}` : tag.label}
              active={selectedTags.includes(tag.id)}
              onClick={() => onToggleTag(tag.id)}
              // Several tags can be on at once, so this is a checkbox to assistive
              // tech rather than a button that happens to stay pressed.
              role="checkbox"
            />
          ))}
        </ChipRail>
      )}

      {showQuestionControls && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <SegmentedControl
            value={sort}
            options={SORT_OPTIONS}
            onChange={onSortChange}
            size="small"
            aria-label="Order questions by"
          />
          {countLine && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {countLine}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PostToolbar;
