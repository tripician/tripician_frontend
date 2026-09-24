import React from 'react';
import { Box, Button, Card, CardContent, Typography, useTheme } from '@mui/material';
import { IconBolt } from '@tabler/icons-react';
import { apiServices, type CreditPack } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { loadRazorpay, openRazorpayCheckout } from '../../afterstory/book/razorpay';
import { formatMoney } from '../../pricing/types';
import { serverMessage } from '../../utils/apiError';

// Credit packs, bought once. Rendered only while payments are live, so nothing is offered that cannot be bought.
const BuyCreditsCard: React.FC<{ onPurchased: () => void; sx?: object }> = ({ onPurchased, sx }) => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [packs, setPacks] = React.useState<CreditPack[]>([]);
  const [currency, setCurrency] = React.useState('INR');
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    apiServices.getCreditPacks()
      .then((r) => {
        if (!active) return;
        setPacks(Array.isArray(r.data?.packs) ? r.data.packs : []);
        setCurrency(r.data?.currency ?? 'INR');
      })
      .catch(() => { if (active) setPacks([]); });
    return () => { active = false; };
  }, []);

  if (packs.length === 0) return null;

  const buy = async (pack: CreditPack) => {
    if (!token) return;
    setBusy(pack.packId);
    setError(null);
    setNotice(null);
    try {
      if (!(await loadRazorpay())) {
        setError('The payment window could not load. Check your connection and try again.');
        return;
      }
      const { data: intent } = await apiServices.createCreditOrder(token, pack.packId);
      if (!intent?.ok) {
        setError(intent?.error ?? 'That pack could not be opened for payment. Please try again.');
        return;
      }
      openRazorpayCheckout({
        intent,
        description: `${pack.credits.toLocaleString('en-IN')} TripicianAI credits`,
        onPaid: async (result) => {
          try {
            await apiServices.verifyCreditOrder(token, intent.orderId, {
              razorpayOrderId: result.razorpay_order_id,
              razorpayPaymentId: result.razorpay_payment_id,
              razorpaySignature: result.razorpay_signature,
            });
            setNotice(`${pack.credits.toLocaleString('en-IN')} credits added. Thank you.`);
            onPurchased();
          } catch {
            // The webhook settles the same order, so a failed confirmation here still ends in credits.
            setNotice('Payment received. Your credits will appear within a minute.');
          }
        },
        onDismissed: () => setNotice('No payment was taken.'),
        onFailed: (message) => setError(message),
      });
    } catch (err) {
      setError(serverMessage(err) ?? 'That pack could not be opened for payment. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card sx={sx}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <IconBolt size={17} /> Buy credits
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2.5, maxWidth: 560 }}>
          Credits you buy do not expire. When a trip&apos;s shared credits run out, yours cover what you ask TripicianAI for on that trip.
        </Typography>

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(200px, 1fr))' } }}>
          {packs.map((pack) => (
            <Box
              key={pack.packId}
              sx={{
                p: 2, borderRadius: '14px', border: `1px solid ${theme.custom.surface.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
              }}
            >
              <Box>
                <Typography variant="h4" component="p">{pack.credits.toLocaleString('en-IN')}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>credits for {formatMoney(pack.price, currency)}</Typography>
              </Box>
              <Button variant="contained" disabled={busy !== null} onClick={() => void buy(pack)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                {busy === pack.packId ? 'Opening' : 'Buy'}
              </Button>
            </Box>
          ))}
        </Box>

        {notice && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>{notice}</Typography>}
        {error && <Typography variant="body2" color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </CardContent>
    </Card>
  );
};

export default BuyCreditsCard;
