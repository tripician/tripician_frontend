import { describe, it, expect } from 'vitest';
import { notificationTarget } from './notificationTarget';

const TRIP = '11111111-1111-1111-1111-111111111111';

// Every type the server can write, and where a row of it should go.
// Null is a decision, not a gap: the reason is written beside it.
const ROUTES: Array<[string, string | null, string | null, string?]> = [
  ['StoryReady', 'Trip', `/tripplanner/${TRIP}?tab=story`],
  ['StoryInvite', 'Story', `/story/${TRIP}/edit`],
  ['TripPublished', 'Trip', `/trip/${TRIP}`],
  ['TripUpdated', 'Trip', `/trip/${TRIP}`],
  ['TripInvite', 'Trip', `/trip/${TRIP}`],
  ['TripJoined', 'Trip', `/trip/${TRIP}`],
  ['TripCreated', 'Trip', `/trip/${TRIP}`],
  ['Announcement', 'Trip', `/trip/${TRIP}`],
  ['JoinRequested', 'Trip', `/trip/${TRIP}`],
  ['JoinApproved', 'Trip', `/trip/${TRIP}`],
  ['JoinDeclined', 'Trip', `/trip/${TRIP}`],
  ['TripMemberJoined', 'Trip', `/trip/${TRIP}`],
  ['Comment', 'Trip', `/trip/${TRIP}`],
  ['Reply', 'Trip', `/trip/${TRIP}`],
  ['TripRoleGranted', 'Trip', `/trip/${TRIP}`],
  ['TripRoleRevoked', 'Trip', `/trip/${TRIP}`],
  ['TripOwnershipTransferred', 'Trip', `/trip/${TRIP}`],
  ['GroupJoinRequested', 'Organization', `/groups/${TRIP}?tab=members`],
  ['GroupJoinApproved', 'Organization', `/groups/${TRIP}`],
  ['GroupMemberAdded', 'Organization', `/groups/${TRIP}`],
  ['OrgAnnouncement', 'Organization', `/groups/${TRIP}?tab=notices`],
  ['GroupDiscussionReply', 'Organization', `/groups/${TRIP}?tab=discussion`],
  ['EnquiryReceived', 'Trip', '/operator'],
  ['Message', 'Trip', '/messages'],
  ['PostLiked', 'Post', `/post/${TRIP}`],
  ['PostReplied', 'Post', `/post/${TRIP}`],
  ['AnswerAccepted', 'Post', `/post/${TRIP}`],
  ['StoryReaction', 'Story', `/story/${TRIP}`],
  ['StoryQuestion', 'Story', `/story/${TRIP}`],
  ['GroupJoinDeclined', 'Organization', null, 'you are not in the group, so there is nothing to open'],
  ['Mention', 'Trip', null, 'never written by the server'],
  ['ExpenseAdded', 'Trip', null, 'never written by the server'],
  ['Reminder', 'Trip', null, 'never written by the server'],
  ['System', 'Trip', null, 'never written by the server'],
];

describe('notificationTarget', () => {
  it.each(ROUTES)('routes %s', (type, referenceType, expected) => {
    expect(notificationTarget({ notificationType: type, referenceId: TRIP, referenceType })).toBe(expected);
  });

  it('sends a follow to the person who followed you, since it references nothing', () => {
    expect(notificationTarget({ notificationType: 'Follow', referenceId: null, referenceType: 'UserFollow', actorUserId: 7 }))
      .toBe('/traveler/7');
    // Older rows were written without an actor, and a link to nobody is worse than no link.
    expect(notificationTarget({ notificationType: 'Follow', referenceId: null, referenceType: 'UserFollow' })).toBeNull();
  });

  it('refuses a reference type that does not match the destination', () => {
    expect(notificationTarget({ notificationType: 'PostLiked', referenceId: TRIP, referenceType: 'Trip' })).toBeNull();
    expect(notificationTarget({ notificationType: 'StoryReaction', referenceId: TRIP, referenceType: 'Post' })).toBeNull();
    expect(notificationTarget({ notificationType: 'Comment', referenceId: TRIP, referenceType: 'Post' })).toBeNull();
  });

  it('returns null without a reference, so a row with nothing behind it is not dressed as a link', () => {
    expect(notificationTarget({ notificationType: 'TripPublished', referenceId: null, referenceType: 'Trip' })).toBeNull();
    expect(notificationTarget({ notificationType: 'PostLiked', referenceType: 'Post' })).toBeNull();
  });

  it('does not invent a destination for a type it has never heard of', () => {
    expect(notificationTarget({ notificationType: 'SomethingNew', referenceId: TRIP, referenceType: 'Trip' })).toBeNull();
  });
});
