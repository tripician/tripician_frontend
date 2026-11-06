import React from 'react';
import { Avatar, Box, Button, Chip, InputAdornment, TextField, Typography, useTheme } from '@mui/material';
import { IconSearch, IconUserPlus } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { serverMessage } from '../utils/apiError';
import { inviteResultLabel } from './groupLogic';
import type { GroupInvitee, Organization, OrganizationMember } from './types';

type Person = { id: number; name: string; avatar: string | null };

interface GroupInvitePeopleCardProps {
  organization: Organization;
  members: OrganizationMember[];
  /** Straight after starting the group, the search is where the cursor should be. */
  autoFocus?: boolean;
}

// Admins of a community group invite people by name. Nobody is added: each person
// gets a notification and is in only once they say yes. The link is the other way in.
const GroupInvitePeopleCard: React.FC<GroupInvitePeopleCardProps> = ({ organization, members, autoFocus = false }) => {
  const theme = useTheme();
  const border = theme.custom.surface.border;
  const { token } = useAuthToken();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Person[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [invitees, setInvitees] = React.useState<GroupInvitee[]>([]);
  // What happened to each person invited from this card, until the lists say it themselves.
  const [outcomes, setOutcomes] = React.useState<Record<number, string>>({});
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadInvitees = React.useCallback(async () => {
    try {
      const resp = await apiServices.getGroupInvitees(organization.id);
      setInvitees(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      setInvitees([]);
    }
  }, [organization.id]);

  React.useEffect(() => { void loadInvitees(); }, [loadInvitees]);

  React.useEffect(() => {
    const q = query.trim();
    if (!token || q.length < 2) { setResults([]); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const resp = await apiServices.searchUsersByName(token, q, 10);
        if (cancelled) return;
        setResults((resp.data ?? []).map((u) => ({
          id: u.id,
          name: `${u.fname ?? ''} ${u.lname ?? ''}`.trim() || 'Traveller',
          avatar: u.avatar ?? null,
        })));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [token, query]);

  const memberIds = React.useMemo(() => new Set(members.map((m) => m.userId)), [members]);
  const invitedIds = React.useMemo(() => new Set(invitees.map((i) => i.userId)), [invitees]);

  const invite = async (person: Person) => {
    setBusyId(person.id);
    setError(null);
    try {
      const resp = await apiServices.inviteToGroup(organization.id, [person.id]);
      const status = (Array.isArray(resp.data) ? resp.data : []).find((r) => r.userId === person.id)?.status ?? 'unavailable';
      setOutcomes((previous) => ({ ...previous, [person.id]: status }));
      if (status === 'invited') await loadInvitees();
    } catch (err) {
      setError(serverMessage(err) ?? 'That invitation could not be sent. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const withdraw = async (userId: number) => {
    setBusyId(userId);
    setError(null);
    try {
      await apiServices.withdrawGroupInvitation(organization.id, userId);
      setInvitees((previous) => previous.filter((i) => i.userId !== userId));
      setOutcomes((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
    } catch (err) {
      setError(serverMessage(err) ?? 'That invitation could not be withdrawn.');
    } finally {
      setBusyId(null);
    }
  };

  const typed = query.trim();

  return (
    <Box sx={{ borderRadius: '16px', border: `1px solid ${border}`, p: 2, display: 'grid', gap: 1.5 }}>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>Invite people by name</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Each person gets a notification and joins when they say yes.
        </Typography>
      </Box>

      <TextField
        size="small"
        fullWidth
        autoFocus={autoFocus}
        placeholder="Search by name or email"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        inputProps={{ 'aria-label': 'Search people to invite' }}
        InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
      />

      {typed.length >= 2 && !searching && results.length === 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Nobody by that name. Check the spelling, or share the invite link below.
        </Typography>
      )}

      {results.length > 0 && (
        <Box sx={{ borderRadius: '12px', border: `1px solid ${border}`, overflow: 'hidden' }}>
          {results.map((person, index) => {
            const outcome = memberIds.has(person.id) ? 'member' : invitedIds.has(person.id) ? 'invited' : outcomes[person.id];
            return (
              <Box
                key={person.id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 1,
                  borderTop: index === 0 ? 'none' : `1px solid ${border}`,
                }}
              >
                <Avatar src={person.avatar ?? undefined} sx={{ width: 30, height: 30, fontSize: 12 }}>
                  {person.name.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0, color: 'text.primary' }} noWrap>
                  {person.name}
                </Typography>
                {outcome ? (
                  <Chip size="small" variant="outlined" label={inviteResultLabel(outcome)} sx={{ fontWeight: 600 }} />
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<IconUserPlus size={15} />}
                    onClick={() => void invite(person)}
                    disabled={busyId !== null}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                  >
                    Invite
                  </Button>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {error && <Typography variant="body2" color="error">{error}</Typography>}

      {invitees.length > 0 && (
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>Waiting for an answer</Typography>
          <Box sx={{ display: 'grid', gap: 0.75, mt: 0.5 }}>
            {invitees.map((invitee) => (
              <Box key={invitee.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Avatar src={invitee.avatarUrl ?? undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
                  {(invitee.name ?? '?').charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: 'text.primary' }} noWrap>
                  {invitee.name ?? `User ${invitee.userId}`}
                </Typography>
                <Button
                  size="small"
                  onClick={() => void withdraw(invitee.userId)}
                  disabled={busyId !== null}
                  sx={{ textTransform: 'none', color: 'text.secondary' }}
                >
                  Withdraw
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default GroupInvitePeopleCard;
