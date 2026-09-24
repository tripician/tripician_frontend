// /groups: the groups you belong to, and where a new one starts. A business is a group with review, verification and enquiries.

import React from 'react';
import {
  Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, Switch, TextField, Typography, useTheme,
} from '@mui/material';
import { IconBuildingCommunity, IconLock, IconPlus, IconUsersGroup, IconWorld } from '@tabler/icons-react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { groupHomePath } from './groupLogic';
import type { GroupKind, GroupPlanCreation, GroupVisibility, Organization, OrganizationWrite } from './types';

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
  const [params, setParams] = useSearchParams();

  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [loading, setLoading] = React.useState(true);
  // ?new=1 opens a group, ?new=business the business application, so other pages can link straight in.
  const creating: GroupKind | null = params.get('new') === 'business' ? 'business' : params.get('new') ? 'community' : null;
  const setCreating = (kind: GroupKind | null) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    if (kind) next.set('new', kind === 'business' ? 'business' : '1');
    else next.delete('new');
    return next;
  }, { replace: true });

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
          icon={IconUsersGroup}
          title={creating ? 'Sign in to start a group' : 'Sign in to see your groups'}
          description="Plan trips together and keep every trip and story your group takes in one place."
          actionLabel="Sign in"
          // Keeps ?new= so the create dialog is waiting after sign in.
          onAction={() => navigate(`/signin?next=${encodeURIComponent(`/groups${params.toString() ? `?${params.toString()}` : ''}`)}`)}
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
      <Seo title="Your groups" description="Plan trips together and keep every trip and story in one place." path="/groups" noindex />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 10 }}>
        <PageHeader
          title="Groups"
          subtitle="Plan trips together, and keep every trip and story your group takes in one place."
          action={(
            <Button variant="contained" startIcon={<IconPlus size={17} />} onClick={() => setCreating('community')} sx={{ borderRadius: '12px' }}>
              Start a group
            </Button>
          )}
        />

        {organizations.length === 0 ? (
          <EmptyState
            icon={IconUsersGroup}
            title="No groups yet"
            description="Start one for your friends, your trekking club or your travel community. Plans made inside it are shared with everyone in it."
            actionLabel="Start a group"
            onAction={() => setCreating('community')}
            secondaryLabel="Find a group"
            onSecondary={() => navigate('/stories?kind=groups')}
          />
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5, mt: 3 }}>
            {organizations.map((organization) => {
              const business = organization.kind === 'business';
              return (
                <Box
                  key={organization.id}
                  sx={{
                    display: 'flex', gap: 2, alignItems: 'flex-start',
                    p: 2.25, borderRadius: '16px',
                    border: `1px solid ${theme.custom.surface.border}`,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Avatar src={organization.logoUrl ?? undefined} variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'primary.main', borderRadius: '12px' }}>
                    {organization.name.charAt(0).toUpperCase()}
                  </Avatar>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>{organization.name}</Typography>
                      {organization.verified && <Chip size="small" color="primary" label="Verified" />}
                      {business && <Chip size="small" variant="outlined" label="Business" />}
                      {organization.visibility === 'private' && (
                        <Chip size="small" variant="outlined" icon={<IconLock size={13} />} label="Private" />
                      )}
                      {organization.status !== 'approved' && (
                        <Chip size="small" variant="outlined" label={STATUS_COPY[organization.status] ?? organization.status} />
                      )}
                    </Box>

                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                      {[
                        organization.myRole === 'admin' ? 'Admin' : organization.myRole === 'manager' ? 'Manager' : 'Member',
                        `${organization.memberCount} ${organization.memberCount === 1 ? 'member' : 'members'}`,
                      ].join(' · ')}
                    </Typography>
                    {organization.description && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>{organization.description}</Typography>
                    )}
                    {organization.status === 'pending' && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                        We review every business by hand. You can set it up in the meantime.
                      </Typography>
                    )}
                    {organization.reviewNote && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>{organization.reviewNote}</Typography>
                    )}
                  </Box>

                  <Button
                    variant="contained"
                    onClick={() => navigate(groupHomePath(organization.id))}
                    sx={{ borderRadius: '12px', flexShrink: 0, textTransform: 'none', fontWeight: 700 }}
                  >
                    Open
                  </Button>
                </Box>
              );
            })}
          </Box>
        )}

        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 4 }}>
          Running a travel business?{' '}
          <Box component={RouterLink} to="/for-operators" sx={{ color: 'primary.main', fontWeight: 600 }}>
            Apply for a business account
          </Box>
          {' '}to be verified and take enquiries.
        </Typography>
      </Box>

      <GroupDialog
        open={creating !== null}
        kind={creating ?? 'community'}
        onClose={() => setCreating(null)}
        onSaved={(created) => {
          setCreating(null);
          if (created?.id) navigate(groupHomePath(created.id));
          else void load();
        }}
      />
    </Box>
  );
};

const VisibilityOption: React.FC<{ value: GroupVisibility; title: string; body: string; Icon: React.ElementType }> = ({ value, title, body, Icon }) => (
  <FormControlLabel
    value={value}
    control={<Radio />}
    sx={{ alignItems: 'flex-start', m: 0, '& .MuiRadio-root': { mt: -0.5 } }}
    label={(
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <Icon size={16} /> {title}
        </Typography>
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>{body}</Typography>
      </Box>
    )}
  />
);

// Create only. A community group asks for the few things it needs; a business keeps its application fields.
const GroupDialog: React.FC<{
  open: boolean;
  kind: GroupKind;
  onClose: () => void;
  onSaved: (created: Organization | null) => void;
}> = ({ open, kind, onClose, onSaved }) => {
  const { token } = useAuthToken();
  const [form, setForm] = React.useState<OrganizationWrite>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const business = kind === 'business';

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(business
      ? { kind: 'business', acceptsLeads: false }
      : { kind: 'community', visibility: 'public', planCreation: 'members' });
  }, [open, business]);

  const set = (key: keyof OrganizationWrite) =>
    (event: React.ChangeEvent<HTMLInputElement>) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const save = async () => {
    if (!token) return;
    if (!form.name?.trim()) { setError(business ? 'A business needs a name.' : 'A group needs a name.'); return; }

    setSaving(true);
    setError(null);
    try {
      const resp = await apiServices.createOrganization(token, form);
      onSaved(resp?.data ?? null);
    } catch {
      setError('That could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '18px' } }}>
      <DialogTitle>{business ? 'Apply for a business account' : 'Start a group'}</DialogTitle>
      {/* MUI zeroes the top padding after a title, which clipped the Name field's floating label. */}
      <DialogContent sx={{ display: 'grid', gap: 2, '&&': { pt: 1.5 } }}>
        <TextField label="Name" value={form.name ?? ''} onChange={set('name')} fullWidth autoFocus sx={fieldSx} />
        <TextField label="About" value={form.description ?? ''} onChange={set('description')} fullWidth multiline minRows={3} sx={fieldSx}
          helperText={business ? undefined : 'Who the group is for and the kind of trips you take.'} />

        {business ? (
          <>
            <TextField label="Public address" value={form.slug ?? ''} onChange={set('slug')} fullWidth sx={fieldSx}
              helperText="Where people find you: tripician.com/o/your-name" />
            <TextField label="Website" value={form.website ?? ''} onChange={set('website')} fullWidth sx={fieldSx} />
            <TextField label="Contact email" value={form.contactEmail ?? ''} onChange={set('contactEmail')} fullWidth sx={fieldSx} />
            <TextField label="Registration number" value={form.registrationNumber ?? ''} onChange={set('registrationNumber')} fullWidth sx={fieldSx}
              helperText="Optional. It speeds up review and is needed before you can be verified." />
            <FormControlLabel
              control={<Switch checked={form.acceptsLeads ?? false} onChange={(event) => setForm((previous) => ({ ...previous, acceptsLeads: event.target.checked }))} />}
              label="Take enquiries from travellers"
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: -1.5 }}>
              Travellers who consent send you their name and email, and book on your own site. Tripician never takes the payment.
            </Typography>
          </>
        ) : (
          <>
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Who can join</Typography>
              <RadioGroup
                value={form.visibility ?? 'public'}
                onChange={(event) => setForm((previous) => ({ ...previous, visibility: event.target.value as GroupVisibility }))}
                sx={{ gap: 1.25, mt: 0.5 }}
              >
                <VisibilityOption value="public" Icon={IconWorld} title="Public" body="Anyone can find the group and ask to join. You approve each request." />
                <VisibilityOption value="private" Icon={IconLock} title="Private" body="Hidden from everyone outside it. People join only with your invite link." />
              </RadioGroup>
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Who can start a plan</Typography>
              <RadioGroup
                row
                value={form.planCreation ?? 'members'}
                onChange={(event) => setForm((previous) => ({ ...previous, planCreation: event.target.value as GroupPlanCreation }))}
              >
                <FormControlLabel value="members" control={<Radio />} label="Every member" />
                <FormControlLabel value="admins" control={<Radio />} label="Only admins" />
              </RadioGroup>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Everyone in the group can see its plans. Chat stays with the people going on each trip.
              </Typography>
            </Box>
          </>
        )}

        {error && <Typography variant="body2" color="error">{error}</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ borderRadius: '12px' }}>Cancel</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving} startIcon={business ? <IconBuildingCommunity size={17} /> : undefined} sx={{ borderRadius: '12px' }}>
          {saving ? 'Saving' : business ? 'Apply' : 'Create group'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrganizationsPage;
