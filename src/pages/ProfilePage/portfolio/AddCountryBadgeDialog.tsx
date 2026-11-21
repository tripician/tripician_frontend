import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { IconPhotoPlus, IconShieldCheck, IconX } from '@tabler/icons-react';
import CountryFlag from '../../../components/ui/CountryFlag';
import { COUNTRIES } from '../../../utils/countryData';
import { countryNameFromCode } from '../../../utils/countryFlags';
import { formatTakenAt, readPhotoDetails } from '../../../utils/photoDetails';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { shrinkForVerification } from '../../../utils/shrinkForTransport';
import { uploadSignedAsset, type StoredAsset } from '../../../utils/signedUpload';
import {
  BADGE_NOTE_MAX,
  BADGE_PHOTO_SLOTS,
  BADGE_UPLOAD_SIGN_URL,
  STATUS_TEXT,
  VERIFICATION_ONLY_TEXT,
  badgeErrorMessage,
  countryBadgeApi,
  freeSlots,
  placePhotos,
  type CountryBadgeRequest,
} from './countryBadges';

/** A picked photo: the small copy that is sent, its preview, and the capture date read from the original. */
interface PickedPhoto {
  file: File;
  preview: string;
  takenAt?: string;
}

const emptySlots = (): (PickedPhoto | null)[] => Array(BADGE_PHOTO_SLOTS).fill(null);

/**
 * Add a country visited before Tripician could see it: the web's copy of the
 * app's AddCountryBadgeScreen, sending the same request.
 *
 * Two photos of you somewhere recognisable in the country go to a person on the
 * team (the admin portal's Country badges page); once approved the flag joins
 * your stamps as "Photo verified". Both photos can be chosen at once. Each is
 * shrunk in the browser to the 1280 px version the server keeps, after its
 * capture date is read from the original, so nothing bigger is uploaded. The
 * photos are deleted once the request is decided or withdrawn.
 */
const AddCountryBadgeDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  /** After a request is sent, with the country's name. */
  onSent?: (countryName: string) => void;
}> = ({ open, onClose, onSent }) => {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('sm'));
  const input = useRef<HTMLInputElement>(null);
  const clicked = useRef(0);
  /** Copies already stored: a send that failed after uploading does not upload them again. */
  const uploaded = useRef(new Map<File, StoredAsset>());

  const [country, setCountry] = useState('');
  const [photos, setPhotos] = useState<(PickedPhoto | null)[]>(emptySlots);
  const [note, setNote] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<CountryBadgeRequest[]>([]);

  const countryName = countryNameFromCode(country);
  const free = freeSlots(photos);
  const ready = Boolean(countryName) && free === 0 && !sending && !preparing;

  const loadRequests = useCallback(() => {
    countryBadgeApi
      .mine()
      .then(({ data }) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (open) loadRequests();
  }, [open, loadRequests]);

  // Previews are object URLs; they are let go of when their photo goes.
  const release = (list: readonly (PickedPhoto | null)[]) => list.forEach((p) => p && URL.revokeObjectURL(p.preview));

  const reset = () => {
    setPhotos((current) => {
      release(current);
      return emptySlots();
    });
    setCountry('');
    setNote('');
    setError(null);
    uploaded.current.clear();
  };

  const close = () => {
    if (sending) return;
    reset();
    onClose();
  };

  const choose = (slot: number) => {
    clicked.current = slot;
    input.current?.click();
  };

  const onFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    event.target.value = ''; // the same file can be chosen again after removing it
    if (!files.length) return;
    setPreparing(true);
    setError(null);
    try {
      const picked: PickedPhoto[] = [];
      for (const original of files.slice(0, Math.max(1, free))) {
        // The date first: the small copy carries no metadata.
        const takenAt = (await readPhotoDetails(original))?.takenAt;
        const file = await shrinkForVerification(original);
        picked.push({ file, preview: URL.createObjectURL(file), takenAt });
      }
      setPhotos((current) => {
        const next = placePhotos(current, picked, clicked.current);
        // Anything that did not fit is let go of straight away.
        release(picked.filter((p) => !next.includes(p)));
        return next;
      });
    } finally {
      setPreparing(false);
    }
  };

  const remove = (slot: number) =>
    setPhotos((current) => {
      release([current[slot]]);
      return current.map((p, i) => (i === slot ? null : p));
    });

  const send = async () => {
    if (!ready || !countryName) return;
    setSending(true);
    setError(null);
    try {
      // One at a time: the server processes one photo at a time anyway.
      const sent = [];
      for (const photo of photos as PickedPhoto[]) {
        const stored = uploaded.current.get(photo.file) ?? (await uploadSignedAsset({ signUrl: BADGE_UPLOAD_SIGN_URL, file: photo.file }));
        uploaded.current.set(photo.file, stored);
        sent.push({ url: stored.url, publicId: stored.publicId, takenAt: photo.takenAt });
      }
      await countryBadgeApi.submit({ countryCode: country, countryName, photos: sent, note: note.trim() || undefined });
      onSent?.(countryName);
      reset();
      onClose();
    } catch (err) {
      setError(badgeErrorMessage(err, "Couldn't send your photos. Try again."));
    } finally {
      setSending(false);
    }
  };

  const withdraw = async (request: CountryBadgeRequest) => {
    try {
      await countryBadgeApi.withdraw(request.id);
      setRequests((current) => current.filter((r) => r.id !== request.id));
    } catch (err) {
      setError(badgeErrorMessage(err, "Couldn't withdraw it. Try again."));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      fullScreen={narrow}
      aria-labelledby="add-country-badge-title"
      PaperProps={{ sx: { borderRadius: narrow ? 0 : '18px' } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, pt: 2.5, pb: 1 }}>
        <Typography id="add-country-badge-title" component="h2" variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
          Add a past country
        </Typography>
        <IconButton aria-label="Close" onClick={close} disabled={sending} edge="end">
          <IconX size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ display: 'grid', gap: 2.5, pt: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Been somewhere before you joined? Send two photos of you there, at places people would recognise: a landmark, a
          street sign, a skyline. Someone on our team checks them by hand, and the flag joins your travel stamps once it's
          approved.
        </Typography>

        <Autocomplete
          fullWidth
          size="small"
          disabled={sending}
          options={COUNTRIES.map(([code]) => code)}
          value={country || null}
          onChange={(_, code) => setCountry(code ?? '')}
          getOptionLabel={(code) => countryNameFromCode(code) ?? code}
          isOptionEqualToValue={(a, b) => a === b}
          renderOption={(props, code) => (
            <Box component="li" {...props} key={code} sx={{ display: 'flex', gap: 1 }}>
              <CountryFlag country={code} size={18} />
              {countryNameFromCode(code) ?? code}
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Country"
              placeholder="Choose the country"
              InputProps={{
                ...params.InputProps,
                startAdornment: country ? (
                  <InputAdornment position="start" sx={{ ml: 0.5 }}>
                    <CountryFlag country={country} size={18} />
                  </InputAdornment>
                ) : (
                  params.InputProps.startAdornment
                ),
              }}
            />
          )}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
        />

        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Two photos of you there
          </Typography>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple={free > 1}
            hidden
            onChange={(e) => void onFiles(e)}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            {photos.map((photo, slot) => (
              <Box key={slot}>
                {photo ? (
                  <Box sx={{ position: 'relative', aspectRatio: '1', borderRadius: '14px', overflow: 'hidden', bgcolor: 'action.hover' }}>
                    <Box component="img" src={photo.preview} alt={`Photo ${slot + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <IconButton
                      aria-label={`Remove photo ${slot + 1}`}
                      onClick={() => remove(slot)}
                      disabled={sending}
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.55)', color: 'common.white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                    >
                      <IconX size={16} />
                    </IconButton>
                  </Box>
                ) : (
                  <ButtonBase
                    onClick={() => choose(slot)}
                    disabled={sending || preparing}
                    aria-label={free > 1 ? 'Choose your two photos' : `Choose photo ${slot + 1}`}
                    sx={(t) => ({
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '14px',
                      border: `1.5px dashed ${t.palette.primary.main}`,
                      bgcolor: t.custom.brand.tint.subtle,
                      color: 'primary.main',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      fontFamily: 'inherit',
                      '&:hover': { bgcolor: t.custom.brand.tint.soft },
                      '&:focus-visible': { outline: `2px solid ${t.custom.ring}` },
                    })}
                  >
                    {preparing ? <CircularProgress size={22} /> : <IconPhotoPlus size={26} />}
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {free > 1 ? 'Choose both photos' : slot === 0 ? 'First photo' : 'Second photo'}
                    </Typography>
                  </ButtonBase>
                )}
                <Typography variant="caption" noWrap sx={{ display: 'block', mt: 0.5, color: 'text.secondary', minHeight: '1.5em' }}>
                  {photo ? (photo.takenAt ? `Taken ${formatTakenAt(photo.takenAt)}` : 'No capture date in the file') : ' '}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Your face and the place should both be clear. Two different spots work best. You can choose both at once.
          </Typography>
          <Box
            sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1.25, borderRadius: '12px', bgcolor: 'action.hover' }}
          >
            <Box sx={{ flexShrink: 0, color: 'text.secondary', display: 'flex', mt: '1px' }}>
              <IconShieldCheck size={18} />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {VERIFICATION_ONLY_TEXT}
            </Typography>
          </Box>
        </Box>

        <TextField
          label="Where were these taken? (optional)"
          placeholder="e.g. Colosseum, Rome"
          size="small"
          value={note}
          disabled={sending}
          onChange={(e) => setNote(e.target.value.slice(0, BADGE_NOTE_MAX))}
          inputProps={{ maxLength: BADGE_NOTE_MAX }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        {requests.length ? (
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
              Your requests
            </Typography>
            {requests.map((request) => (
              <Box
                key={request.id}
                sx={{ display: 'grid', gap: 0.75, p: 1.5, borderRadius: '12px', border: 1, borderColor: 'divider' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <CountryFlag country={request.countryCode} variant="circle" size={24} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {request.countryName}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          request.status === 'approved' ? 'success.main' : request.status === 'declined' ? 'error.main' : 'text.secondary',
                      }}
                    >
                      {STATUS_TEXT[request.status] ?? request.status} · sent {formatRelativeTime(request.createdAt)}
                    </Typography>
                  </Box>
                  {request.status === 'pending' ? (
                    <Button size="small" color="inherit" onClick={() => void withdraw(request)}>
                      Withdraw
                    </Button>
                  ) : null}
                </Box>
                {request.status === 'declined' && request.declineReason ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {request.declineReason} You can send new photos any time.
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
        <Button variant="contained" size="large" disabled={!ready} onClick={() => void send()} sx={{ m: '0 !important' }}>
          {sending ? 'Sending…' : 'Send for review'}
        </Button>
        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          They aren't shown on your profile, and they're deleted once checked.
        </Typography>
      </DialogActions>
    </Dialog>
  );
};

export default AddCountryBadgeDialog;
