import React from 'react';
import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import {
  IconRosetteDiscountCheckFilled, IconCalendar, IconRoute,
  IconUsers, IconBook, IconAward,
} from '@tabler/icons-react';
import { apiServices } from '../../services/APIs/apiServices';
import type { OrganiserRecord } from '../../seats/types';

interface CredibilityStripProps {
  userId: number;
  /** 'column' stacks one fact per line, for the 340px identity rail. */
  direction?: 'row' | 'column';
}

/**
 * Why a stranger should believe this person is real.
 *
 * Deliberately not the travel passport below it, and the difference is the whole
 * point of the page. The passport is a diary: it counts what its owner says they
 * did, and anyone can type a trip. This counts only things that cost something
 * outside the owner's own keyboard, so it cannot be filled in by pressing the
 * create button:
 *
 *   identity verified   a document a third party checked
 *   member since        time, which cannot be bought back
 *   trips run           published trips whose end date has passed
 *   travellers          other people who were actually on them
 *   stories             public write-ups, which anyone can go and read
 *   Tripician Verified  a person on the team read the plan
 *
 * Facts only. No score, no "trusted traveller", no adjective. The moment this
 * renders a judgement rather than a count, it becomes a claim Tripician has to
 * stand behind, and it stops being checkable by the person reading it.
 */
const CredibilityStrip: React.FC<CredibilityStripProps> = ({ userId, direction = 'row' }) => {
  const theme = useTheme();
  const [record, setRecord] = React.useState<OrganiserRecord | null>(null);

  /*
   * Matched on the id in the reply, not on a cleanup flag.
   *
   * The flag version left this permanently empty: React invokes an effect,
   * tears it down and invokes it again, and the reply that arrived belonged to
   * the torn-down pass, so the live component discarded its own data and never
   * asked twice. Checking the id the server echoed back is correct however many
   * times the effect runs, and still refuses a reply meant for another profile.
   */
  React.useEffect(() => {
    if (!Number.isFinite(userId) || userId <= 0) return;
    void apiServices.getOrganiserRecord(userId)
      .then((resp) => { if (resp.data?.userId === userId) setRecord(resp.data); })
      .catch(() => { /* a missing strip says less than a wrong one */ });
  }, [userId]);

  // Nothing while loading and nothing on failure. A trust signal that arrives
  // late, or half-filled, is worse than one that never appeared.
  if (!record) return null;

  const year = record.memberSince ? new Date(record.memberSince).getFullYear() : null;

  const facts: Array<{ Icon: React.ElementType; text: string; tip: string; brand?: boolean }> = [];

  if (record.identityVerified) {
    facts.push({
      Icon: IconRosetteDiscountCheckFilled,
      text: 'Identity verified',
      tip: 'A government ID was checked by our verification provider. Tripician never sees or stores the document.',
      brand: true,
    });
  }
  if (year && !Number.isNaN(year)) {
    facts.push({ Icon: IconCalendar, text: `Member since ${year}`, tip: 'When this account was created.' });
  }
  if (record.tripsRun > 0) {
    facts.push({
      Icon: IconRoute,
      text: `${record.tripsRun} ${record.tripsRun === 1 ? 'trip run' : 'trips run'}`,
      tip: 'Published trips of theirs whose end date has passed. Trips still to come are not counted.',
    });
  }
  if (record.travellersTaken > 0) {
    facts.push({
      Icon: IconUsers,
      text: `${record.travellersTaken} ${record.travellersTaken === 1 ? 'traveller' : 'travellers'}`,
      tip: 'Different people who were on those trips. The same person on several trips counts once.',
    });
  }
  if (record.storiesPublished > 0) {
    facts.push({
      Icon: IconBook,
      text: `${record.storiesPublished} ${record.storiesPublished === 1 ? 'story' : 'stories'}`,
      tip: 'Published write-ups about those trips, by anyone who went. You can read them.',
    });
  }
  if (record.verifiedTrips > 0) {
    facts.push({
      Icon: IconAward,
      text: `${record.verifiedTrips} Tripician Verified`,
      tip: 'Someone on our team read the whole plan and put our name on it.',
      brand: true,
    });
  }

  // A new account is new, not suspect. Saying so beats a row of zeros, which
  // reads as a verdict on somebody who has simply not travelled yet.
  const isNew = facts.length === 0 || (facts.length === 1 && !record.identityVerified);

  const stacked = direction === 'column';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        flexWrap: stacked ? 'nowrap' : 'wrap',
        alignItems: stacked ? 'flex-start' : 'center',
        gap: stacked ? 1.1 : 1,
        borderRadius: '14px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: theme.custom.surface.hover,
        px: 1.75, py: 1.25,
      }}
    >
      {isNew ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          New here. This fills in as trips happen and get written up.
        </Typography>
      ) : (
        facts.map((f) => (
          <Tooltip key={f.text} title={f.tip} arrow>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, cursor: 'help' }}>
              <f.Icon size={15} stroke={1.9} color={f.brand ? theme.palette.primary.main : theme.palette.text.disabled} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: f.brand ? 'text.primary' : 'text.secondary' }}
              >
                {f.text}
              </Typography>
            </Box>
          </Tooltip>
        ))
      )}
    </Box>
  );
};

export default CredibilityStrip;
