/** Who is paying, as the server read it from their own account. Any part may be missing. */
export interface Payer {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** The part of Razorpay's options that says who is paying. */
export interface CheckoutIdentity {
  prefill: { name?: string; email?: string; contact?: string };
  readonly?: { email: true };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Blank, or the word NULL that some old rows hold where nothing was entered.
const clean = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed.toUpperCase() !== 'NULL' ? trimmed : undefined;
};

/** A phone number in the form Razorpay expects, or undefined when passing it on would be a guess. */
export function checkoutPhone(phone: string | null | undefined): string | undefined {
  const raw = clean(phone);
  if (!raw) return undefined;

  const digits = raw.replace(/[\s().-]/g, '');
  const international = digits.startsWith('+');
  const body = international ? digits.slice(1) : digits;
  if (!/^\d+$/.test(body)) return undefined;

  // A number that names its own country is taken as given.
  if (international) return body.length >= 8 && body.length <= 15 ? `+${body}` : undefined;

  // With no country code Razorpay assumes India, so only an Indian mobile is passed on.
  if (/^[6-9]\d{9}$/.test(body)) return `+91${body}`;
  if (/^0[6-9]\d{9}$/.test(body)) return `+91${body.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(body)) return `+${body}`;
  return undefined;
}

/** Opens the sheet as the signed-in buyer, so it does not fall back to whoever the device remembers. */
export function checkoutIdentity(payer: Payer | null | undefined): CheckoutIdentity {
  const name = clean(payer?.name);
  const typed = clean(payer?.email);
  const email = typed && EMAIL.test(typed) ? typed : undefined;
  const contact = checkoutPhone(payer?.phone);

  return {
    prefill: {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(contact ? { contact } : {}),
    },
    // The receipt belongs to the account, so its address cannot be swapped for another inside the sheet.
    ...(email ? { readonly: { email: true as const } } : {}),
  };
}

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/** The brand mark as a small white-backed square, which is what a payment sheet's logo tile needs. */
export function checkoutLogo(iconUrl: string | null | undefined): string | undefined {
  const url = clean(iconUrl);
  // The sheet runs on Razorpay's origin, so anything but an absolute https address would not load there.
  if (!url || !url.startsWith('https://')) return undefined;

  const hosted = CLOUDINARY_UPLOAD.exec(url);
  return hosted ? `${hosted[1]}c_pad,b_white,w_256,h_256,f_png/${hosted[2]}` : url;
}
