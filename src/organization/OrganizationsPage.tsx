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
  DialogContent, DialogTitle, FormControlLabel, Switch, TextField, Typography, useTheme,
} from '@mui/material';
import dayjs from 'dayjs';
import { IconBuildingCommunity, IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import type { Organization, OrganizationWrite } from './types';

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
  const [creating, setCreating] = React.useState(false);

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

  /*
   * Almost everybody holds exactly one, so the list is a step they never wanted.
   * Replace rather than push, or Back from the workspace lands here and bounces
   * straight back in.
   */
  React.useEffect(() => {
    if (!loading && organizations.length === 1) {
      navigate(`/organizations/${organizations[0].id}`, { replace: true });
    }
  }, [loading, organizations, navigate]);

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

                {/* Trips, people and settings all live inside the organisation now. */}
                <Button
                  variant="contained"
                  onClick={() => navigate(`/organizations/${organization.id}`)}
                  sx={{ borderRadius: '12px', flexShrink: 0, textTransform: 'none', fontWeight: 700 }}
                >
                  Open
                </Button>
              </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <OrganizationDialog
        open={creating}
        organization={null}
        onClose={() => setCreating(false)}
        onSaved={() => { setCreating(false); void load(); }}
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
        {/* Pictures are added on the Settings tab once it exists and has an id to sign against. */}
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


export default OrganizationsPage;
