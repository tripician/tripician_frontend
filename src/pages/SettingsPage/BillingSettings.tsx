import React from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { IconDownload, IconReceipt2, IconUsers } from '@tabler/icons-react';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { apiServices } from '../../services/APIs/apiServices';
import CancelRenewalDialog from '../../billing/CancelRenewalDialog';
import {
  canShowReceipt,
  fileDay,
  formatDay,
  formatRupees,
  groupStatusLabel,
  periodText,
  planStatusSentence,
  statusLabel,
} from '../../billing/billingLabels';
import type { BillingItem, BillingSummary } from '../../billing/types';

const PAGE_SIZE = 20;

const cardSx = {
  mb: 3,
  borderRadius: '16px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  border: '1px solid',
  borderColor: 'divider',
} as const;

const sectionTitleSx = {
  fontWeight: 700,
  fontSize: '0.95rem',
  color: 'text.primary',
  letterSpacing: '-0.01em',
} as const;

const introSx = { fontSize: '0.8rem', color: 'text.secondary', mb: 2.5, maxWidth: 560 } as const;

/** One payment: what it was, when, the amount, its state, and a receipt when money was taken. */
const HistoryRow: React.FC<{ item: BillingItem; busy: boolean; onReceipt: () => void }> = ({ item, busy, onReceipt }) => {
  const period = periodText(item.periodStart, item.periodEnd);
  const failed = item.status === 'failed';

  return (
    <Box
      component="li"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
        gap: 1,
        py: 1.75,
        borderTop: '1px solid',
        borderColor: 'divider',
        listStyle: 'none',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}>{item.description}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {formatDay(item.occurredAt)}
          {item.groupName ? `, ${item.groupName}` : ''}
        </Typography>
        {period && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Covers {period}</Typography>}
        {failed && item.failureReason && (
          <Typography variant="body2" sx={{ color: 'error.main', mt: 0.5 }}>{item.failureReason}</Typography>
        )}
        {item.reference && (
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5, wordBreak: 'break-all' }}>
            Reference {item.reference}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'row', sm: 'column' },
          alignItems: { xs: 'center', sm: 'flex-end' },
          justifyContent: 'space-between',
          gap: 0.5,
        }}
      >
        <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{formatRupees(item.amount, item.currency)}</Typography>
        <Chip size="small" variant="outlined" label={statusLabel(item.status)} color={failed ? 'error' : 'default'} />
        {canShowReceipt(item) && (
          <Button
            size="small"
            startIcon={<IconDownload size={15} />}
            disabled={busy}
            onClick={onReceipt}
            aria-label={`Download receipt for ${formatDay(item.occurredAt)}, ${item.description}`}
          >
            Receipt
          </Button>
        )}
      </Box>
    </Box>
  );
};

/** The Billing tab: where the plan stands, the groups the person pays for, and every payment on record. */
const BillingSettings: React.FC = () => {
  const { token } = useAuthToken();
  const [summary, setSummary] = React.useState<BillingSummary | null>(null);
  const [items, setItems] = React.useState<BillingItem[]>([]);
  const [take, setTake] = React.useState(PAGE_SIZE);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [receiptBusy, setReceiptBusy] = React.useState<string | null>(null);
  const [receiptError, setReceiptError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setFailed(false);

    Promise.all([apiServices.getBillingSummary(token), apiServices.getBillingPayments(token, take)])
      .then(([summaryResponse, paymentsResponse]) => {
        if (!active) return;
        setSummary(summaryResponse.data);
        setItems(paymentsResponse.data);
      })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [token, take, reloadKey]);

  const downloadReceipt = async (item: BillingItem) => {
    if (!token) return;
    setReceiptBusy(item.id);
    setReceiptError(null);
    try {
      const { data } = await apiServices.getBillingReceipt(token, item.id);
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Tripician-receipt-${fileDay(item.occurredAt)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setReceiptError('The receipt could not be downloaded. Try again in a moment.');
    } finally {
      setReceiptBusy(null);
    }
  };

  const cancelRenewal = async () => {
    if (!token) throw new Error('Signed out');
    await apiServices.cancelSubscription(token);
    setCancelOpen(false);
    setReloadKey((key) => key + 1);
  };

  if (!token) {
    return <Typography sx={{ color: 'text.secondary' }}>Sign in to see your payments and billing.</Typography>;
  }

  if (failed) {
    return (
      <Card sx={cardSx}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={sectionTitleSx}>We could not load your billing</Typography>
          <Typography sx={{ ...introSx, mt: 1 }}>Nothing has changed. Try again in a moment.</Typography>
          <Button variant="outlined" color="inherit" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  if (loading || !summary) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '100%' }}>
      <Card sx={cardSx}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <IconReceipt2 size={17} />
            <Typography sx={sectionTitleSx}>Your plan</Typography>
          </Box>
          <Typography sx={introSx}>Where your plan stands, and what happens next.</Typography>
          <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: 'text.primary' }}>{summary.planName}</Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 0.75, maxWidth: 560 }}>
            {planStatusSentence(summary)}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mt: 2.5 }}>
            {summary.canCancel && (
              <Button variant="outlined" color="inherit" onClick={() => setCancelOpen(true)}>Cancel renewal</Button>
            )}
            <Link component={RouterLink} to="/pricing" sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none' }}>
              See all plans
            </Link>
          </Box>
        </CardContent>
      </Card>

      {summary.groups.length > 0 && (
        <Card sx={cardSx}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <IconUsers size={17} />
              <Typography sx={sectionTitleSx}>Groups you pay for</Typography>
            </Box>
            <Typography sx={introSx}>Only the admins of a group see its billing. Its members do not.</Typography>
            {summary.groups.map((group) => (
              <Box
                key={group.organizationId}
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  py: 1.5,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{group.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {group.planName}
                    {group.status === 'active' && group.renewsAt ? `, renews on ${formatDay(group.renewsAt)}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip size="small" variant="outlined" label={groupStatusLabel(group.status)} />
                  <Link component={RouterLink} to={`/groups/${group.organizationId}`} sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none' }}>
                    Manage
                  </Link>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Card sx={cardSx}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <IconReceipt2 size={17} />
            <Typography sx={sectionTitleSx}>Payment history</Typography>
          </Box>
          <Typography sx={introSx}>Every payment on record, newest first. Amounts are in Indian rupees.</Typography>

          {receiptError && (
            <Typography variant="body2" color="error" role="alert" sx={{ mb: 1.5 }}>{receiptError}</Typography>
          )}

          {items.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', py: 1.5 }}>No payments on record yet.</Typography>
          ) : (
            <Box component="ul" sx={{ m: 0, p: 0 }}>
              {items.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  busy={receiptBusy === item.id}
                  onReceipt={() => void downloadReceipt(item)}
                />
              ))}
            </Box>
          )}

          {items.length >= take && (
            <Button sx={{ mt: 2 }} onClick={() => setTake((size) => size + PAGE_SIZE)}>Show more</Button>
          )}
        </CardContent>
      </Card>

      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 640 }}>
        Your bank may show a converted amount. Cancellation and refunds are set out in{' '}
        <Link component={RouterLink} to="/terms-and-conditions#billing" sx={{ fontWeight: 600 }}>
          section 14 of the Terms
        </Link>
        .
      </Typography>

      {cancelOpen && (
        <CancelRenewalDialog
          open={cancelOpen}
          summary={summary}
          onClose={() => setCancelOpen(false)}
          onConfirm={cancelRenewal}
        />
      )}
    </Box>
  );
};

export default BillingSettings;
