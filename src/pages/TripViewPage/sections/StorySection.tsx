import React from 'react';
import { Box, Button, Chip, Skeleton, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconBook, IconPencil, IconArrowRight } from '@tabler/icons-react';
import { BRAND } from '../../../theme';
import { afterStoryService } from '../../../afterstory/afterStoryService';
import { resolveStoryCover, formatTravelWindow } from '../../../afterstory/storyFormat';
import type { AfterStoryDto } from '../../../afterstory/types';
import SectionShell from './SectionShell';

interface StorySectionProps {
  tripId: string;
  tripName: string;
  canEdit: boolean;
  isMember: boolean;
}

const StorySection: React.FC<StorySectionProps> = ({ tripId, tripName, canEdit, isMember }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const border = theme.custom.surface.border;

  const [story, setStory] = React.useState<AfterStoryDto | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    afterStoryService.getForTrip(tripId)
      .then((s) => { if (active) setStory(s); })
      .catch(() => { if (active) setStory(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tripId]);

  if (loading) {
    return (
      <SectionShell icon={<IconBook size={20} style={{ color: BRAND.coral }} />} title="After story">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: '360px minmax(0,1fr)' }, gap: 3 }}>
          <Skeleton variant="rounded" height={240} sx={{ borderRadius: '18px' }} />
          <Box>
            <Skeleton width="60%" height={34} />
            <Skeleton width="90%" />
            <Skeleton width="80%" />
          </Box>
        </Box>
      </SectionShell>
    );
  }

  if (!story) {
    return (
      <SectionShell
        icon={<IconBook size={20} style={{ color: BRAND.coral }} />}
        title="After story"
        subtitle={canEdit
          ? 'The plan says where you went. The story says what it was actually like. Write it once you are back and it becomes the most useful thing on this page.'
          : `Nobody has written up ${tripName} yet.`}
        action={canEdit ? (
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate(`/tripplanner/${tripId}?tab=story`)}
            startIcon={<IconPencil size={15} />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px' }}
          >
            Write the story
          </Button>
        ) : undefined}
        empty={canEdit ? undefined : 'When somebody who went writes it up, it shows here.'}
      >
        {canEdit ? (
          <Box sx={{ borderRadius: '16px', border: `1px dashed ${border}`, p: 3 }}>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              You can pull the route, the places and the photos straight out of this plan rather than starting from a blank page.
            </Typography>
          </Box>
        ) : undefined}
      </SectionShell>
    );
  }

  const cover = resolveStoryCover(story);
  const travelWindow = formatTravelWindow(story.travelStartDate, story.travelEndDate);
  const isDraft = story.status === 'Draft';
  const openHref = `/story/${story.slug || story.id}`;

  return (
    <SectionShell
      icon={<IconBook size={20} style={{ color: BRAND.coral }} />}
      title="After story"
      action={story.canEdit ? (
        <Button
          size="small"
          onClick={() => navigate(`/story/${story.id}/edit`)}
          startIcon={<IconPencil size={15} />}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px' }}
        >
          Edit the story
        </Button>
      ) : undefined}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: '360px minmax(0,1fr)' }, gap: { xs: 3, md: 4 }, alignItems: 'start' }}>
        <Box
          onClick={() => navigate(openHref)}
          sx={{
            aspectRatio: '4 / 5', borderRadius: '18px', overflow: 'hidden', cursor: 'pointer',
            bgcolor: 'action.hover', position: 'relative',
            boxShadow: theme.custom.shadows.card,
          }}
        >
          {cover && (
            <Box component="img" src={cover} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            {isDraft && <Chip size="small" label="Draft" sx={{ fontWeight: 700, fontSize: 11, height: 22 }} />}
            {travelWindow && (
              <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.disabled' }}>
                {travelWindow}
              </Typography>
            )}
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: 26, lineHeight: 1.2, color: 'text.primary', mb: 1.25 }}>
            {story.title}
          </Typography>

          {story.summary && (
            <Typography sx={{ fontSize: 16, lineHeight: 1.7, color: 'text.secondary', maxWidth: 640, mb: 2.5 }}>
              {story.summary}
            </Typography>
          )}

          <Button
            variant="contained"
            onClick={() => navigate(openHref)}
            endIcon={<IconArrowRight size={16} />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px', px: 2.5 }}
          >
            {isDraft ? 'Open the draft' : 'Read the story'}
          </Button>

          {isDraft && isMember && (
            <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 1.5 }}>
              Still a draft, so only people who can edit it see this.
            </Typography>
          )}
        </Box>
      </Box>
    </SectionShell>
  );
};

export default StorySection;
