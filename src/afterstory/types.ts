/**
 * After Story types.
 *
 * The whole feature lives under src/afterstory. Nothing here imports from
 * pages/CreateTripPage, and the planner imports exactly one component from here,
 * so the feature stays a block that can be lifted out or switched off.
 *
 * The block union is the contract with the backend's StoryBodyValidator. That
 * validator rebuilds the body from scratch on every write, so a field added here
 * without a matching case there will be silently dropped on save. The two move
 * together.
 */

// ── content blocks ──────────────────────────────────────────────────────────

export type PhotoWidth = 'inset' | 'wide' | 'full';
export type GalleryLayout = 'grid' | 'strip';
export type ListStyle = 'musttry' | 'tips' | 'plain';
export type PlaceVerdict = 'loved' | 'liked' | 'skip';
export type VideoProvider = 'youtube' | 'vimeo';

export interface GalleryItem {
  url: string;
  caption?: string;
  alt?: string;
}

export interface MapStop {
  name: string;
  lat: number;
  lng: number;
}

export interface CostRow {
  label: string;
  amount: number;
}

export interface RelatedItem {
  kind: 'video' | 'link';
  url: string;
  title?: string;
  thumbUrl?: string;
  provider?: VideoProvider;
}

export type StoryBlock =
  | { id: string; type: 'text'; html: string }
  | { id: string; type: 'heading'; text: string; level: 2 | 3 }
  | { id: string; type: 'quote'; text: string; attribution?: string }
  | { id: string; type: 'photo'; url: string; caption?: string; alt?: string; width: PhotoWidth }
  | { id: string; type: 'gallery'; items: GalleryItem[]; layout: GalleryLayout }
  | {
      id: string;
      type: 'place';
      name: string;
      note?: string;
      verdict?: PlaceVerdict;
      mapsHref?: string;
      placeId?: string;
      photoUrl?: string;
      lat?: number;
      lng?: number;
    }
  | { id: string; type: 'list'; style: ListStyle; title?: string; items: string[] }
  | { id: string; type: 'map'; stops: MapStop[] }
  | { id: string; type: 'cost'; currency: string; rows: CostRow[]; note?: string }
  | { id: string; type: 'divider' }
  /**
   * Where extra videos live. Rendered as thumbnail cards that open on click,
   * never as inline players: a story shows exactly one moving image, and that is
   * the cover.
   */
  | { id: string; type: 'related'; items: RelatedItem[] };

export type StoryBlockType = StoryBlock['type'];

// ── story ───────────────────────────────────────────────────────────────────

export type StoryStatus = 'Draft' | 'Unlisted' | 'Published' | 'Removed';
export type CoverKind = 'None' | 'Image' | 'Video';
export type StoryTemplate = 'journal' | 'photoEssay' | 'guide' | 'postcard';

export interface StoryAuthor {
  userId: number;
  displayName?: string;
  profilePicture?: string;
}

export interface StoryContributor extends StoryAuthor {
  /** Same words as trips and organizations: admins write, members are credited. */
  role?: 'Admin' | 'Member';
  status?: 'invited' | 'active' | 'declined';
}

/** Wire shape. `bodyJson` is a string; use parseBlocks to get the array. */
export interface AfterStoryDto {
  id: string;
  tripId?: string | null;
  slug?: string | null;
  title: string;
  summary?: string | null;
  destination?: string | null;
  countries?: string[] | null;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  vibe?: string | null;

  coverKind: CoverKind;
  coverImageUrl?: string | null;
  coverVideoProvider?: 'YouTube' | 'Vimeo' | null;
  coverVideoId?: string | null;
  coverVideoThumbUrl?: string | null;

  bodyJson: string;
  template: StoryTemplate;

  status: StoryStatus;
  publishedAt?: string | null;
  readCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;

  author?: StoryAuthor;
  contributors: StoryContributor[];
  /** The story owner, or an admin they added. */
  canEdit: boolean;
  /** The story owner: publishing and appointing admins are theirs alone. */
  isAuthor: boolean;
  /** Invited as a story admin and has not answered yet. Drives the accept prompt. */
  pendingInvite: boolean;
  tripIsPublished: boolean;
}

export interface AfterStorySummaryDto {
  id: string;
  slug?: string | null;
  title: string;
  summary?: string | null;
  destination?: string | null;
  countries?: string[] | null;
  vibe?: string | null;
  travelStartDate?: string | null;

  coverKind: CoverKind;
  coverImageUrl?: string | null;
  coverVideoProvider?: 'YouTube' | 'Vimeo' | null;
  coverVideoId?: string | null;
  coverVideoThumbUrl?: string | null;

  template: StoryTemplate;
  status: StoryStatus;
  publishedAt?: string | null;
  updatedAt: string;
  readCount: number;
  photoCount: number;
  tripId?: string | null;
  /** Engagement for the card. Only rendered when above zero. */
  likeCount: number;
  questionCount: number;
  author?: StoryAuthor;
  /**
   * Editor s choice, or absent. Granted by hand from the admin desk, the same
   * way a trip earns Tripician Verified - there is no score behind it, and that
   * is the point.
   */
  editorsPickAt?: string | null;
}

/**
 * A question on a story, or an answer to one. Answers are the same shape nested
 * one level, never deeper: "ask the person who went" stops being that the moment
 * it becomes a comment thread.
 */
export interface StoryQuestion {
  id: string;
  userId: number;
  displayName?: string;
  profilePicture?: string;
  content: string;
  /** Written by the story owner or an active admin, so the answer carries weight. */
  fromAuthor: boolean;
  createdAt: string;
  updatedAt?: string | null;
  canDelete: boolean;
  answers: StoryQuestion[];
}

/** Navia's suggestion for one block. Never applied without the author accepting. */
export interface StoryPolishResult {
  text: string;
  changed: boolean;
}

/** Counts plus what this viewer has done, so a card needs one request not two. */
export interface StoryReactionSummary {
  likes: number;
  saves: number;
  userLiked: boolean;
  userSaved: boolean;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/**
 * Editor working state. Blocks are held parsed; the service serializes on save.
 * `version` is echoed back so the server can reject a write from a stale tab.
 */
export interface StoryDraft {
  id: string;
  title: string;
  summary: string;
  destination: string;
  countries: string[];
  travelStartDate: string | null;
  travelEndDate: string | null;
  vibe: string | null;
  template: StoryTemplate;
  coverKind: CoverKind;
  coverImageUrl: string | null;
  coverVideoProvider: 'YouTube' | 'Vimeo' | null;
  coverVideoId: string | null;
  coverVideoThumbUrl: string | null;
  blocks: StoryBlock[];
  version: number;
}

// ── limits, mirroring backend AfterStoryLimits ──────────────────────────────

export const STORY_LIMITS = {
  maxBlocks: 120,
  maxTextBlockChars: 4000,
  maxGalleryItems: 20,
  maxPhotosPerStory: 60,
  maxRelatedItems: 8,
  maxCountries: 6,
  maxTitleChars: 160,
  maxSummaryChars: 300,
} as const;

export const STORY_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const STORY_MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';
