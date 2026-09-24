// Extracted from AppShellHeader so the routing rule can be tested: vitest runs in node here, with no DOM.
/**
 * Where a notification takes you, or null to only mark it read.
 *
 * The panel has always rendered rows with `cursor: pointer` that went nowhere.
 * This is not an attempt to fix that everywhere: it routes the notifications
 * that exist to prompt an action, because a nudge saying "write the after story"
 * that does not open the story is worse than no nudge at all.
 *
 * Types with no obvious destination stay as they were.
 */
export function notificationTarget(n: {
  notificationType?: string;
  referenceId?: string | null;
  referenceType?: string | null;
  actorUserId?: number | null;
}): string | null {
  // A follow references nobody: the thing you want to see is the person who did it.
  if (n.notificationType === 'Follow') {
    return typeof n.actorUserId === 'number' ? `/traveler/${n.actorUserId}` : null;
  }

  const id = n.referenceId;
  if (!id) return null;

  switch (n.notificationType) {
    // Straight into the tab being asked for, not the trip's front page.
    case 'StoryReady':
      return n.referenceType === 'Trip' ? `/tripplanner/${id}?tab=story` : null;
    // The editor is where the accept-or-decline prompt lives.
    case 'StoryInvite':
      return n.referenceType === 'Story' ? `/story/${id}/edit` : null;
    case 'TripPublished':
    case 'TripUpdated':
    case 'TripInvite':
    case 'TripJoined':
    case 'TripCreated':
    case 'Announcement':
      return n.referenceType === 'Trip' ? `/trip/${id}` : null;
    /*
     * Recruitment. These three had no case at all, so the row rendered with a
     * pointer cursor and went nowhere.
     *
     * The organiser is sent to the trip's public page, because that is where
     * TripSeatsBand renders the requests panel and the approve/decline buttons -
     * the only place the request can actually be acted on.
     */
    case 'JoinRequested':
      return n.referenceType === 'Trip' ? `/trip/${id}` : null;
    // The applicant's answer is the seats band too: it shows "You are on this
    // trip" or the decline line, keyed off their own membership.
    case 'JoinApproved':
    case 'JoinDeclined':
      return n.referenceType === 'Trip' ? `/trip/${id}` : null;
    // Groups. A request goes to the admins' queue, a welcome or an add to the group itself.
    case 'GroupJoinRequested':
      return n.referenceType === 'Organization' ? `/groups/${id}?tab=members` : null;
    case 'GroupJoinApproved':
    case 'GroupMemberAdded':
      return n.referenceType === 'Organization' ? `/groups/${id}` : null;
    case 'OrgAnnouncement':
      return n.referenceType === 'Organization' ? `/groups/${id}?tab=notices` : null;
    // The fallback for a message when the thread cannot be opened in place.
    case 'Message':
      return '/messages';
    case 'GroupDiscussionReply':
      return n.referenceType === 'Organization' ? `/groups/${id}?tab=discussion` : null;
    // A business answers enquiries from its leads list; a new crew member shows on the trip.
    case 'EnquiryReceived':
      return '/operator';
    case 'TripMemberJoined':
      return n.referenceType === 'Trip' ? `/trip/${id}` : null;
    // Somebody said something about your trip, or handed you the keys to it.
    case 'Comment':
    case 'Reply':
    case 'TripRoleGranted':
    case 'TripRoleRevoked':
    case 'TripOwnershipTransferred':
      return n.referenceType === 'Trip' ? `/trip/${id}` : null;
    // Posts and stories. A reply has no permalink, so the server sends the thread it belongs to.
    case 'PostLiked':
    case 'PostReplied':
    case 'AnswerAccepted':
      return n.referenceType === 'Post' ? `/post/${id}` : null;
    case 'StoryReaction':
    case 'StoryQuestion':
      return n.referenceType === 'Story' ? `/story/${id}` : null;
    default:
      return null;
  }
}
