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
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import { safeExternalUrl } from '../utils/sanitizeHtml';
import PublicOrganizationPosts from './PublicOrganizationPosts';
import JoinGroupButton from './JoinGroupButton';
import GroupStoriesPanel from './GroupStoriesPanel';
import CommunityTripCard from '../pages/CommunityPage/CommunityTripCard';
import { usePublishedTrips } from '../pages/CommunityPage/usePublishedTrips';
import { compareTripsForFeed, isJoinable } from '../utils/tripRanking';
import { tripPath } from '../utils/tripSlug';
import type { OrganizationPublic } from './types';

const CONTENT_MAX = 900;

const OrganizationProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuthToken();
  const theme = useTheme();
  const navigate = useNavigate();
  const { trips } = usePublishedTrips();

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
    // Keyed on the token too: viewerRole and viewerRequestStatus are answers about
    // the signed-in person, so a read made before the session was ready is wrong
    // and has to be replaced rather than kept for the life of the page.
  }, [slug, token]);

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
          title="Group not found"
          description="This group does not exist, is private, or is no longer active."
        />
      </Box>
    );
  }

  const website = safeExternalUrl(organization.website);
  // This group's published trips; the ones you can still ask to join lead.
  const groupTrips = trips
    .filter((t) => t?.organizationId === organization.id)
    .sort((a, b) => Number(isJoinable(b)) - Number(isJoinable(a)) || compareTripsForFeed(a, b));

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

          {/* Only the logo overlaps the cover; the name starts below it, so it is never set over a photograph. */}
          <Box sx={{ minWidth: 0, flex: 1, mt: organization.coverUrl ? 5.5 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h2" component="h1" sx={{ color: 'text.primary' }}>{organization.name}</Typography>
              {organization.verified && (
                <Chip size="small" color="primary" label="Tripician Verified" />
              )}
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {[
                organization.kind === 'business' ? 'Business' : 'Group',
                organization.memberCount > 0 ? `${organization.memberCount} ${organization.memberCount === 1 ? 'member' : 'members'}` : null,
                organization.memberSince ? `on Tripician since ${dayjs(organization.memberSince).format('MMMM YYYY')}` : null,
              ].filter(Boolean).join(' · ')}
            </Typography>

            <Box sx={{ mt: 1.5 }}>
              <JoinGroupButton group={organization} onChange={(patch) => setOrganization((prev) => (prev ? { ...prev, ...patch } : prev))} />
            </Box>
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

        {groupTrips.length > 0 && (
          <Box component="section" sx={{ mt: 5 }}>
            <Typography variant="h4" component="h2">Trips</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, mb: 2 }}>
              Open a trip to ask to join or to enquire. Tripician takes no payment; you settle costs with the organiser directly.
            </Typography>
            <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
              {groupTrips.map((t) => (
                <CommunityTripCard
                  key={t.id || t.Id}
                  trip={t}
                  onClick={() => navigate(tripPath({ id: t.id || t.Id, name: t.name }), { state: { trip: t } })}
                />
              ))}
            </Box>
          </Box>
        )}

        <GroupStoriesPanel groupId={organization.id} title="Stories" hideWhenEmpty />

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
