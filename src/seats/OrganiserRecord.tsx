import React from 'react';
import { Box, Typography } from '@mui/material';
import { IconRosetteDiscountCheckFilled } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import type { OrganiserRecord as Record } from './types';

interface OrganiserRecordProps {
  userId: number;
}

/**
 * What the organiser has actually done, on one line.
 *
 * The counterpart to the "not reviewed by Tripician" warning, and deliberately
 * its opposite in kind: that one says nobody checked, this one says what the
 * person has done. Facts rather than a verdict, because a badge reading
 * "trusted" is a claim Tripician would have to stand behind, while "3 trips run"
 * is one the organiser earned and nobody has to underwrite.
 *
 * Renders nothing while loading and nothing on failure. A trust signal that
 * appears late or half-filled is worse than one that never appeared, because a
 * reader who saw a blank space has already decided.
 */
const OrganiserRecord: React.FC<OrganiserRecordProps> = ({ userId }) => {
  const [record, setRecord] = React.useState<Record | null>(null);

  React.useEffect(() => {
    if (!Number.isFinite(userId) || userId <= 0) return;
    let active = true;
    void apiServices.getOrganiserRecord(userId)
      .then((resp) => { if (active) setRecord(resp.data); })
      .catch(() => { if (active) setRecord(null); });
    return () => { active = false; };
  }, [userId]);

  if (!record) return null;

  const year = record.memberSince ? new Date(record.memberSince).getFullYear() : null;

  const parts: string[] = [];
  if (year && !Number.isNaN(year)) parts.push(`Member since ${year}`);
  if (record.tripsRun > 0) {
    parts.push(`${record.tripsRun} ${record.tripsRun === 1 ? 'trip run' : 'trips run'}`);
  }
  if (record.travellersTaken > 0) {
    parts.push(`${record.travellersTaken} ${record.travellersTaken === 1 ? 'traveller' : 'travellers'}`);
  }
  if (record.storiesPublished > 0) {
    parts.push(`${record.storiesPublished} ${record.storiesPublished === 1 ? 'story' : 'stories'}`);
  }

  // Stated rather than left blank. An empty space where a record goes reads as a
  // record, and a first trip is a fact about this organiser, not a mark against
  // them, so it is worded and coloured like every other line here.
  const isFirst = record.tripsRun === 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, color: 'text.disabled' }}>
      {record.identityVerified && (
        <Box component="span" sx={{ display: 'inline-flex', color: '#0EA5E9' }}>
          <IconRosetteDiscountCheckFilled size={14} />
        </Box>
      )}
      <Typography variant="caption">
        {isFirst
          ? `${parts.join(' · ')}${parts.length > 0 ? ' · ' : ''}first trip on Tripician`
          : parts.join(' · ')}
      </Typography>
    </Box>
  );
};

export default OrganiserRecord;
