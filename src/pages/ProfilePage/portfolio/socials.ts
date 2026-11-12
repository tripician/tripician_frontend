import type React from 'react';
import { IconBrandFacebook, IconBrandInstagram, IconBrandX, IconLink } from '@tabler/icons-react';
import { safeExternalUrl } from '../../../utils/sanitizeHtml';

export interface ProfileSocial {
  url: string;
  Icon: React.ElementType;
  label: string;
}

/**
 * The social links a profile carries, made safe to open. Placeholder values the
 * old forms stored ("NULL") and anything that is not a real http(s) address drop out.
 */
export function profileSocials(p: { instagram?: unknown; twitter?: unknown; facebook?: unknown; website?: unknown } | null | undefined): ProfileSocial[] {
  if (!p) return [];
  const raw: Array<{ value: unknown; Icon: React.ElementType; label: string }> = [
    { value: p.instagram, Icon: IconBrandInstagram, label: 'Instagram' },
    { value: p.twitter, Icon: IconBrandX, label: 'X' },
    { value: p.facebook, Icon: IconBrandFacebook, label: 'Facebook' },
    { value: p.website, Icon: IconLink, label: 'Website' },
  ];
  return raw.flatMap(({ value, Icon, label }) => {
    if (typeof value !== 'string' || value.toUpperCase().includes('NULL')) return [];
    const url = safeExternalUrl(value);
    return url ? [{ url, Icon, label }] : [];
  });
}
