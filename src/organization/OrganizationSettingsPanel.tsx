import React from 'react';
import {
  Box, Button, FormControlLabel, Switch, TextField, Typography,
} from '@mui/material';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import OrganizationImageField from './OrganizationImageField';
import PlanGate from './PlanGate';
import { hasFeature, PLAN_FEATURES } from './types';
import type { Organization, OrganizationWrite } from './types';

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
    });
  }, [organization]);

  const set = (key: keyof OrganizationWrite) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = async () => {
    if (!token) return;
    if (!form.name?.trim()) { setError('An organization needs a name.'); return; }
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
        onChange={(url) => { setSaved(false); setForm((p) => ({ ...p, logoUrl: url ?? '' })); }}
      />

      {hasFeature(organization, PLAN_FEATURES.coverImage) ? (
        <OrganizationImageField
          organizationId={organization.id}
          slot="cover"
          label="Cover image"
          hint="The wide banner across the top of your public profile."
          value={form.coverUrl}
          onChange={(url) => { setSaved(false); setForm((p) => ({ ...p, coverUrl: url ?? '' })); }}
        />
      ) : (
        <PlanGate
          organization={organization}
          feature={PLAN_FEATURES.coverImage}
          title="Cover images need Tripician Business"
          body="A wide banner across the top of your public profile, so an organization page looks like somewhere a traveller would trust."
        >
          <span />
        </PlanGate>
      )}

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
