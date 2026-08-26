import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import { formatRelativeTime } from '../utils/relativeTime';
import type { OrganizationPost } from './types';

/**
 * An organisation's posts on its public profile.
 *
 * Renders nothing at all when there are none, so a quiet organisation does not
 * get a heading over an empty box.
 */
const PublicOrganizationPosts: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const border = theme.custom.surface.border;
  const [posts, setPosts] = React.useState<OrganizationPost[]>([]);

  React.useEffect(() => {
    let active = true;
    apiServices.getOrganizationPosts(organizationId, 12)
      .then((r) => { if (active) setPosts(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (active) setPosts([]); });
    return () => { active = false; };
  }, [organizationId]);

  if (posts.length === 0) return null;

  return (
    <Box>
      <Typography variant="h4" component="h2" sx={{ color: 'text.primary', mb: 2 }}>
        Latest
      </Typography>

      <Box sx={{ display: 'grid', gap: 2 }}>
        {posts.map((p) => (
          <Box key={p.id} sx={{ borderRadius: '16px', border: `1px solid ${border}`, overflow: 'hidden' }}>
            {p.imageUrl && (
              <Box component="img" src={p.imageUrl} alt="" sx={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'cover' }} />
            )}
            <Box sx={{ px: 2.5, py: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}>
                {formatRelativeTime(p.createdAt)}
              </Typography>
              {/* Plain text from the server, rendered as a child so React escapes it. */}
              <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                {p.body}
              </Typography>
              {p.tripId && (
                <Button
                  size="small"
                  onClick={() => navigate(`/trip/${p.tripId}`)}
                  sx={{ textTransform: 'none', fontWeight: 700, mt: 1, px: 0 }}
                >
                  See the trip
                </Button>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default PublicOrganizationPosts;
