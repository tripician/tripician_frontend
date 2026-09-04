/**
 * /operator , one route with two faces.
 *
 * An approved business sees its leads. Everyone else sees the application form,
 * in whatever state theirs is in. Splitting these into two routes would mean a
 * pending applicant landing on a dashboard that has nothing to show them.
 */

import React from 'react';
import {
  Avatar, Box, Button, Chip, CircularProgress, MenuItem, Select,
  TextField, Typography, useTheme,
} from '@mui/material';
import dayjs from 'dayjs';
import { IconBuilding, IconInbox, IconMail } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import type { LeadStatus, OperatorLead, OperatorProfile } from './types';

const CONTENT_MAX = 1280;
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } as const;

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
};

const OperatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuthToken();

  const [profile, setProfile] = React.useState<OperatorProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [leads, setLeads] = React.useState<OperatorLead[]>([]);

  const load = React.useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const resp = await apiServices.getMyOperatorProfile(token);
      setProfile(resp.data ?? null);
      if (resp.data?.status === 'approved') {
        const l = await apiServices.getOperatorLeads(token);
        setLeads(Array.isArray(l.data) ? l.data : []);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => { void load(); }, [load]);

  if (!token) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <EmptyState
          icon={IconBuilding}
          title="Sign in to manage your listings"
          description="Travel businesses list departures and receive enquiries here."
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
        title="For travel businesses"
        description="List departures on Tripician and receive enquiries from travellers."
        path="/operator"
        noindex
      />
      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 10 }}>
        {profile?.status === 'approved'
          ? <Leads profile={profile} leads={leads} onChanged={load} />
          : <Apply profile={profile} onSubmitted={load} />}
      </Box>
    </Box>
  );
};

// ── leads ───────────────────────────────────────────────────────────────────

const Leads: React.FC<{ profile: OperatorProfile; leads: OperatorLead[]; onChanged: () => void }> = ({
  profile, leads, onChanged,
}) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const setStatus = async (leadId: string, status: LeadStatus) => {
    if (!token) return;
    setBusyId(leadId);
    try {
      await apiServices.setLeadStatus(token, leadId, status);
      onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const newCount = leads.filter((l) => l.status === 'new').length;

  return (
    <>
      <PageHeader
        title={profile.companyName}
        subtitle={newCount > 0 ? `${newCount} new enquiries` : 'Enquiries from travellers'}
      />

      {leads.length === 0 ? (
        <EmptyState
          icon={IconInbox}
          title="No enquiries yet"
          description="When a traveller asks about one of your departures, their details appear here."
        />
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5, mt: 3 }}>
          {leads.map((l) => (
            <Box
              key={l.id}
              sx={{
                display: 'flex', gap: 2, alignItems: 'flex-start',
                p: 2.25, borderRadius: '16px',
                border: `1px solid ${theme.custom.surface.border}`,
                bgcolor: 'background.paper',
              }}
            >
              <Avatar sx={{ width: 42, height: 42, bgcolor: 'primary.main' }}>
                {l.travellerName?.charAt(0)?.toUpperCase()}
              </Avatar>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>{l.travellerName}</Typography>
                  {l.status === 'new' && <Chip size="small" label="New" color="primary" />}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, color: 'text.secondary' }}>
                  <IconMail size={13} />
                  <Typography variant="body2">{l.travellerEmail}</Typography>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                  {[
                    l.tripName,
                    l.travelStartDate ? dayjs(l.travelStartDate).format('D MMM YYYY') : null,
                    `${l.partySize} ${l.partySize === 1 ? 'traveller' : 'travellers'}`,
                  ].filter(Boolean).join(' · ')}
                </Typography>

                {l.message && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, whiteSpace: 'pre-line' }}>
                    {l.message}
                  </Typography>
                )}

                <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 1 }}>
                  Received {dayjs(l.createdAt).format('D MMM YYYY')}
                </Typography>
              </Box>

              <Select
                size="small"
                value={l.status}
                disabled={busyId === l.id}
                onChange={(e) => void setStatus(l.id, e.target.value as LeadStatus)}
                sx={{ borderRadius: '12px', minWidth: 132, flexShrink: 0 }}
              >
                {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
                  <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
                ))}
              </Select>
            </Box>
          ))}
        </Box>
      )}
    </>
  );
};

// ── application ─────────────────────────────────────────────────────────────

const Apply: React.FC<{ profile: OperatorProfile | null; onSubmitted: () => void }> = ({
  profile, onSubmitted,
}) => {
  const theme = useTheme();
  const { token } = useAuthToken();

  const [companyName, setCompanyName] = React.useState(profile?.companyName ?? '');
  const [website, setWebsite] = React.useState(profile?.website ?? '');
  const [contactEmail, setContactEmail] = React.useState(profile?.contactEmail ?? '');
  const [registrationNumber, setRegistrationNumber] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pending = profile?.status === 'pending';
  const suspended = profile?.status === 'suspended';

  const submit = async () => {
    if (!token || !companyName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiServices.applyAsOperator(token, {
        companyName: companyName.trim(),
        website: website.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        registrationNumber: registrationNumber.trim() || undefined,
      });
      onSubmitted();
    } catch {
      setError('Could not submit that application.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="List your trips on Tripician"
        subtitle="For tour operators and trip organisers running departures travellers can join"
      />

      <Box sx={{ maxWidth: 560, mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {suspended && (
          <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid ${theme.palette.error.main}` }}>
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              This account is suspended. {profile?.reviewNote || 'Contact us to discuss it.'}
            </Typography>
          </Box>
        )}

        {pending && (
          <Box sx={{ p: 2, borderRadius: '12px', bgcolor: theme.custom.surface.brandTint }}>
            <Typography variant="body2" sx={{ color: 'text.primary' }}>
              Your application is with us. We review these by hand, so it takes a
              day or two. You can update the details below in the meantime.
            </Typography>
          </Box>
        )}

        {profile?.status === 'rejected' && profile.reviewNote && (
          <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid ${theme.custom.surface.border}` }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {profile.reviewNote}
            </Typography>
          </Box>
        )}

        <TextField
          size="small" label="Company name" required
          value={companyName} onChange={(e) => setCompanyName(e.target.value)}
          disabled={suspended} sx={fieldSx}
        />
        <TextField
          size="small" label="Website"
          placeholder="https://"
          value={website} onChange={(e) => setWebsite(e.target.value)}
          helperText="Where travellers complete their booking"
          disabled={suspended} sx={fieldSx}
        />
        <TextField
          size="small" label="Contact email"
          value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
          disabled={suspended} sx={fieldSx}
        />
        <TextField
          size="small" label="Business registration number"
          value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)}
          helperText="Optional, but it speeds up review"
          disabled={suspended} sx={fieldSx}
        />

        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          Tripician passes you travellers who have agreed to be contacted. Bookings
          and payments happen on your own site, not here.
        </Typography>

        {error && <Typography variant="body2" sx={{ color: 'error.main' }}>{error}</Typography>}

        {!suspended && (
          <Box>
            <Button variant="contained" onClick={() => void submit()} disabled={busy || !companyName.trim()}>
              {busy ? 'Sending…' : pending ? 'Update application' : 'Apply'}
            </Button>
          </Box>
        )}
      </Box>
    </>
  );
};

export default OperatorPage;
