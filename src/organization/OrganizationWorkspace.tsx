/**
 * /organizations/:orgId , the inside of one organisation.
 *
 * The list page answers "which of these do I belong to"; this answers "run it".
 * Most people hold exactly one, so /organizations sends them straight here.
 */

import React from 'react';
import {
  Avatar, Box, Button, Chip, CircularProgress, Typography, useTheme,
} from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { IconArrowLeft, IconExternalLink, IconRosetteDiscountCheckFilled } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import OrganizationTripsPanel from './OrganizationTripsPanel';
import OrganizationNoticesPanel from './OrganizationNoticesPanel';
import OrganizationPeoplePanel from './OrganizationPeoplePanel';
import OrganizationPostsPanel from './OrganizationPostsPanel';
import OrganizationSettingsPanel from './OrganizationSettingsPanel';
import PlanGate from './PlanGate';
import { isOrganizationAdmin, runsOrganizationTrips, PLAN_FEATURES } from './types';
import type { Organization } from './types';

const CONTENT_MAX = 1280;

// Notices sits after Trips: it is the tab something is usually waiting in, and
// the queue inside it is the thing nobody remembers to open when it is buried.
const TABS = ['trips', 'notices', 'people', 'posts', 'settings'] as const;
type TabId = typeof TABS[number];

const TAB_LABELS: Record<TabId, string> = {
  trips: 'Trips',
  notices: 'Notices',
  people: 'People',
  posts: 'Posts',
  settings: 'Settings',
};

const STATUS_COPY: Record<string, string> = {
  pending: 'Awaiting review',
  approved: 'Approved',
  rejected: 'Not approved',
  suspended: 'Suspended',
};

const OrganizationWorkspace: React.FC = () => {
  const { orgId = '' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { token } = useAuthToken();
  const border = theme.custom.surface.border;

  const [organization, setOrganization] = React.useState<Organization | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const requested = searchParams.get('tab');
  const tab: TabId = (TABS as readonly string[]).includes(requested ?? '') ? requested as TabId : 'trips';
  const setTab = (next: TabId) => setSearchParams((prev) => {
    if (next === 'trips') prev.delete('tab'); else prev.set('tab', next);
    return prev;
  }, { replace: true });

  const load = React.useCallback(async () => {
    if (!token || !orgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const resp = await apiServices.getOrganization(token, orgId);
      setOrganization(resp.data ?? null);
    } catch {
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  }, [token, orgId]);

  React.useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (!organization) {
    return (
      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, md: 4 }, py: 8 }}>
        <EmptyState
          icon={IconArrowLeft}
          title="Not found"
          description="This organization does not exist, or you do not belong to it."
          actionLabel="Back to your organizations"
          onAction={() => navigate('/organizations')}
        />
      </Box>
    );
  }

  const canAdmin = isOrganizationAdmin(organization);
  const canRunTrips = runsOrganizationTrips(organization);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo title={`${organization.name} on Tripician`} description="Run your organization on Tripician." path={`/organizations/${organization.id}`} noindex />

      <Box sx={{ position: 'relative', height: { xs: 140, md: 200 }, overflow: 'hidden', bgcolor: 'action.hover' }}>
        {organization.coverUrl && (
          <Box component="img" src={organization.coverUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </Box>

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mt: -5, mb: 2.5, flexWrap: 'wrap' }}>
          <Avatar
            src={organization.logoUrl ?? undefined}
            variant="rounded"
            sx={{
              width: 84, height: 84, borderRadius: '18px',
              border: `3px solid ${theme.palette.background.default}`,
              bgcolor: 'primary.main', fontSize: 30, fontWeight: 700,
            }}
          >
            {organization.name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1, pb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h4" component="h1" sx={{ color: 'text.primary' }} noWrap>
                {organization.name}
              </Typography>
              {organization.verified && (
                <IconRosetteDiscountCheckFilled size={20} style={{ color: '#0EA5E9' }} />
              )}
              <Chip
                size="small"
                label={STATUS_COPY[organization.status] ?? organization.status}
                sx={{ fontWeight: 700, fontSize: 11, height: 22 }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={organization.plan === 'business' ? 'Business' : 'Free'}
                sx={{ fontWeight: 700, fontSize: 11, height: 22 }}
              />
            </Box>
            {organization.slug && (
              <Button
                size="small"
                onClick={() => navigate(`/o/${organization.slug}`)}
                endIcon={<IconExternalLink size={14} />}
                sx={{ textTransform: 'none', color: 'text.secondary', px: 0, mt: 0.25 }}
              >
                tripician.com/o/{organization.slug}
              </Button>
            )}
          </Box>
        </Box>

        <Box
          role="tablist"
          sx={{
            display: 'flex', gap: 0.5, mb: 3, overflowX: 'auto',
            borderBottom: `1px solid ${border}`,
            scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {TABS.map((id) => {
            const active = tab === id;
            return (
              <Box
                key={id}
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                sx={{
                  flexShrink: 0, border: 'none', bgcolor: 'transparent', cursor: 'pointer',
                  px: 1.75, py: 1.25, fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                  color: active ? 'text.primary' : 'text.secondary',
                  borderBottom: `2px solid ${active ? theme.palette.primary.main : 'transparent'}`,
                  '&:hover': { color: 'text.primary' },
                  '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
                }}
              >
                {TAB_LABELS[id]}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ pb: 10 }}>
          {tab === 'trips' && (
            <OrganizationTripsPanel organizationId={organization.id} organization={organization} />
          )}

          {tab === 'notices' && <OrganizationNoticesPanel organization={organization} />}

          {tab === 'people' && <OrganizationPeoplePanel organization={organization} />}

          {tab === 'posts' && (
            canRunTrips ? (
              <PlanGate
                organization={organization}
                feature={PLAN_FEATURES.posts}
                title="Posting needs Tripician Business"
                body="Tell the community what you are running: a trip with places left, a date change, a photograph from last weekend. Posts show on your profile and in the community feed."
              >
                <OrganizationPostsPanel organization={organization} />
              </PlanGate>
            ) : (
              <OrganizationPostsPanel organization={organization} />
            )
          )}

          {tab === 'settings' && (
            canAdmin
              ? <OrganizationSettingsPanel organization={organization} onSaved={load} />
              : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Only an admin can change this organization.
                </Typography>
              )
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default OrganizationWorkspace;
