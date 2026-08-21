import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { IconCheck, IconFlag, IconUsers } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import JoinRequestButton from './JoinRequestButton';
import JoinRequestsPanel from './JoinRequestsPanel';
import ReportTripDialog from './ReportTripDialog';
import EnquireDialog from '../operator/EnquireDialog';
import { describeSpots, type TripSeats } from './types';

interface TripSeatsBandProps {
  tripId: string;
  isOwner: boolean;
}

function formatPrice(amount: number, currency?: string | null): string {
  if (!currency) return String(Math.round(amount));
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

const TripSeatsBand: React.FC<TripSeatsBandProps> = ({ tripId, isOwner }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [seats, setSeats] = React.useState<TripSeats | null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [enquireOpen, setEnquireOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const resp = await apiServices.getTripSeats(token, tripId);
      setSeats(resp.data);
    } catch {
      setSeats(null);
    }
  }, [token, tripId]);

  React.useEffect(() => { void load(); }, [load]);

  if (!seats) return null;

  const isOpen = seats.joinPolicy === 'OpenToRequests';
  if (!isOpen && !(isOwner && seats.pendingRequests > 0)) return null;

  const spots = describeSpots(seats);

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, pt: 3 }}>
      <Box
        sx={{
          borderRadius: '16px',
          border: `1px solid ${theme.custom.surface.border}`,
          bgcolor: 'background.paper',
          p: { xs: 2, sm: 2.5 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
            <IconUsers size={18} stroke={1.8} />
            <Typography variant="subtitle1">
              {isOwner
                ? 'Your listing'
                : seats.operatorName
                  ? `Run by ${seats.operatorName}`
                  : 'This trip is looking for people'}
            </Typography>
          </Box>

          {seats.confirmed && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: 'success.main' }}>
              <IconCheck size={14} stroke={3} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Confirmed</Typography>
            </Box>
          )}

          <Box sx={{ flex: 1 }} />

          {seats.pricePerPerson != null && (
            <Typography variant="h6" sx={{ color: 'text.primary' }}>
              {formatPrice(seats.pricePerPerson, seats.priceCurrency)}
              <Box component="span" sx={{ typography: 'body2', color: 'text.secondary', ml: 0.5 }}>
                per person
              </Box>
            </Typography>
          )}

          {spots && (
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: seats.spotsLeft === 0 ? 'text.disabled' : 'primary.main' }}
            >
              {spots}
            </Typography>
          )}

          {!isOwner && (seats.operatorName ? (
            <Button variant="contained" onClick={() => setEnquireOpen(true)}>Enquire</Button>
          ) : (
            <JoinRequestButton tripId={tripId} seats={seats} isOwner={isOwner} onChanged={() => void load()} />
          ))}
        </Box>

        {!isOwner && isOpen && (
          <Box sx={{ mt: 1.5 }}>
            <Box
              component="button"
              type="button"
              onClick={() => setReportOpen(true)}
              sx={{
                border: 'none', bgcolor: 'transparent', p: 0, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                fontFamily: 'inherit', typography: 'caption',
                color: 'text.disabled',
                '&:hover': { color: 'error.main' },
              }}
            >
              <IconFlag size={13} stroke={1.8} />
              Report this trip
            </Box>
          </Box>
        )}

        {seats.listingBlurb && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5, whiteSpace: 'pre-line' }}>
            {seats.listingBlurb}
          </Typography>
        )}

        {isOwner && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1 }}>
              {seats.pendingRequests > 0
                ? `${seats.pendingRequests} waiting on you`
                : 'Requests'}
            </Typography>
            <JoinRequestsPanel tripId={tripId} seats={seats} onChanged={() => void load()} />
          </Box>
        )}
      </Box>
      <ReportTripDialog open={reportOpen} onClose={() => setReportOpen(false)} tripId={tripId} />
      {seats.operatorName && (
        <EnquireDialog open={enquireOpen} onClose={() => setEnquireOpen(false)} tripId={tripId} companyName={seats.operatorName} />
      )}
    </Box>
  );
};

export default TripSeatsBand;
