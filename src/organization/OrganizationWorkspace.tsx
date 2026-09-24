// /groups/:groupId: the inside of one group. What its people are saying, what it is telling them, what it is doing, and what it did.

import React from 'react';
import {
  Avatar, Box, Button, Chip, CircularProgress, Typography, useTheme,
} from '@mui/material';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { IconArrowLeft, IconExternalLink, IconRosetteDiscountCheckFilled, IconUserPlus } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import OrganizationTripsPanel from './OrganizationTripsPanel';
import OrganizationNoticesPanel from './OrganizationNoticesPanel';
import OrganizationPeoplePanel from './OrganizationPeoplePanel';
import OrganizationPostsPanel from './OrganizationPostsPanel';
import OrganizationSettingsPanel from './OrganizationSettingsPanel';
import GroupTripsPanel from './GroupTripsPanel';
import GroupStoriesPanel from './GroupStoriesPanel';
import GroupDiscussionPanel from './GroupDiscussionPanel';
import GroupPlanPanel from './GroupPlanPanel';
import PlanGate from './PlanGate';
import { groupDefaultTab, groupTabs, splitGroupTrips, type GroupTabId } from './groupLogic';
import { isOrganizationAdmin, runsOrganizationTrips, PLAN_FEATURES } from './types';
import type { GroupTrip, Organization } from './types';

const CONTENT_MAX = 1280;

const TAB_LABELS: Record<GroupTabId, string> = {
  discussion: 'Discussion',
  notices: 'Announcements',
  trips: 'Trips',
  stories: 'Stories',
  members: 'Members',
  manage: 'Manage trips',
  posts: 'Posts',
  settings: 'Settings',
};

// Links written before groups used these names. Plans and Past trips are one tab now, so both land on it.
const OLD_TABS: Record<string, GroupTabId> = { people: 'members', plans: 'trips', past: 'trips' };

const STATUS_COPY: Record<string, string> = {
  pending: 'Awaiting review',
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
  const [trips, setTrips] = React.useState<GroupTrip[]>([]);
  const [tripsLoading, setTripsLoading] = React.useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

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

  React.useEffect(() => {
    if (!orgId || !organization) return;
    let active = true;
    setTripsLoading(true);
    apiServices.getGroupTrips(orgId)
      .then((r) => { if (active) setTrips(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (active) setTrips([]); })
      .finally(() => { if (active) setTripsLoading(false); });
    return () => { active = false; };
  }, [orgId, organization]);

  const split = React.useMemo(() => splitGroupTrips(trips), [trips]);

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
          description="This group does not exist, or you do not belong to it."
          actionLabel="Back to your groups"
          onAction={() => navigate('/groups')}
        />
      </Box>
    );
  }

  const canAdmin = isOrganizationAdmin(organization);
  const canRunTrips = runsOrganizationTrips(organization);
  const business = organization.kind === 'business';

  const tabs = groupTabs(organization);
  const fallback = groupDefaultTab(organization);
  const requested = searchParams.get('tab') ?? '';
  const asked = OLD_TABS[requested] ?? requested;
  const tab: GroupTabId = (tabs as string[]).includes(asked) ? asked as GroupTabId : fallback;
  // The landing tab carries no parameter, so a group's canonical URL stays clean.
  const setTab = (next: GroupTabId) => setSearchParams((prev) => {
    if (next === fallback) prev.delete('tab'); else prev.set('tab', next);
    return prev;
  }, { replace: true });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo title={`${organization.name} on Tripician`} description="Plan trips together on Tripician." path={`/groups/${organization.id}`} noindex />

      <Box sx={{ position: 'relative', height: { xs: 140, md: 200 }, overflow: 'hidden', bgcolor: theme.custom.surface.brandTint }}>
        {organization.coverUrl && (
          <Box component="img" src={organization.coverUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </Box>

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, md: 4 } }}>
        {/* Only the logo overlaps the cover; the name and the button start below its edge. */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mt: -5, mb: 2.5, flexWrap: 'wrap' }}>
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

          <Box sx={{ minWidth: 0, flex: 1, pb: 0.5, mt: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h4" component="h1" sx={{ color: 'text.primary' }} noWrap>
                {organization.name}
              </Typography>
              {organization.verified && (
                <Box component="span" aria-label="Verified business" sx={{ display: 'inline-flex', color: 'primary.main' }}>
                  <IconRosetteDiscountCheckFilled size={20} />
                </Box>
              )}
              {organization.status !== 'approved' && (
                <Chip size="small" label={STATUS_COPY[organization.status] ?? organization.status} sx={{ fontWeight: 700, height: 22 }} />
              )}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 0.75 }}>
              <span>
                {business ? 'Business' : organization.visibility === 'private' ? 'Private group' : 'Public group'}
                {' · '}
                {organization.memberCount} {organization.memberCount === 1 ? 'member' : 'members'}
              </span>
              {organization.slug && organization.visibility !== 'private' && (
                <>
                  {/* On a phone the link wraps to its own line, where a leading dot would dangle. */}
                  <Box component="span" aria-hidden sx={{ display: { xs: 'none', sm: 'inline' } }}>·</Box>
                  <Box
                    component={RouterLink}
                    to={`/o/${organization.slug}`}
                    sx={{ color: 'text.secondary', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.25, textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                  >
                    Public page <IconExternalLink size={13} />
                  </Box>
                </>
              )}
            </Typography>
          </Box>

          {canAdmin && !business && (
            <Button variant="outlined" startIcon={<IconUserPlus size={17} />} onClick={() => setTab('members')} sx={{ textTransform: 'none', fontWeight: 700, mt: { xs: 0, sm: 6 }, flexBasis: { xs: '100%', sm: 'auto' } }}>
              Invite people
            </Button>
          )}
        </Box>

        <Box
          role="tablist"
          sx={{
            display: 'flex', gap: 0.5, mb: 3, overflowX: 'auto',
            borderBottom: `1px solid ${border}`,
            scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {tabs.map((id) => {
            const active = tab === id;
                        // Only what is still ahead: a count that included finished trips would never go down.
                        const count = id === 'trips' ? split.plans.length : 0;
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
                  px: 1.75, py: 1.25, fontFamily: 'inherit', typography: 'body2', fontWeight: 700,
                  color: active ? 'text.primary' : 'text.secondary',
                  borderBottom: `2px solid ${active ? theme.palette.primary.main : 'transparent'}`,
                  '&:hover': { color: 'text.primary' },
                  '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
                }}
              >
                {TAB_LABELS[id]}{count > 0 ? ` ${count}` : ''}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ pb: 10 }}>
          {tab === 'trips' && <GroupTripsPanel organization={organization} trips={trips} loading={tripsLoading} />}
          {tab === 'stories' && <GroupStoriesPanel groupId={organization.id} />}
          {tab === 'discussion' && <GroupDiscussionPanel organization={organization} />}
          {tab === 'members' && <OrganizationPeoplePanel organization={organization} />}
          {tab === 'notices' && <OrganizationNoticesPanel organization={organization} />}
          {tab === 'manage' && <OrganizationTripsPanel organizationId={organization.id} organization={organization} />}

          {tab === 'posts' && (
            canRunTrips ? (
              <PlanGate
                organization={organization}
                feature={PLAN_FEATURES.posts}
                title="Posting needs Tripician Business"
                body="Tell travellers what you are running: a trip with places left, a date change, a photograph from last weekend. Posts show on your business page."
              >
                <OrganizationPostsPanel organization={organization} />
              </PlanGate>
            ) : (
              <OrganizationPostsPanel organization={organization} />
            )
          )}

          {tab === 'settings' && (
            <Box sx={{ display: 'grid', gap: 5 }}>
              <GroupPlanPanel organization={organization} />
              <OrganizationSettingsPanel organization={organization} onSaved={load} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default OrganizationWorkspace;
