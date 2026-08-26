import React from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import FilterChip from '../components/ui/FilterChip';
import ChipRail from '../components/ui/ChipRail';
import { COUNTRIES } from '../utils/countries';
import { placeTag, isPlaceTag, tagLabel } from './postTags';
import { POST_LIMITS } from './types';
import type { PostTagCount } from './types';

interface TagPickerProps {
  /** The curated topics, fetched from the server so there is one vocabulary. */
  topics: PostTagCount[];
  value: string[];
  onChange: (tags: string[]) => void;
}

/**
 * Two topics and two places, and nothing you can invent.
 *
 * Topics are chips because there are fifteen of them and picking from a visible
 * set is faster than typing. Places are a combo box because there are 295, and
 * fifteen chips plus 295 chips is not a picker, it is a wall.
 */
const TagPicker: React.FC<TagPickerProps> = ({ topics, value, onChange }) => {
  const selectedTopics = value.filter((t) => !isPlaceTag(t));
  const selectedPlaces = value.filter(isPlaceTag);

  const toggleTopic = (id: string) => {
    if (selectedTopics.includes(id)) {
      onChange(value.filter((t) => t !== id));
      return;
    }
    // Silently dropping the oldest would be worse than refusing: they picked it.
    if (selectedTopics.length >= POST_LIMITS.maxTopicTags) return;
    onChange([...value, id]);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          What is it about?
        </Typography>
        <ChipRail gap={0.75} sx={{ mt: 0.75 }}>
          {topics.filter((t) => t.group === 'topic').map((topic) => {
            const active = selectedTopics.includes(topic.id);
            return (
              <FilterChip
                key={topic.id}
                label={topic.label}
                active={active}
                onClick={() => toggleTopic(topic.id)}
                role="checkbox"
              />
            );
          })}
        </ChipRail>
      </Box>

      <Autocomplete
        multiple
        size="small"
        options={COUNTRIES}
        value={selectedPlaces.map(tagLabel)}
        onChange={(_, picked) => {
          const places = picked.slice(0, POST_LIMITS.maxPlaceTags).map((name) => placeTag(String(name)));
          onChange([...selectedTopics, ...places]);
        }}
        renderInput={(params) => (
          <TextField {...params} placeholder={selectedPlaces.length ? '' : 'Where? (optional)'} />
        )}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
      />
    </Box>
  );
};

export default TagPicker;
