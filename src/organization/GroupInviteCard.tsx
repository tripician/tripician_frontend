import React from 'react';
import { apiServices } from '../services/APIs/apiServices';
import InviteLinkCard from '../components/ui/InviteLinkCard';
import { inviteUrl } from './groupLogic';
import type { Organization } from './types';

// The group's invite link, for admins. Anyone with it joins at once, so it can be replaced or switched off.
const GroupInviteCard: React.FC<{ organization: Organization }> = ({ organization }) => {
  const id = organization.id;
  const load = React.useCallback(async () => (await apiServices.getGroupInvite(id)).data?.token ?? null, [id]);
  const rotate = React.useCallback(async () => (await apiServices.rotateGroupInvite(id)).data?.token ?? null, [id]);
  const revoke = React.useCallback(async () => { await apiServices.revokeGroupInvite(id); }, [id]);

  return (
    <InviteLinkCard
      noun="group"
      description={organization.visibility === 'private'
        ? 'This is the only way into a private group. Anyone with the link joins straight away.'
        : 'Anyone with the link joins straight away, without waiting for approval.'}
      load={load}
      rotate={rotate}
      revoke={revoke}
      linkFor={(token) => inviteUrl(window.location.origin, token)}
    />
  );
};

export default GroupInviteCard;
