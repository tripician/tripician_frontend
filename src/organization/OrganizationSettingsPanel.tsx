import React from 'react';
import {
  Box, Button, FormControlLabel, Radio, RadioGroup, Switch, TextField, Typography,
} from '@mui/material';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import OrganizationImageField from './OrganizationImageField';
import type { GroupPlanCreation, GroupVisibility, Organization, OrganizationWrite } from './types';

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } as const;

interface OrganizationSettingsPanelProps {
  organization: Organization;
  onSaved: () => void;
}

const OrganizationSettingsPanel: React.FC<OrganizationSettingsPanelProps> = ({ organization, onSaved }) => {
  const { token } = useAuthToken();
  const [form, setForm] = React.useState<OrganizationWrite>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  /* Keyed on the id, not the whole organisation: a picture saves itself and refreshes
     the page around it, and resyncing here would throw away whatever else is half typed. */
  React.useEffect(() => {
    setForm({
      name: organization.name,
      slug: organization.slug ?? undefined,
      logoUrl: organization.logoUrl ?? undefined,
      coverUrl: organization.coverUrl ?? undefined,
      description: organization.description ?? undefined,
      website: organization.website ?? undefined,
      contactEmail: organization.contactEmail ?? undefined,
      acceptsLeads: organization.acceptsLeads,
      visibility: organization.visibility,
      planCreation: organization.planCreation,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization.id]);

  const business = organization.kind === 'business';

  /**
   * A picture saves itself the moment it lands.
   *
   * It used to sit in this form until "Save changes" at the bottom of a long
   * panel, so an upload that worked looked like an upload that had failed: you
   * saw it, left the tab, and it was gone. The update endpoint takes one field
   * at a time, so nothing else on this form is touched.
   */
  const saveImage = async (key: 'logoUrl' | 'coverUrl', url: string | null) => {
    setForm((prev) => ({ ...prev, [key]: url ?? '' }));
    setSaved(false);
    if (!token) return;
    try {
      await apiServices.updateOrganization(token, organization.id, { [key]: url ?? '' });
      setError(null);
      onSaved();
    } catch {
      setError(url ? 'The picture uploaded but could not be saved. Try again.' : 'That picture could not be removed. Try again.');
    }
  };

  const set = (key: keyof OrganizationWrite) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = async () => {
    if (!token) return;
    if (!form.name?.trim()) { setError('A group needs a name.'); return; }
    setSaving(true);
    setError(null);
    try {
      // Empty string rather than undefined, so clearing a picture actually clears it.
      await apiServices.updateOrganization(token, organization.id, {
        ...form,
        logoUrl: form.logoUrl ?? '',
        coverUrl: form.coverUrl ?? '',
      });
      setSaved(true);
      onSaved();
    } catch {
      setError('That could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5, maxWidth: 640 }}>
      <OrganizationImageField
        organizationId={organization.id}
        slot="logo"
        label="Logo"
        hint="Square works best. Shown beside your name everywhere."
        value={form.logoUrl}
        onChange={(url) => void saveImage('logoUrl', url)}
      />

      {/* Free for every group: a group needs a face before it needs anything else. */}
      <OrganizationImageField
        organizationId={organization.id}
        slot="cover"
        label="Cover image"
        hint="The wide banner across the top of your group page."
        value={form.coverUrl}
        onChange={(url) => void saveImage('coverUrl', url)}
      />

      <TextField label="Name" value={form.name ?? ''} onChange={set('name')} fullWidth sx={fieldSx} />
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
      <TextField label="Website" value={form.website ?? ''} onChange={set('website')} fullWidth sx={fieldSx} />

      {business ? (
        <>
          <TextField label="Contact email" value={form.contactEmail ?? ''} onChange={set('contactEmail')} fullWidth sx={fieldSx} />
          <Box>
            <FormControlLabel
              control={(
                <Switch
                  checked={form.acceptsLeads ?? false}
                  onChange={(e) => setForm((prev) => ({ ...prev, acceptsLeads: e.target.checked }))}
                />
              )}
              label="Take enquiries from travellers"
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Travellers who consent send you their name and email, and book on your own site.
              Tripician never takes the payment.
            </Typography>
          </Box>
        </>
      ) : (
        <>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Who can join</Typography>
            <RadioGroup
              value={form.visibility ?? 'public'}
              onChange={(e) => { setSaved(false); setForm((prev) => ({ ...prev, visibility: e.target.value as GroupVisibility })); }}
            >
              <FormControlLabel value="public" control={<Radio />} label="Public: anyone can find the group and ask to join" />
              <FormControlLabel value="private" control={<Radio />} label="Private: hidden, and joined only with your invite link" />
            </RadioGroup>
          </Box>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Who can start a plan</Typography>
            <RadioGroup
              row
              value={form.planCreation ?? 'members'}
              onChange={(e) => { setSaved(false); setForm((prev) => ({ ...prev, planCreation: e.target.value as GroupPlanCreation })); }}
            >
              <FormControlLabel value="members" control={<Radio />} label="Every member" />
              <FormControlLabel value="admins" control={<Radio />} label="Only admins" />
            </RadioGroup>
          </Box>
        </>
      )}

      {error && <Typography variant="body2" color="error">{error}</Typography>}
      {saved && !error && <Typography variant="body2" sx={{ color: 'success.main' }}>Saved.</Typography>}

      <Button
        variant="contained"
        onClick={() => void save()}
        disabled={saving}
        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px', justifySelf: 'start', px: 3 }}
      >
        {saving ? 'Saving' : 'Save changes'}
      </Button>
    </Box>
  );
};

export default OrganizationSettingsPanel;
