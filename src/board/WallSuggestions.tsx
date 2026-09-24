// People and groups to follow from the Wall. Every row carries the one true reason it is there; nothing is ranked as "popular".
import React from 'react';
import { Avatar, Box, Button, IconButton, Typography, useTheme } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { IconCheck, IconPlus, IconRosetteDiscountCheckFilled, IconUserPlus, IconX } from '@tabler/icons-react';
import ScrollRail from '../components/ui/ScrollRail';
import { useAuthToken } from '../hooks/useAuth0Token';
import { useFollowState } from '../hooks/useFollowState';
import { apiServices } from '../services/APIs/apiServices';
import { serverMessage } from '../utils/apiError';
import { groupHomePath } from '../organization/groupLogic';
import type { GroupSuggestion } from '../organization/types';
import type { RootState } from '../store';
import type { useWallSuggestions } from './useWallSuggestions';

function useGroupRequests() {
  const [requested, setRequested] = React.useState<Set<string>>(new Set());
  const request = React.useCallback(async (id: string) => {
    try {
      await apiServices.requestToJoinGroup(id);
      setRequested((prev) => new Set(prev).add(id));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: serverMessage(err) ?? 'That request could not be sent. Try again.' } }));
    }
  }, []);
  return { requested, request };
}

// The rail is a side column, so its actions are text in brand colour; the phone's cards keep a solid button as their one action.
const quietSx = (done: boolean) => ({
  textTransform: 'none', fontWeight: 700, minWidth: 0, px: 1, flexShrink: 0,
  color: done ? 'text.secondary' : 'primary.main',
}) as const;

const FollowButton: React.FC<{ on: boolean; busy: boolean; name: string; onClick: () => void; fullWidth?: boolean; quiet?: boolean }> = ({ on, busy, name, onClick, fullWidth, quiet }) => (
  <Button
    size="small"
    variant={quiet ? 'text' : on ? 'outlined' : 'contained'}
    disabled={busy}
    fullWidth={fullWidth}
    onClick={onClick}
    startIcon={quiet ? undefined : on ? <IconCheck size={14} /> : <IconUserPlus size={14} />}
    aria-label={on ? `Unfollow ${name}` : `Follow ${name}`}
    sx={quiet ? quietSx(on) : { textTransform: 'none', fontWeight: 700, minWidth: 0, px: 1.25, flexShrink: 0 }}
  >
    {on ? 'Following' : 'Follow'}
  </Button>
);

const GroupAction: React.FC<{ group: GroupSuggestion; requested: boolean; onRequest: () => void; fullWidth?: boolean; quiet?: boolean }> = ({ group, requested, onRequest, fullWidth, quiet }) => {
  const navigate = useNavigate();
  if (!group.requestable) {
    return (
      <Button size="small" variant={quiet ? 'text' : 'outlined'} fullWidth={fullWidth} onClick={() => navigate(`/o/${encodeURIComponent(group.slug)}`)} sx={quiet ? quietSx(false) : { textTransform: 'none', fontWeight: 700, flexShrink: 0 }}>
        View
      </Button>
    );
  }
  return (
    <Button
      size="small"
      variant={quiet ? 'text' : requested ? 'outlined' : 'contained'}
      disabled={requested}
      fullWidth={fullWidth}
      onClick={onRequest}
      aria-label={requested ? `Request sent to ${group.name}` : `Ask to join ${group.name}`}
      sx={quiet ? quietSx(requested) : { textTransform: 'none', fontWeight: 700, flexShrink: 0, px: 1.25 }}
    >
      {requested ? 'Requested' : 'Ask to join'}
    </Button>
  );
};

const Dismiss: React.FC<{ label: string; onClick: () => void; sx?: object }> = ({ label, onClick, sx }) => (
  <IconButton size="small" aria-label={`Hide ${label}`} onClick={onClick} sx={{ color: 'text.disabled', ...sx }}>
    <IconX size={15} />
  </IconButton>
);

// Groups are started where groups are found; the path is the one the rest of the app uses.
const START_GROUP = '/groups?new=1';

const StartGroupButton: React.FC = () => (
  <Button
    size="small"
    component={RouterLink}
    to={START_GROUP}
    startIcon={<IconPlus size={15} />}
    sx={{ textTransform: 'none', fontWeight: 700, ml: -0.75, mt: 0.5 }}
  >
    Start a group
  </Button>
);

const CardShell: React.FC<{ title: string; seeAll: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, seeAll, children, footer }) => {
  const theme = useTheme();
  return (
    <Box component="section" aria-label={title} sx={{ p: 2, borderRadius: '16px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Box component={RouterLink} to={seeAll} sx={{ typography: 'caption', fontWeight: 700, color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
          See all
        </Box>
      </Box>
      {children}
      {footer}
    </Box>
  );
};

interface WallSuggestionsProps {
  variant: 'rail' | 'inline';
  data: ReturnType<typeof useWallSuggestions>;
}

const WallSuggestions: React.FC<WallSuggestionsProps> = ({ variant, data }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const viewerId = useSelector((s: RootState) => {
    const id = Number(s.user.profile?.id);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  });
  const { following, busyId, toggle } = useFollowState(viewerId, token, data.people.length > 0);
  const { requested, request } = useGroupRequests();
  const { people, groups, mine, dismiss } = data;
  // Four is what fits beside the feed without the rail becoming a list of its own; the rest are one tap away.
  const myGroups = mine.slice(0, 4);

  if (!data.loaded) return null;

  if (variant === 'rail') {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2 }}>
        {myGroups.length > 0 && (
          <CardShell title="Your groups" seeAll="/groups" footer={<StartGroupButton />}>
            {myGroups.map((g) => (
              <Box
                key={g.id}
                component={RouterLink}
                to={groupHomePath(g.id)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.75, minWidth: 0, color: 'inherit', textDecoration: 'none' }}
              >
                <Avatar src={g.logoUrl ?? undefined} alt="" variant="rounded" sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'primary.main', fontWeight: 700 }}>{g.name.charAt(0).toUpperCase()}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</Box>
                    {g.verified && <Box component="span" aria-label="Verified business" sx={{ display: 'inline-flex', color: 'primary.main', flexShrink: 0 }}><IconRosetteDiscountCheckFilled size={14} /></Box>}
                  </Typography>
                  <Typography variant="caption" component="div" noWrap sx={{ color: 'text.secondary' }}>
                    {[g.memberCount === 1 ? '1 member' : `${g.memberCount} members`, g.myRole === 'admin' ? 'You run it' : null].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
              </Box>
            ))}
          </CardShell>
        )}
        {people.length > 0 && (
          <CardShell title="People you may know" seeAll="/crew">
            {people.map((p) => (
              <Box key={p.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.75 }}>
                <Box component={RouterLink} to={`/traveler/${p.userId}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1, color: 'inherit', textDecoration: 'none' }}>
                  <Avatar src={p.avatar ?? undefined} alt="" sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontWeight: 700 }}>{p.name.charAt(0).toUpperCase()}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{p.name}</Typography>
                    <Typography variant="caption" component="div" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.reason}</Typography>
                  </Box>
                </Box>
                <FollowButton quiet on={following?.has(p.userId) ?? false} busy={busyId === p.userId || following === null} name={p.name} onClick={() => void toggle(p.userId)} />
                <Dismiss label={p.name} onClick={() => dismiss('people', p.userId)} sx={{ ml: -0.5 }} />
              </Box>
            ))}
          </CardShell>
        )}
        {groups.length === 0 && myGroups.length === 0 && (
          // Early on there is nothing to suggest, and that is exactly when the way in matters most.
          <CardShell title="Groups" seeAll="/stories?kind=groups" footer={<StartGroupButton />}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Plan trips with your friends or club, all in one place.
            </Typography>
          </CardShell>
        )}
        {groups.length > 0 && (
          <CardShell title="Groups for you" seeAll="/stories?kind=groups" footer={myGroups.length > 0 ? undefined : <StartGroupButton />}>
            {groups.map((g) => (
              <Box key={g.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.75 }}>
                <Box component={RouterLink} to={`/o/${encodeURIComponent(g.slug)}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1, color: 'inherit', textDecoration: 'none' }}>
                  <Avatar src={g.logoUrl ?? undefined} alt="" variant="rounded" sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'primary.main', fontWeight: 700 }}>{g.name.charAt(0).toUpperCase()}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</Box>
                      {g.verified && <Box component="span" aria-label="Verified business" sx={{ display: 'inline-flex', color: 'primary.main', flexShrink: 0 }}><IconRosetteDiscountCheckFilled size={14} /></Box>}
                    </Typography>
                    <Typography variant="caption" component="div" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{g.reason}</Typography>
                  </Box>
                </Box>
                <GroupAction quiet group={g} requested={requested.has(g.id)} onRequest={() => void request(g.id)} />
                <Dismiss label={g.name} onClick={() => dismiss('groups', g.id)} sx={{ ml: -0.5 }} />
              </Box>
            ))}
          </CardShell>
        )}
      </Box>
    );
  }

  if (people.length === 0 && groups.length === 0) return null;

  const tile = { position: 'relative', flex: '0 0 auto', width: 172, p: 1.75, borderRadius: '14px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 } as const;

  return (
    <Box component="section" aria-label="Suggested for you" sx={{ py: 1.5 }}>
      {people.length > 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>People you may know</Typography>
            <Box component={RouterLink} to="/crew" sx={{ typography: 'caption', fontWeight: 700, color: 'text.secondary', textDecoration: 'none' }}>See all</Box>
          </Box>
          <ScrollRail gap={1.25} ariaLabel="People you may know">
            {people.map((p) => (
              <Box key={p.userId} sx={tile}>
                <Dismiss label={p.name} onClick={() => dismiss('people', p.userId)} sx={{ position: 'absolute', top: 2, right: 2 }} />
                <Box component={RouterLink} to={`/traveler/${p.userId}`} sx={{ color: 'inherit', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '100%' }}>
                  <Avatar src={p.avatar ?? undefined} alt="" sx={{ width: 60, height: 60, bgcolor: 'primary.main', fontWeight: 700 }}>{p.name.charAt(0).toUpperCase()}</Avatar>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700, maxWidth: '100%' }}>{p.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 32 }}>{p.reason}</Typography>
                </Box>
                <FollowButton fullWidth on={following?.has(p.userId) ?? false} busy={busyId === p.userId || following === null} name={p.name} onClick={() => void toggle(p.userId)} />
              </Box>
            ))}
          </ScrollRail>
        </>
      )}
      {groups.length > 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, mt: people.length > 0 ? 2 : 0 }}>
            <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>Groups for you</Typography>
            <Box component={RouterLink} to="/stories?kind=groups" sx={{ typography: 'caption', fontWeight: 700, color: 'text.secondary', textDecoration: 'none' }}>See all</Box>
          </Box>
          <ScrollRail gap={1.25} ariaLabel="Groups for you">
            {groups.map((g) => (
              <Box key={g.id} sx={tile}>
                <Dismiss label={g.name} onClick={() => dismiss('groups', g.id)} sx={{ position: 'absolute', top: 2, right: 2 }} />
                <Box component={RouterLink} to={`/o/${encodeURIComponent(g.slug)}`} sx={{ color: 'inherit', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '100%' }}>
                  <Avatar src={g.logoUrl ?? undefined} alt="" variant="rounded" sx={{ width: 60, height: 60, borderRadius: '14px', bgcolor: 'primary.main', fontWeight: 700 }}>{g.name.charAt(0).toUpperCase()}</Avatar>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700, maxWidth: '100%' }}>{g.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 32 }}>{g.reason}</Typography>
                </Box>
                <GroupAction fullWidth group={g} requested={requested.has(g.id)} onRequest={() => void request(g.id)} />
              </Box>
            ))}
            <Box
              component={RouterLink}
              to={START_GROUP}
              sx={{ ...tile, borderStyle: 'dashed', justifyContent: 'center', color: 'text.primary', textDecoration: 'none', '&:hover': { borderColor: 'text.disabled' } }}
            >
              <Box sx={{ width: 60, height: 60, borderRadius: '14px', display: 'grid', placeItems: 'center', bgcolor: theme.custom.surface.brandTint, color: 'primary.main' }}>
                <IconPlus size={26} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Start a group</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>For your friends or club</Typography>
            </Box>
          </ScrollRail>
        </>
      )}
    </Box>
  );
};

export default WallSuggestions;
