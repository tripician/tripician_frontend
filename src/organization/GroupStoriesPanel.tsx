import React from 'react';
import { Box, Typography } from '@mui/material';
import { IconBook } from '@tabler/icons-react';
import StoryCard from '../afterstory/cards/StoryCard';
import type { AfterStorySummaryDto } from '../afterstory/types';
import EmptyState from '../components/ui/EmptyState';
import { CardGridSkeleton } from '../components/ui/Skeletons';
import { wallGridSx } from '../pages/CommunityPage/communityConstants';
import { apiServices } from '../services/APIs/apiServices';

interface GroupStoriesPanelProps {
  groupId: string;
  /** A section heading, for pages where the stories are one part of many. */
  title?: string;
  /** On a public page an empty section says nothing worth saying, so it renders nothing. */
  hideWhenEmpty?: boolean;
}

// Published after stories of the group's trips: the record of how its trips actually went.
const GroupStoriesPanel: React.FC<GroupStoriesPanelProps> = ({ groupId, title, hideWhenEmpty = false }) => {
  const [stories, setStories] = React.useState<AfterStorySummaryDto[] | null>(null);

  React.useEffect(() => {
    let active = true;
    apiServices.getGroupStories(groupId)
      .then((r) => { if (active) setStories(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (active) setStories([]); });
    return () => { active = false; };
  }, [groupId]);

  if (hideWhenEmpty && (stories === null || stories.length === 0)) return null;

  const body = stories === null ? (
    <CardGridSkeleton count={3} minWidth={260} />
  ) : stories.length === 0 ? (
    <EmptyState
      icon={IconBook}
      title="No stories yet"
      description="When someone writes up one of the group's trips and publishes it, the story lands here."
    />
  ) : (
    <Box sx={wallGridSx}>
      {stories.map((s) => <StoryCard key={s.id} story={s} />)}
    </Box>
  );

  if (!title) return body;
  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Typography variant="h4" component="h2" sx={{ mb: 2 }}>{title}</Typography>
      {body}
    </Box>
  );
};

export default GroupStoriesPanel;
