/**
 * /story/:storyId/edit
 *
 * The standalone editor page. A story started from the planner never comes here;
 * it lives in the trip's After Story tab. This route is for a story that has no
 * plan behind it, which is most of them: people write about trips they took
 * before they found this product.
 */

import React from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import AfterStoryEditor from './editor/AfterStoryEditor';

const StoryEditPage: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();

  if (!storyId) {
    navigate('/error/404', { replace: true });
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* A draft must never be indexed, and the editor is a draft by definition. */}
      <Seo
        title="Write a story"
        description="Write and edit your after story on Tripician."
        path={`/story/${storyId}/edit`}
        noindex
      />
      <AfterStoryEditor storyId={storyId} onBack={() => navigate(-1)} />
    </Box>
  );
};

export default StoryEditPage;
