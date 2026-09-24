import React from 'react';
import { apiServices } from '../services/APIs/apiServices';
import InviteLinkCard from '../components/ui/InviteLinkCard';
import { tripInviteUrl } from './tripInvite';

// For the people who manage a trip's crew: one link that brings anyone in, account or not.
const TripInviteCard: React.FC<{ tripId: string }> = ({ tripId }) => {
  const load = React.useCallback(async () => (await apiServices.getTripInvite(tripId)).data?.token ?? null, [tripId]);
  const rotate = React.useCallback(async () => (await apiServices.rotateTripInvite(tripId)).data?.token ?? null, [tripId]);
  const revoke = React.useCallback(async () => { await apiServices.revokeTripInvite(tripId); }, [tripId]);

  return (
    <InviteLinkCard
      noun="trip"
      description="Send it in your group chat. Anyone who opens it can sign up and join this trip straight away, even if they are new to Tripician."
      load={load}
      rotate={rotate}
      revoke={revoke}
      linkFor={(token) => tripInviteUrl(window.location.origin, token)}
    />
  );
};

export default TripInviteCard;
