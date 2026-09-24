import React from 'react';
import {
  Avatar, Box, Button, Chip, IconButton, MenuItem, Select, TextField, Typography, useTheme,
} from '@mui/material';
import { IconTrash } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import type { RootState } from '../store';
import PlanGate from './PlanGate';
import GroupInviteCard from './GroupInviteCard';
import GroupRequestsCard from './GroupRequestsCard';
import { groupIsFull } from './groupLogic';
import { isOrganizationAdmin, hasFeature, PLAN_FEATURES } from './types';
import type { Organization, OrganizationMember, OrganizationRole } from './types';

const ROLE_COPY: Record<OrganizationRole, string> = {
  admin: 'Runs the group, its people and its trips',
  manager: 'Runs the trips and posts, cannot change the group',
  member: 'Sees the group\'s plans and stories',
};

interface OrganizationPeoplePanelProps {
  organization: Organization;
}

const OrganizationPeoplePanel: React.FC<OrganizationPeoplePanelProps> = ({ organization }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const border = theme.custom.surface.border;
  const navigate = useNavigate();
  const viewerId = useSelector((s: RootState) => Number(s.user.profile?.id));
  const canManage = isOrganizationAdmin(organization);
  const managerAllowed = hasFeature(organization, PLAN_FEATURES.managerRole);
  // A business adds its staff by name; a community group grows only by requests and its invite link, which people agree to.
  const addsByName = canManage && organization.kind === 'business';

  const [members, setMembers] = React.useState<OrganizationMember[]>([]);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Array<{ id: number; fname: string; lname: string; email: string }>>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token) return;
    try {
      const resp = await apiServices.getOrganizationMembers(token, organization.id);
      setMembers(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      setMembers([]);
    }
  }, [token, organization.id]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    if (!token || query.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const resp = await apiServices.searchUsersByName(token, query.trim());
        if (!cancelled) setResults(resp.data.slice(0, 8));
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 280);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [token, query]);

  const add = async (userId: number) => {
    if (!token) return;
    setError(null);
    try {
      await apiServices.addOrganizationMember(token, organization.id, userId, 'member');
      setQuery('');
      setResults([]);
      await load();
    } catch {
      setError('That person could not be added.');
    }
  };

  const setRole = async (userId: number, role: OrganizationRole) => {
    if (!token) return;
    setError(null);
    try {
      await apiServices.setOrganizationMemberRole(token, organization.id, userId, role);
      await load();
    } catch {
      setError('That role change did not save. A group always needs at least one admin.');
    }
  };

  const remove = async (userId: number) => {
    if (!token) return;
    setError(null);
    try {
      await apiServices.removeOrganizationMember(token, organization.id, userId);
      await load();
    } catch {
      setError('A group always needs at least one admin.');
    }
  };

  const leave = async () => {
    if (!token || !window.confirm(`Leave ${organization.name}? You will stop seeing its plans. Trips you are on are not affected.`)) return;
    try {
      await apiServices.removeOrganizationMember(token, organization.id, viewerId);
      navigate('/groups', { replace: true });
    } catch {
      setError('You are the only admin. Make someone else an admin first.');
    }
  };

  const count = members.length || organization.memberCount;
  const limit = organization.memberLimit;
  const full = groupIsFull(count, limit);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      {typeof limit === 'number' && (
        <Typography variant="body2" sx={{ color: full ? 'text.primary' : 'text.secondary', fontWeight: full ? 700 : 400 }}>
          {count} of {limit} members.
          {full && (canManage
            ? ' The group is full: requests wait and the invite link stops working until someone leaves, or the group moves to Club in Settings.'
            : ' The group is full for now.')}
        </Typography>
      )}

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {organization.kind === 'business'
          ? 'Belonging here does not put anyone on a trip. Adding someone to a trip is a separate, deliberate act on the Manage trips tab.'
          : 'Members see the group\'s plans and stories. Going on a trip is still decided trip by trip.'}
      </Typography>

      {canManage && organization.kind !== 'business' && (
        <>
          <GroupRequestsCard organization={organization} onDecided={() => void load()} />
          <GroupInviteCard organization={organization} />
        </>
      )}

      {addsByName && (
        <Box>
          <TextField
            fullWidth
            size="small"
            label="Add someone by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
          {results.length > 0 && (
            <Box sx={{ mt: 1, borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden' }}>
              {results.map((r) => (
                <Box
                  key={r.id}
                  component="button"
                  type="button"
                  onClick={() => void add(r.id)}
                  sx={{
                    display: 'flex', width: '100%', alignItems: 'center', gap: 1.25,
                    border: 'none', bgcolor: 'transparent', px: 1.75, py: 1.25,
                    font: 'inherit', textAlign: 'left', cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{r.fname?.charAt(0)?.toUpperCase()}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{r.fname} {r.lname}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }} noWrap>{r.email}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {error && <Typography variant="body2" color="error">{error}</Typography>}

      <Box sx={{ borderRadius: '16px', border: `1px solid ${border}`, overflow: 'hidden' }}>
        {members.map((m, i) => (
          <Box
            key={m.userId}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
              borderTop: i === 0 ? 'none' : `1px solid ${border}`,
            }}
          >
            <Avatar src={m.avatarUrl ?? undefined} sx={{ width: 34, height: 34, fontSize: 13 }}>
              {(m.name ?? '?').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>
                {m.name ?? `User ${m.userId}`}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {ROLE_COPY[m.role] ?? m.role}
              </Typography>
            </Box>

            {canManage ? (
              <Select
                size="small"
                value={m.role}
                onChange={(e) => void setRole(m.userId, e.target.value as OrganizationRole)}
                sx={{ borderRadius: '10px', minWidth: 116 }}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="manager" disabled={!managerAllowed}>Manager</MenuItem>
                <MenuItem value="member">Member</MenuItem>
              </Select>
            ) : (
              <Chip size="small" label={m.role} sx={{ fontWeight: 700, fontSize: 11, height: 22 }} />
            )}

            {canManage && (
              <IconButton size="small" onClick={() => void remove(m.userId)} sx={{ color: 'text.secondary' }}>
                <IconTrash size={15} />
              </IconButton>
            )}
          </Box>
        ))}
      </Box>

      {Number.isFinite(viewerId) && members.some((m) => m.userId === viewerId) && (
        <Box>
          <Button onClick={() => void leave()} sx={{ textTransform: 'none', color: 'text.secondary' }}>
            Leave {organization.name}
          </Button>
        </Box>
      )}

      {canManage && !managerAllowed && (
        <PlanGate
          organization={organization}
          feature={PLAN_FEATURES.managerRole}
          title={organization.kind === 'business' ? 'Managers need Tripician Business' : 'Managers need Tripician Club'}
          body="A manager runs your trips and posts on your behalf without being able to edit the group or change who belongs to it. Useful once more than one person is leading trips."
        >
          <span />
        </PlanGate>
      )}
    </Box>
  );
};

export default OrganizationPeoplePanel;
