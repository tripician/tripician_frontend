/**
 * A traveller post: the short, immediate thing you say from the platform while
 * you are waiting for the train.
 *
 * Deliberately not an after story. A story is written afterwards, edited, and
 * meant to last. These two have different lifespans and different bars, so they
 * are different objects with different cards.
 */

export interface PostMedia {
  url: string;
  position: number;
}

/** A note is said and done. A question is asked and answered. */
export type PostKind = 'note' | 'question';

export interface PostTag {
  id: string;
  label: string;
  group: 'topic' | 'place';
}

/**
 * A published plan or story riding on a post.
 *
 * Resolved server-side, including the link, so the strip costs no second request
 * and slug rules live in one place. The server only ever sends this for content
 * that is actually public, so a card can render it without checking anything.
 */
export interface PostAttachment {
  /** Doubles as the CardTypeKind the ribbon draws. */
  kind: 'plan' | 'story';
  id: string;
  title: string;
  coverUrl: string | null;
  /** One line under the title, already assembled. Null when there is nothing true to say. */
  meta: string | null;
  href: string;
  /** The plan's shape. Absent on older servers and whenever the preview read failed, so the strip is the fallback. */
  plan?: PlanPreview | null;
  /** The story's opening. Same fallback rule. */
  story?: StoryPreview | null;
}

/** One destination: consecutive days in one place are one stop. */
export interface PlanStop {
  name: string;
  nights: number;
}

export interface PlanPreview {
  startDate: string | null;
  endDate: string | null;
  nights: number;
  countries: string[];
  /** The first few stops in order; `stopCount` is the full number. */
  stops: PlanStop[];
  stopCount: number;
  placeCount: number;
  /** Must-see places first, then the rest in plan order. */
  highlights: string[];
  joinable: boolean;
  /** Null when the organiser named no capacity, which is not the same as unlimited. */
  spotsLeft: number | null;
  /** How many travellers copied this plan into their own. */
  cloneCount?: number;
}

export interface StoryPreview {
  /** The author's summary, or the first 280 characters of the story. */
  summary: string | null;
  template: string;
  travelStartDate: string | null;
  travelEndDate: string | null;
  vibe: string | null;
}

/** Somebody who liked a post. Only public profiles are ever named. */
export interface PostLiker {
  userId: number;
  name: string;
  avatarUrl: string | null;
}

export interface TravelerPost {
  id: string;
  authorUserId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  authorIdentityVerified: boolean;
  kind: PostKind;
  /** Questions only. What the list is scanned by. */
  title: string | null;
  body: string;
  placeName: string | null;
  tripId: string | null;
  /** Kept because the wire shape is a contract. Read `attachment` instead. */
  tripName: string | null;
  storyId: string | null;
  /** The published plan or story this post carries. Null on an ordinary note or question. */
  attachment: PostAttachment | null;
  parentPostId: string | null;
  acceptedAnswerId: string | null;
  media: PostMedia[];
  tags: PostTag[];
  likeCount: number;
  /** Up to three likers to show: people the reader follows first, never the reader. */
  likedBy?: PostLiker[] | null;
  replyCount: number;
  score: number;
  /** The reader's own vote: 1, -1 or 0. Never anybody else's. */
  viewerVote: number;
  viewerLiked: boolean;
  viewerCanDelete: boolean;
  /** True only for the person who asked, so only they see the accept control. */
  viewerCanAccept: boolean;
  isAccepted: boolean;
  createdAt: string;
  /** Answered-at, not asked-at. What "latest" means on a question. */
  lastActivityAt: string | null;
}

export interface PostTagCount extends PostTag {
  count: number;
}

export interface QuestionPage {
  items: TravelerPost[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export type QuestionSort = 'latest' | 'unanswered' | 'top';

/** What the composer sends back: the URL to show, and the id we need to delete it. */
export interface PostMediaInput {
  url: string;
  publicId: string;
}

export interface PostDraft {
  body: string;
  placeName?: string | null;
  /** Share one of your own published trips. The server refuses an unpublished one. */
  tripId?: string | null;
  /** Share one of your own published stories. Same rule. */
  storyId?: string | null;
  parentPostId?: string | null;
  media?: PostMediaInput[];
  kind?: PostKind;
  title?: string | null;
  tags?: string[];
}

export const POST_LIMITS = {
  /** A note stays short. Mirrors TravelerPostLimits. */
  maxBody: 280,
  /** A question that cannot be explained is not a question. */
  maxQuestionBody: 4000,
  maxTitle: 160,
  maxTopicTags: 2,
  maxPlaceTags: 2,
  maxPhotos: 4,
  /** 6MB, matching what the upload endpoint advertises. */
  maxPhotoBytes: 6 * 1024 * 1024,
} as const;

/**
 * A post the server declined to publish.
 *
 * `category` is ours for logging; `message` is written for the person who typed
 * it and is the only thing that should ever be shown.
 */
export class PostRejectedError extends Error {
  readonly category: string;
  constructor(message: string, category: string) {
    super(message);
    this.name = 'PostRejectedError';
    this.category = category;
  }
}
