/**
 * Who this traveller is, as a column beside what they have done.
 *
 * ## Why a rail came back
 *
 * A sidebar was deleted from this page once before, and the reason is worth
 * keeping in view: its column was rendered unconditionally while every card
 * inside it was conditional, so a traveller with no trips got a blank 300px
 * gutter. This one takes the opposite approach. It reports through `hasContent`
 * whether it has anything at all, the page reserves no column when it does not,
 * and the whole thing collapses to one lane rather than holding a slot open.
 *
 * ## What belongs here and what does not
 *
 * Facts about the person: the figures, what can be corroborated, how they
 * travel, what they wrote, how to reach them. Not their work. Trips, stories,
 * saved items and the travel history stay in the main column, because those are
 * the things a reader came to look through and they need the width.
 *
 * Actions stay out too. Follow, Edit profile and the social links live in the
 * identity row at the top of the page, where people already look for them.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import CredibilityStrip from './CredibilityStrip';
import ProfileIntro, { readIntro } from './ProfileIntro';
import { ProfilePassport, ProfileDetails, type PassportView } from './ProfilePassport';

interface ProfileIdentityRailProps {
  /** Drives the credibility facts. Omitted while the profile is still loading. */
  userId?: number;
  passport: PassportView | null;
  passportLoading?: boolean;
  /** The raw profile object, for the intro and the detail rows. */
  profile: any;
  /** Own profile: the intro becomes a prompt rather than being hidden. */
  isOwner?: boolean;
  onEdit?: () => void;
  onPlanTrip?: () => void;
}

/**
 * Whether the rail would render anything, so a page can decide not to reserve
 * the column. Deliberately a separate export rather than a ref or a callback:
 * the answer is a pure function of the same props, and a layout that depends on
 * a child reporting upward after paint jumps on first load.
 */
export function railHasContent(args: {
  passport: PassportView | null;
  profile: any;
  isOwner?: boolean;
}): boolean {
  const { passport, profile, isOwner } = args;
  if (isOwner) return true; // The intro prompt and Edit are always worth showing.
  if (passport && (passport.trips > 0 || passport.countryCount > 0 || passport.nights > 0)) return true;
  if (readIntro(profile)) return true;
  const highlights = Array.isArray(profile?.bio?.highlights) ? profile.bio.highlights : [];
  if (highlights.some((h: any) => h?.key !== 'intro' && h?.value)) return true;
  return Boolean(profile?.country || profile?.email || profile?.phone);
}

const ProfileIdentityRail: React.FC<ProfileIdentityRailProps> = ({
  userId,
  passport,
  passportLoading,
  profile,
  isOwner,
  onEdit,
  onPlanTrip,
}) => {
  const theme = useTheme();
  const intro = readIntro(profile);

  const card = {
    borderRadius: '16px',
    border: `1px solid ${theme.custom.surface.border}`,
    bgcolor: 'background.paper',
    p: 2,
  } as const;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* The figures, then the evidence for them. That order on purpose: the
          numbers are the claim and the strip below is what backs it, so a
          reader meets the assertion and its support together. */}
      <ProfilePassport
        passport={passport}
        loading={passportLoading}
        orientation="column"
        onPlanTrip={onPlanTrip}
        hideWhenEmpty={!isOwner}
      />

      {typeof userId === 'number' && Number.isFinite(userId) ? (
        <CredibilityStrip userId={userId} direction="column" />
      ) : null}

      {/* Their own words. Shown for a stranger only when written; for the owner
          the empty state is a prompt, which is why it is not conditional.

          Only the written case gets a card. Empty, ProfileIntro draws its own
          dashed invitation, and wrapping that in a second bordered box would be
          two frames around one message. */}
      {intro ? (
        <Box sx={card}>
          <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1 }}>
            {isOwner ? 'About you' : 'About'}
          </Typography>
          <ProfileIntro profile={profile} compact />
        </Box>
      ) : isOwner ? (
        <ProfileIntro profile={profile} editable onEdit={onEdit} compact />
      ) : null}

      <ProfileDetails profile={profile} layout="stack" />
    </Box>
  );
};

export default ProfileIdentityRail;
