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
  tripName: string | null;
  parentPostId: string | null;
  acceptedAnswerId: string | null;
  media: PostMedia[];
  tags: PostTag[];
  likeCount: number;
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
  tripId?: string | null;
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
