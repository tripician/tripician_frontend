/**
 * Ordering a printed book, in three steps.
 *
 * The order matters and is enforced on the server too: nobody pays for pages
 * they have not seen, so the preview is approved before an order can be
 * charged. The price shown here is the price the server computed and stored;
 * nothing on this screen sends an amount anywhere.
 */

import React from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Step, StepLabel, Stepper, TextField, Typography, useTheme,
} from '@mui/material';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { formatMoney, type StoryBookQuote } from '../../pricing/types';
import BookPreviewDialog from './BookPreviewDialog';
import { loadRazorpay, openRazorpayCheckout } from './razorpay';
import type { DeliveryAddress } from './types';

const STEPS = ['Your pages', 'Where it goes', 'Pay'];

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '12px' } } as const;

/** "blue_dart" is what the printer calls it. Nobody else does. */
const carrierName = (uid: string): string =>
  uid.split(/[_-]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const EMPTY: DeliveryAddress = {
  email: '', firstName: '', lastName: '', addressLine1: '', addressLine2: '',
  zipCode: '', city: '', state: '', countryAlpha2: 'IN', countryAlpha3: 'IND', phone: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  story: { id: string; title: string };
  onPaid?: () => void;
}

const BookCheckoutDialog: React.FC<Props> = ({ open, onClose, story, onPaid }) => {
  const theme = useTheme();
  const { token } = useAuthToken();

  const [step, setStep] = React.useState(0);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [address, setAddress] = React.useState<DeliveryAddress>(EMPTY);
  const [quantity] = React.useState(1);
  const [promoCode, setPromoCode] = React.useState('');
  const [quote, setQuote] = React.useState<StoryBookQuote | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) { setStep(0); setError(null); setNotice(null); setQuote(null); }
  }, [open]);

  // Fetching the quote renders the book to measure it, so it is asked for once
  // the reader reaches the price step rather than on every keystroke above.
  //
  // The address goes with it. Delivery is quoted from the printer for that
  // destination, and it is a real cost rather than a rounding error, so there is
  // no price to show before we know where the book is going. Step 2 collects the
  // address and step 3 prices it, so it is always there by the time this runs.
  const refreshQuote = React.useCallback(async (code?: string) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await apiServices.getStoryBookQuote(
        token, story.id, address.countryAlpha2, address.zipCode, quantity, code,
      );
      setQuote(resp.data);
    } catch {
      setError('We could not price that book. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [token, story.id, quantity, address.countryAlpha2, address.zipCode]);

  React.useEffect(() => { if (open && step === 2) void refreshQuote(); }, [open, step, refreshQuote]);

  const set = (key: keyof DeliveryAddress) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setAddress((previous) => ({ ...previous, [key]: event.target.value }));

  const addressComplete = Boolean(
    address.email && address.firstName && address.lastName
    && address.addressLine1 && address.zipCode && address.city && address.countryAlpha2,
  );

  const pay = async () => {
    if (!token || !quote) return;
    setBusy(true);
    setError(null);

    try {
      const scriptReady = await loadRazorpay();
      if (!scriptReady) {
        setError('The payment window could not load. Check your connection and try again.');
        return;
      }

      // One call creates the order, one approves the preview it already
      // rendered, and only then can it be charged.
      const created = await apiServices.createBookOrder(token, {
        ...address, storyId: story.id, quantity, promoCode: promoCode.trim() || undefined,
      });
      const orderId = created.data.orderId;

      await apiServices.approveBookPreview(token, orderId);

      // A complete waiver leaves nothing to charge, and the server has already
      // marked it paid on approval. Sending it to a gateway would come back as
      // "already paid" and read to the customer as a failure, on the one path
      // the waiver exists for.
      if (created.data.total <= 0) {
        setNotice('Paid in full by your code. Your book is on its way to the printer.');
        onPaid?.();
        return;
      }

      const intent = await apiServices.createBookPayment(token, orderId);
      if (!intent.data?.ok) {
        setError(intent.data?.error ?? 'That order could not be opened for payment.');
        return;
      }

      openRazorpayCheckout({
        intent: intent.data,
        storyTitle: story.title,
        onPaid: async (result) => {
          try {
            await apiServices.verifyBookPayment(token, orderId, result);
            setNotice('Paid. Your book is on its way to the printer.');
            onPaid?.();
          } catch {
            // The money may well have been taken; the webhook settles it
            // independently, so this is reassurance rather than a failure.
            setNotice('We are confirming your payment. Your order will update shortly.');
          }
        },
        onDismissed: () => setNotice('Payment cancelled. Your order is saved if you want to come back to it.'),
        onFailed: (message) => setError(message),
      });
    } catch {
      setError('We could not start that payment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '18px' } }}>
        <DialogTitle>Order this book</DialogTitle>

        <DialogContent>
          <Stepper activeStep={step} sx={{ mb: 3 }}>
            {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {step === 0 && (
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Have a look through every page before you order. What you see is what gets printed.
              </Typography>
              <Button variant="outlined" onClick={() => setPreviewOpen(true)} sx={{ borderRadius: '12px' }}>
                Flip through the pages
              </Button>
            </Box>
          )}

          {step === 1 && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField label="First name" value={address.firstName} onChange={set('firstName')} sx={fieldSx} />
              <TextField label="Last name" value={address.lastName} onChange={set('lastName')} sx={fieldSx} />
              <TextField label="Email" value={address.email} onChange={set('email')} sx={{ ...fieldSx, gridColumn: { sm: '1 / -1' } }} />
              <TextField label="Address" value={address.addressLine1} onChange={set('addressLine1')} sx={{ ...fieldSx, gridColumn: { sm: '1 / -1' } }} />
              <TextField label="Apartment, floor (optional)" value={address.addressLine2} onChange={set('addressLine2')} sx={{ ...fieldSx, gridColumn: { sm: '1 / -1' } }} />
              <TextField label="City" value={address.city} onChange={set('city')} sx={fieldSx} />
              <TextField label="State" value={address.state} onChange={set('state')} sx={fieldSx} />
              <TextField label="Postcode" value={address.zipCode} onChange={set('zipCode')} sx={fieldSx} />
              <TextField label="Phone (optional)" value={address.phone} onChange={set('phone')} sx={fieldSx} />
            </Box>
          )}

          {step === 2 && (
            <Box>
              {busy && !quote && (
                <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={26} /></Box>
              )}

              {quote && (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {/* The page band, said plainly. A reader who counts 47 pages in
                      a book they were charged 50 for deserves to have been told. */}
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Your story is {quote.naturalPageCount} pages and prints as a {quote.billedPageCount} page book
                    {quote.blankPagesAdded > 0 ? `, with ${quote.blankPagesAdded} blank at the end` : ''}.
                  </Typography>

                  {quote.nextBandDownPages !== null && quote.nextBandDownPrice !== null && quote.blankPagesAdded > 0 && (
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      A {quote.nextBandDownPages} page book would be {formatMoney(quote.nextBandDownPrice, quote.currency)}.
                    </Typography>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  <Line label={`Book (${quote.billedPageCount} pages)`} value={formatMoney(quote.retailUnitPrice * quote.quantity, quote.currency)} />
                  {quote.memberSavingPerCopy > 0 && (
                    <Line label="Member price" value={`- ${formatMoney(quote.memberSavingPerCopy * quote.quantity, quote.currency)}`} muted />
                  )}
                  {quote.discount > 0 && <Line label="Bulk discount" value={`- ${formatMoney(quote.discount, quote.currency)}`} muted />}
                  {quote.promoDiscount > 0 && (
                    <Line
                      label={quote.promoCode ? `Code ${quote.promoCode}` : `${quote.salePercent}% off`}
                      value={`- ${formatMoney(quote.promoDiscount, quote.currency)}`}
                      muted
                    />
                  )}
                  <Line
                    label={quote.shippingMethod ? `Delivery (${carrierName(quote.shippingMethod)})` : 'Delivery'}
                    value={quote.shipping > 0 ? formatMoney(quote.shipping, quote.currency) : 'Included'}
                    muted
                  />
                  {quote.minDeliveryDays !== null && quote.maxDeliveryDays !== null && (
                    <Typography variant="caption" sx={{ color: 'text.disabled', mt: -0.5 }}>
                      Arrives in {quote.minDeliveryDays} to {quote.maxDeliveryDays} working days once it is printed.
                    </Typography>
                  )}
                  {quote.tax > 0 && <Line label="Tax" value={formatMoney(quote.tax, quote.currency)} muted />}

                  <Divider sx={{ my: 1.5 }} />
                  <Line label="Total" value={formatMoney(quote.total, quote.currency)} strong />

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <TextField
                      size="small"
                      label="Promo code"
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      sx={{ ...fieldSx, flex: 1 }}
                    />
                    <Button onClick={() => void refreshQuote(promoCode.trim())} sx={{ borderRadius: '12px' }}>
                      Apply
                    </Button>
                  </Box>

                  {quote.promoRefusal && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{quote.promoRefusal}</Typography>
                  )}

                  {!quote.available && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {quote.unavailable ?? 'This book cannot be ordered yet.'}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}

          {error && <Typography variant="body2" color="error" sx={{ mt: 2 }}>{error}</Typography>}
          {notice && <Typography variant="body2" sx={{ mt: 2, color: theme.palette.success.main }}>{notice}</Typography>}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} sx={{ borderRadius: '12px' }}>Close</Button>
          {step > 0 && <Button onClick={() => setStep(step - 1)} sx={{ borderRadius: '12px' }}>Back</Button>}
          {step < 2 && (
            <Button
              variant="contained"
              disabled={step === 1 && !addressComplete}
              onClick={() => setStep(step + 1)}
              sx={{ borderRadius: '12px' }}
            >
              Continue
            </Button>
          )}
          {step === 2 && (
            <Button
              variant="contained"
              disabled={busy || !quote?.available}
              onClick={() => void pay()}
              sx={{ borderRadius: '12px' }}
            >
              {busy ? 'Working' : quote ? `Pay ${formatMoney(quote.total, quote.currency)}` : 'Pay'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <BookPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        story={story}
        token={token ?? ''}
      />
    </>
  );
};

const Line: React.FC<{ label: string; value: string; muted?: boolean; strong?: boolean }> = ({
  label, value, muted, strong,
}) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography variant="body2" sx={{ color: muted ? 'text.secondary' : 'text.primary', fontWeight: strong ? 700 : 400 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ color: muted ? 'text.secondary' : 'text.primary', fontWeight: strong ? 700 : 400 }}>
      {value}
    </Typography>
  </Box>
);

export default BookCheckoutDialog;
