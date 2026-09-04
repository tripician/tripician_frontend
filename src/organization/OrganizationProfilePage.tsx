/**
 * /o/:slug , the public face of an organisation.
 *
 * Approved organisations only. Nothing here is inferred: no trip counts, no
 * ratings, no years-in-business. The verified mark appears only when a person
 * at Tripician granted it.
 */

import React from 'react';
import { Avatar, Box, Button, Chip, CircularProgress, Typography, useTheme } from '@mui/material';
import { IconBuildingCommunity, IconExternalLink } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiServices } from '../services/APIs/apiServices';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import { safeExternalUrl } from '../utils/sanitizeHtml';
import PublicOrganizationPosts from './PublicOrganizationPosts';
import type { OrganizationPublic } from './types';

const CONTENT_MAX = 900;

const OrganizationProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const theme = useTheme();

  const [organization, setOrganization] = React.useState<OrganizationPublic | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    if (!slug) { setLoading(false); return; }

    setLoading(true);
    apiServices.getPublicOrganization(slug)
      .then((resp) => { if (!cancelled) setOrganization(resp.data ?? null); })
      .catch(() => { if (!cancelled) setOrganization(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!organization) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', px: 2 }}>
        <EmptyState
          icon={IconBuildingCommunity}
          title="Organization not found"
          description="This page belongs to an organization that is not listed, or is no longer active."
        />
      </Box>
    );
  }

  const website = safeExternalUrl(organization.website);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title={organization.name}
        description={organization.description ?? `${organization.name} on Tripician.`}
        path={`/o/${organization.slug ?? ''}`}
      />

      {organization.coverUrl && (
        <Box sx={{ height: { xs: 160, md: 260 }, overflow: 'hidden', bgcolor: 'action.hover' }}>
          <Box component="img" src={organization.coverUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      )}

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3 }, pt: organization.coverUrl ? 0 : { xs: 4, md: 6 }, pb: 10 }}>
        <Box
          sx={{
            display: 'flex', gap: 2.5, alignItems: 'flex-start', flexWrap: 'wrap',
            mt: organization.coverUrl ? -5 : 0,
          }}
        >
          <Avatar
            src={organization.logoUrl ?? undefined}
            variant="rounded"
            sx={{
              width: 76, height: 76, borderRadius: '18px', bgcolor: 'primary.main',
              ...(organization.coverUrl ? { border: `3px solid ${theme.palette.background.default}` } : {}),
            }}
          >
            {organization.name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h2" sx={{ color: 'text.primary' }}>{organization.name}</Typography>
              {organization.verified && (
                <Chip size="small" color="primary" label="Tripician Verified" />
              )}
            </Box>

            {organization.memberSince && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                On Tripician since {dayjs(organization.memberSince).format('MMMM YYYY')}
              </Typography>
            )}
          </Box>
        </Box>

        {organization.description && (
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary', mt: 3, whiteSpace: 'pre-line',
              pt: 3, borderTop: `1px solid ${theme.custom.surface.border}`,
            }}
          >
            {organization.description}
          </Typography>
        )}

        {website && (
          <Button
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<IconExternalLink size={16} />}
            sx={{ borderRadius: '12px', mt: 3 }}
          >
            Visit website
          </Button>
        )}

        <Box sx={{ mt: 5 }}>
          <PublicOrganizationPosts organizationId={organization.id} />
        </Box>

        {organization.verified && (
          <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 4 }}>
            Verified means Tripician checked that this business is who it says it is.
            It is not a judgement of any individual trip.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default OrganizationProfilePage;
