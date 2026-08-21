/**
 * /organizations , the places a person runs trips on behalf of.
 *
 * Agencies, trekking groups and travel communities are one concept here. What
 * separates them is what they switch on, not what they are.
 *
 * Membership of an organisation is not membership of its trips: nobody listed
 * on this page is on a trip because of it.
 */

import React from 'react';
import {
  Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, MenuItem,
  Select, Switch, TextField, Typography, useTheme,
} from '@mui/material';
import dayjs from 'dayjs';
import {
  IconBuildingCommunity, IconMap2, IconPlus, IconSettings, IconTrash, IconUsers,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import OrganizationTripsPanel from './OrganizationTripsPanel';
import type {
  Organization, OrganizationMember, OrganizationRole, OrganizationWrite,
} from './types';

const CONTENT_MAX = 1280;
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } as const;

const STATUS_COPY: Record<string, string> = {
  pending: 'Awaiting review',
  approved: 'Approved',
  rejected: 'Not approved',
  suspended: 'Suspended',
};

const OrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { token } = useAuthToken();

  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<Organization | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [managing, setManaging] = React.useState<Organization | null>(null);
  const [viewingTrips, setViewingTrips] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const resp = await apiServices.getMyOrganizations(token);
      setOrganizations(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => { void load(); }, [load]);

  if (!token) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <EmptyState
          icon={IconBuildingCommunity}
          title="Sign in to manage your organization"
          description="Agencies, trekking groups and travel communities run their trips from here."
          actionLabel="Sign in"
          onAction={() => navigate('/signin')}
        />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo
        title="Your organizations"
        description="Run trips as an agency, a trekking group or a travel community."
        path="/organizations"
        noindex
      />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 10 }}>
        <PageHeader
          title="Organizations"
          subtitle="Run trips as an agency, a trekking group or a travel community."
          action={(
            <Button
              variant="contained"
              startIcon={<IconPlus size={17} />}
              onClick={() => setCreating(true)}
              sx={{ borderRadius: '12px' }}
            >
              New organization
            </Button>
          )}
        />

        {organizations.length === 0 ? (
          <EmptyState
            icon={IconBuildingCommunity}
            title="No organizations yet"
            description="Create one to run trips under a shared name, with more than one person able to manage them."
            actionLabel="Create an organization"
            onAction={() => setCreating(true)}
          />
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5, mt: 3 }}>
            {organizations.map((organization) => (
              <Box key={organization.id}>
              <Box
                sx={{
                  display: 'flex', gap: 2, alignItems: 'flex-start',
                  p: 2.25, borderRadius: '16px',
                  border: `1px solid ${theme.custom.surface.border}`,
                  bgcolor: 'background.paper',
                }}
              >
                <Avatar
                  src={organization.logoUrl ?? undefined}
                  variant="rounded"
                  sx={{ width: 48, height: 48, bgcolor: 'primary.main', borderRadius: '12px' }}
                >
                  {organization.name.charAt(0).toUpperCase()}
                </Avatar>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>
                      {organization.name}
                    </Typography>
                    {organization.verified && <Chip size="small" color="primary" label="Verified" />}
                    <Chip
                      size="small"
                      variant="outlined"
                      label={STATUS_COPY[organization.status] ?? organization.status}
                    />
                    {organization.myRole === 'admin' && <Chip size="small" variant="outlined" label="Admin" />}
                  </Box>

                  {organization.description && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                      {organization.description}
                    </Typography>
                  )}

                  {organization.status === 'pending' && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                      We review every organization by hand. You can set it up in the meantime.
                    </Typography>
                  )}

                  {organization.reviewNote && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                      {organization.reviewNote}
                    </Typography>
                  )}

                  <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 1 }}>
                    {[
                      organization.slug ? `tripician.com/o/${organization.slug}` : null,
                      `Applied ${dayjs(organization.appliedAt).format('D MMM YYYY')}`,
                    ].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>

                {organization.myRole === 'admin' && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <IconButton
                      aria-label={`Trips run by ${organization.name}`}
                      onClick={() => setViewingTrips(
                        viewingTrips === organization.id ? null : organization.id,
                      )}
                      sx={{ color: viewingTrips === organization.id ? 'primary.main' : undefined }}
                    >
                      <IconMap2 size={18} />
                    </IconButton>
                    <IconButton
                      aria-label={`Members of ${organization.name}`}
                      onClick={() => setManaging(organization)}
                    >
                      <IconUsers size={18} />
                    </IconButton>
                    <IconButton
                      aria-label={`Settings for ${organization.name}`}
                      onClick={() => setEditing(organization)}
                    >
                      <IconSettings size={18} />
                    </IconButton>
                  </Box>
                )}
              </Box>

              {viewingTrips === organization.id && (
                <Box sx={{ mt: 1.5, pl: { xs: 0, sm: 2 } }}>
                  <OrganizationTripsPanel organizationId={organization.id} />
                </Box>
              )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <OrganizationDialog
        open={creating || editing !== null}
        organization={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { setCreating(false); setEditing(null); void load(); }}
      />

      <MembersDialog
        organization={managing}
        onClose={() => setManaging(null)}
      />
    </Box>
  );
};

// ── create and edit ─────────────────────────────────────────────────────────

const OrganizationDialog: React.FC<{
  open: boolean;
  organization: Organization | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, organization, onClose, onSaved }) => {
  const { token } = useAuthToken();
  const [form, setForm] = React.useState<OrganizationWrite>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(organization
      ? {
        name: organization.name,
        slug: organization.slug ?? undefined,
        logoUrl: organization.logoUrl ?? undefined,
        description: organization.description ?? undefined,
        website: organization.website ?? undefined,
        contactEmail: organization.contactEmail ?? undefined,
        acceptsLeads: organization.acceptsLeads,
      }
      : { acceptsLeads: false });
  }, [open, organization]);

  const set = (key: keyof OrganizationWrite) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const save = async () => {
    if (!token) return;
    if (!form.name?.trim()) { setError('An organization needs a name.'); return; }

    setSaving(true);
    setError(null);
    try {
      if (organization) {
        await apiServices.updateOrganization(token, organization.id, form);
      } else {
        await apiServices.createOrganization(token, form);
      }
      onSaved();
    } catch {
      setError('That could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '18px' } }}>
      <DialogTitle>{organization ? 'Organization settings' : 'New organization'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <TextField
          label="Name"
          value={form.name ?? ''}
          onChange={set('name')}
          fullWidth
          autoFocus
          sx={fieldSx}
        />
        <TextField
          label="Public address"
          value={form.slug ?? ''}
          onChange={set('slug')}
          fullWidth
          helperText="Where people find you: tripician.com/o/your-name"
          sx={fieldSx}
        />
        <TextField
          label="About"
          value={form.description ?? ''}
          onChange={set('description')}
          fullWidth
          multiline
          minRows={3}
          sx={fieldSx}
        />
        <TextField label="Logo URL" value={form.logoUrl ?? ''} onChange={set('logoUrl')} fullWidth sx={fieldSx} />
        <TextField label="Website" value={form.website ?? ''} onChange={set('website')} fullWidth sx={fieldSx} />
        <TextField
          label="Contact email"
          value={form.contactEmail ?? ''}
          onChange={set('contactEmail')}
          fullWidth
          sx={fieldSx}
        />
        {!organization && (
          <TextField
            label="Registration number"
            value={form.registrationNumber ?? ''}
            onChange={set('registrationNumber')}
            fullWidth
            helperText="Optional. It speeds up review and is needed before you can be verified."
            sx={fieldSx}
          />
        )}

        <FormControlLabel
          control={(
            <Switch
              checked={form.acceptsLeads ?? false}
              onChange={(event) => setForm((previous) => ({ ...previous, acceptsLeads: event.target.checked }))}
            />
          )}
          label="Take enquiries from travellers"
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: -1.5 }}>
          Travellers who consent send you their name and email, and book on your own site.
          Tripician never takes the payment.
        </Typography>

        {error && <Typography variant="body2" color="error">{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ borderRadius: '12px' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void save()}
          disabled={saving}
          sx={{ borderRadius: '12px' }}
        >
          {saving ? 'Saving' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── members ─────────────────────────────────────────────────────────────────

const MembersDialog: React.FC<{
  organization: Organization | null;
  onClose: () => void;
}> = ({ organization, onClose }) => {
  const { token } = useAuthToken();
  const [members, setMembers] = React.useState<OrganizationMember[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Array<{ id: number; fname: string; lname: string; email: string }>>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!token || !organization) return;
    setLoading(true);
    try {
      const resp = await apiServices.getOrganizationMembers(token, organization.id);
      setMembers(Array.isArray(resp.data) ? resp.data : []);
    } finally {
      setLoading(false);
    }
  }, [token, organization]);

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
    if (!token || !organization) return;
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
    if (!token || !organization) return;
    setError(null);
    try {
      await apiServices.setOrganizationMemberRole(token, organization.id, userId, role);
      await load();
    } catch {
      setError('An organization always needs at least one admin.');
    }
  };

  const remove = async (userId: number) => {
    if (!token || !organization) return;
    setError(null);
    try {
      await apiServices.removeOrganizationMember(token, organization.id, userId);
      await load();
    } catch {
      setError('An organization always needs at least one admin.');
    }
  };

  return (
    <Dialog
      open={organization !== null}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '18px' } }}
    >
      <DialogTitle>{organization?.name}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Admins can create and run trips for this organization. Being listed here
          does not put anyone on a trip.
        </Typography>

        <TextField
          label="Add somebody"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          fullWidth
          placeholder="Search by name, or paste an exact email"
          sx={fieldSx}
        />

        {results.length > 0 && (
          <Box sx={{ display: 'grid', gap: 0.5, mt: 1 }}>
            {results.map((user) => (
              <Box
                key={user.id}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}
              >
                <Avatar sx={{ width: 30, height: 30 }}>
                  {(user.fname || user.email).charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap>
                    {`${user.fname} ${user.lname}`.trim() || user.email}
                  </Typography>
                </Box>
                <Button size="small" onClick={() => void add(user.id)} sx={{ borderRadius: '10px' }}>
                  Add
                </Button>
              </Box>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {members.map((member) => (
              <Box key={member.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar src={member.avatarUrl ?? undefined} sx={{ width: 34, height: 34 }}>
                  {(member.name ?? '?').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap>{member.name ?? `User ${member.userId}`}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    Joined {dayjs(member.joinedAt).format('D MMM YYYY')}
                  </Typography>
                </Box>
                <Select
                  size="small"
                  value={member.role}
                  onChange={(event) => void setRole(member.userId, event.target.value as OrganizationRole)}
                  sx={{ borderRadius: '10px', minWidth: 110 }}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="member">Member</MenuItem>
                </Select>
                <IconButton aria-label="Remove" onClick={() => void remove(member.userId)}>
                  <IconTrash size={17} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {error && <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ borderRadius: '12px' }}>Done</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrganizationsPage;
