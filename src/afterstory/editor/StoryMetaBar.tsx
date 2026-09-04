/**
 * Everything about the story that is not its body: title, where, when, vibe and
 * template.
 *
 * Sits in the inspector rather than above the canvas, because none of it is what
 * an author came to do. The title is the exception and lives on the canvas
 * itself, where it reads as the first line of the story rather than as a form
 * field.
 */

import React from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { VIBES } from '../../pages/CommunityPage/vibes';
import { COUNTRIES } from '../../utils/countries';
import { templateStyle } from '../render/templates';
import { STORY_LIMITS } from '../types';
import { STORY_FIELD_SX } from '../storyFormat';
import type { StoryDraft } from '../types';

interface StoryMetaBarProps {
  draft: StoryDraft;
  onChange: (patch: Partial<StoryDraft>) => void;
}

const StoryMetaBar: React.FC<StoryMetaBarProps> = ({ draft, onChange }) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Section title="Where and when">
        <TextField
          fullWidth
          size="small"
          label="Place"
          placeholder="Kyoto and Osaka"
          value={draft.destination}
          onChange={(e) => onChange({ destination: e.target.value.slice(0, 120) })}
          sx={STORY_FIELD_SX}
        />

        <Autocomplete
          multiple
          size="small"
          options={COUNTRIES}
          value={draft.countries}
          onChange={(_, value) => onChange({ countries: value.slice(0, STORY_LIMITS.maxCountries) })}
          renderInput={(params) => <TextField {...params} label="Countries" sx={STORY_FIELD_SX} />}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...rest } = getTagProps({ index });
              return <Chip key={key} {...rest} size="small" label={option} />;
            })
          }
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <DatePicker
            label="From"
            value={draft.travelStartDate ? dayjs(draft.travelStartDate) : null}
            onChange={(value) =>
              onChange({ travelStartDate: value ? value.format('YYYY-MM-DD') : null })
            }
            slotProps={{ textField: { size: 'small', sx: STORY_FIELD_SX } }}
          />
          <DatePicker
            label="To"
            value={draft.travelEndDate ? dayjs(draft.travelEndDate) : null}
            minDate={draft.travelStartDate ? dayjs(draft.travelStartDate) : undefined}
            onChange={(value) => onChange({ travelEndDate: value ? value.format('YYYY-MM-DD') : null })}
            slotProps={{ textField: { size: 'small', sx: STORY_FIELD_SX } }}
          />
        </Box>
      </Section>

      <Section title="Vibe">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {Object.entries(VIBES).map(([key, vibe]) => {
            const active = draft.vibe === key;
            return (
              <Box
                key={key}
                component="button"
                type="button"
                onClick={() => onChange({ vibe: active ? null : key })}
                aria-pressed={active}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.25,
                  py: 0.6,
                  border: `1px solid ${active ? 'transparent' : theme.custom.surface.border}`,
                  borderRadius: 999,
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  // Selected state is an inverted ink fill, never coral. Coral is
                  // reserved for actions in this system.
                  bgcolor: active ? 'text.primary' : 'transparent',
                  color: active ? 'background.paper' : 'text.secondary',
                  '&:hover': { bgcolor: active ? 'text.primary' : theme.custom.surface.hover },
                  '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
                }}
              >
                <vibe.Icon size={13} />
                {vibe.label}
              </Box>
            );
          })}
        </Box>
      </Section>

      <Section title="Shape">
        <Box
          sx={{
            p: 1.25,
            borderRadius: '12px',
            border: `1px solid ${theme.custom.surface.border}`,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
            {templateStyle(draft.template).label}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {templateStyle(draft.template).description}
          </Typography>
          {/* Locked after creation: restyling a finished story into another shape made a mess of it. */}
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.75 }}>
            Chosen when you started this story and fixed from then on. To use a different shape, delete this story and write a new one.
          </Typography>
        </Box>
      </Section>

      <Section title="Summary">
        <TextField
          fullWidth
          multiline
          minRows={3}
          size="small"
          placeholder="One or two lines, shown on cards and in search results."
          value={draft.summary}
          onChange={(e) => onChange({ summary: e.target.value.slice(0, STORY_LIMITS.maxSummaryChars) })}
          sx={STORY_FIELD_SX}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {draft.summary.length}/{STORY_LIMITS.maxSummaryChars}. Left blank, the opening lines are used.
        </Typography>
      </Section>
    </Box>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ display: 'grid', gap: 1 }}>
    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
      {title}
    </Typography>
    {children}
  </Box>
);

export default StoryMetaBar;
