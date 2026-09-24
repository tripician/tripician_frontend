import React from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import ResultRow, { GroupVisual, PersonVisual, PlaceVisual, QueryVisual, TagVisual, ThumbVisual } from './ResultRow';
import type { RecentSearch } from './recentSearches';

const SHOWN = 5;

interface RecentSearchesProps {
  recents: RecentSearch[];
  onOpen: (entry: RecentSearch) => void;
  onRemove: (entry: RecentSearch) => void;
  onClear: () => void;
}

function visualFor(r: RecentSearch): React.ReactNode {
  switch (r.kind) {
    case 'person': return <PersonVisual name={r.label} src={r.image} />;
    case 'group': return <GroupVisual name={r.label} src={r.image} />;
    case 'place': return <PlaceVisual name={r.label} />;
    case 'tag': return <TagVisual />;
    case 'plan':
    case 'story': return <ThumbVisual src={r.image} />;
    default: return <QueryVisual />;
  }
}

// What you looked for before, in this browser only; five at first so the photo grid stays in view.
const RecentSearchList: React.FC<RecentSearchesProps> = ({ recents, onOpen, onRemove, onClear }) => {
  const [expanded, setExpanded] = React.useState(false);
  if (recents.length === 0) return null;
  const visible = expanded ? recents : recents.slice(0, SHOWN);

  return (
    <Box component="section" aria-label="Recent searches" sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, px: 1.25 }}>
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>Recent</Typography>
        <Button size="small" onClick={onClear} sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}>
          Clear all
        </Button>
      </Box>
      {visible.map((r) => (
        <ResultRow
          key={`${r.kind}:${r.href}:${r.label}`}
          to={r.href}
          visual={visualFor(r)}
          title={r.label}
          subtitle={r.sub ?? null}
          onOpen={() => onOpen(r)}
          trailing={(
            <IconButton size="small" aria-label={`Remove ${r.label} from recent searches`} onClick={() => onRemove(r)}>
              <IconX size={16} />
            </IconButton>
          )}
        />
      ))}
      {recents.length > SHOWN && (
        <Button size="small" onClick={() => setExpanded((v) => !v)} sx={{ ml: 0.5, mt: 0.5, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}>
          {expanded ? 'Show fewer' : `Show all ${recents.length}`}
        </Button>
      )}
    </Box>
  );
};

export default RecentSearchList;
