/**
 * Every network call After Story makes.
 *
 * Uses the shared apiClient rather than its own axios instance: the request
 * interceptor there is what attaches a fresh token, and the response interceptor
 * is what handles a 401 without discarding the Auth0 refresh token. A second
 * instance would silently miss both.
 */

import axios from 'axios';
import { apiClient } from '../services/APIs/apiServices';
import { serializeBlocks } from './blockSchema';
import { toProviderWire } from './videoEmbed';
import type {
  AfterStoryDto,
  AfterStorySummaryDto,
  PagedResult,
  StoryDraft,
  StoryPolishResult,
  StoryQuestion,
  StoryReactionSummary,
  StoryStatus,
  StoryTemplate,
} from './types';
import { STORY_MEDIA_MAX_BYTES } from './types';
import { explainUploadFailure } from './uploadErrors';

/**
 * A failed request, carrying enough for the caller to say something useful.
 * `conflict` and `gone` are called out because they are the two the editor has
 * to handle differently rather than just showing the message.
 */
export class AfterStoryError extends Error {
  readonly status: number;
  readonly conflict: boolean;
  readonly gone: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AfterStoryError';
    this.status = status;
    this.conflict = status === 409;
    this.gone = status === 410;
  }
}

function toError(err: unknown, fallback: string): AfterStoryError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const data = err.response?.data as { message?: string } | undefined;
    const message =
      data?.message ??
      (status === 403
        ? 'You do not have permission to do that.'
        : status === 404
          ? 'That story could not be found.'
          : status === 410
            ? 'This story is no longer available.'
            : status === 0
              ? 'Could not reach the server. Check your connection.'
              : fallback);
    return new AfterStoryError(message, status);
  }
  return new AfterStoryError(fallback, 0);
}

export interface CreateStoryInput {
  title: string;
  tripId?: string | null;
  destination?: string | null;
  countries?: string[] | null;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  vibe?: string | null;
  template?: StoryTemplate;
}

export const afterStoryService = {
  async create(input: CreateStoryInput): Promise<AfterStoryDto> {
    try {
      const { data } = await apiClient.post<AfterStoryDto>('/api/stories', {
        title: input.title,
        tripId: input.tripId ?? null,
        destination: input.destination ?? null,
        countries: input.countries ?? null,
        travelStartDate: input.travelStartDate ?? null,
        travelEndDate: input.travelEndDate ?? null,
        vibe: input.vibe ?? null,
        template: input.template ?? 'journal',
      });
      return data;
    } catch (err) {
      throw toError(err, 'Could not start that story.');
    }
  },

  /** Accepts a slug, a bare id, or a slug ending in one. */
  async get(slugOrId: string): Promise<AfterStoryDto> {
    try {
      const { data } = await apiClient.get<AfterStoryDto>(`/api/stories/${encodeURIComponent(slugOrId)}`);
      return data;
    } catch (err) {
      throw toError(err, 'Could not load that story.');
    }
  },

  /** The story attached to a trip, or null when the trip has none yet. */
  async getForTrip(tripId: string): Promise<AfterStoryDto | null> {
    try {
      const { data } = await apiClient.get<AfterStoryDto>(`/api/stories/for-trip/${tripId}`);
      return data;
    } catch (err) {
      // "No story yet" is the normal state for a trip, not a failure worth
      // surfacing, so it comes back as null and the panel offers to start one.
      if (axios.isAxiosError(err) && err.response?.status === 404) return null;
      throw toError(err, 'Could not load this trip’s story.');
    }
  },

  async listMine(): Promise<AfterStorySummaryDto[]> {
    try {
      const { data } = await apiClient.get<AfterStorySummaryDto[]>('/api/stories/mine');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      throw toError(err, 'Could not load your stories.');
    }
  },

  async listPublished(params: {
    page?: number;
    pageSize?: number;
    vibe?: string | null;
    country?: string | null;
    q?: string | null;
  } = {}): Promise<PagedResult<AfterStorySummaryDto>> {
    const search = new URLSearchParams();
    search.set('page', String(params.page ?? 1));
    search.set('pageSize', String(params.pageSize ?? 12));
    if (params.vibe) search.set('vibe', params.vibe);
    if (params.country) search.set('country', params.country);
    if (params.q) search.set('q', params.q);

    try {
      const { data } = await apiClient.get<PagedResult<AfterStorySummaryDto>>(
        `/api/stories/published?${search.toString()}`,
      );
      return data;
    } catch (err) {
      throw toError(err, 'Could not load stories.');
    }
  },

  async listSaved(): Promise<AfterStorySummaryDto[]> {
    try {
      const { data } = await apiClient.get<AfterStorySummaryDto[]>('/api/stories/saved');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      throw toError(err, 'Could not load your reading list.');
    }
  },

  async listByAuthor(authorUserId: number, take = 12): Promise<AfterStorySummaryDto[]> {
    try {
      const { data } = await apiClient.get<AfterStorySummaryDto[]>(
        `/api/stories/by-author/${authorUserId}?take=${take}`,
      );
      return Array.isArray(data) ? data : [];
    } catch {
      // A profile is still worth rendering without its stories strip, so this
      // degrades to empty rather than failing the page around it.
      return [];
    }
  },

  async getReactions(storyId: string): Promise<StoryReactionSummary> {
    try {
      const { data } = await apiClient.get<StoryReactionSummary>(`/api/stories/${storyId}/reactions`);
      return data;
    } catch {
      return { likes: 0, saves: 0, userLiked: false, userSaved: false };
    }
  },

  async toggleReaction(storyId: string, type: 'like' | 'save'): Promise<StoryReactionSummary> {
    try {
      const { data } = await apiClient.post<StoryReactionSummary>(
        `/api/stories/${storyId}/reactions/${type}`,
      );
      return data;
    } catch (err) {
      throw toError(err, 'Could not save that.');
    }
  },

  async save(draft: StoryDraft): Promise<AfterStoryDto> {
    try {
      const { data } = await apiClient.put<AfterStoryDto>(`/api/stories/${draft.id}`, {
        title: draft.title,
        summary: draft.summary || null,
        destination: draft.destination || null,
        countries: draft.countries.length > 0 ? draft.countries : null,
        travelStartDate: draft.travelStartDate,
        travelEndDate: draft.travelEndDate,
        vibe: draft.vibe,
        template: draft.template,
        coverKind: draft.coverKind,
        coverImageUrl: draft.coverImageUrl,
        coverVideoProvider: draft.coverVideoProvider,
        coverVideoId: draft.coverVideoId,
        coverVideoThumbUrl: draft.coverVideoThumbUrl,
        bodyJson: serializeBlocks(draft.blocks),
        version: draft.version,
      });
      return data;
    } catch (err) {
      throw toError(err, 'Could not save your story.');
    }
  },

  async setStatus(storyId: string, status: StoryStatus): Promise<AfterStoryDto> {
    try {
      const { data } = await apiClient.patch<AfterStoryDto>(`/api/stories/${storyId}/status`, { status });
      return data;
    } catch (err) {
      throw toError(err, 'Could not change who can see this story.');
    }
  },

  /** Pass null to detach the plan. */
  async attachTrip(storyId: string, tripId: string | null): Promise<AfterStoryDto> {
    try {
      const { data } = await apiClient.patch<AfterStoryDto>(`/api/stories/${storyId}/trip`, { tripId });
      return data;
    } catch (err) {
      throw toError(err, 'Could not attach that trip.');
    }
  },

  async remove(storyId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/stories/${storyId}`);
    } catch (err) {
      throw toError(err, 'Could not delete that story.');
    }
  },

  async report(storyId: string, reason: string, detail?: string): Promise<void> {
    try {
      await apiClient.post(`/api/stories/${storyId}/report`, { reason, detail: detail || null });
    } catch (err) {
      throw toError(err, 'Could not send that report.');
    }
  },

  async getQuestions(storyId: string): Promise<StoryQuestion[]> {
    try {
      const { data } = await apiClient.get<StoryQuestion[]>(`/api/stories/${storyId}/questions`);
      return Array.isArray(data) ? data : [];
    } catch {
      // The thread is an addition to the story, not the story. A failure hides
      // the section rather than breaking the page someone came to read.
      return [];
    }
  },

  async ask(storyId: string, content: string, parentId?: string): Promise<StoryQuestion> {
    try {
      const { data } = await apiClient.post<StoryQuestion>(`/api/stories/${storyId}/questions`, {
        content,
        parentId: parentId ?? null,
      });
      return data;
    } catch (err) {
      throw toError(err, 'Could not post that.');
    }
  },

  async deleteQuestion(storyId: string, questionId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/stories/${storyId}/questions/${questionId}`);
    } catch (err) {
      throw toError(err, 'Could not delete that.');
    }
  },

  async addContributor(storyId: string, userId: number): Promise<AfterStoryDto> {
    try {
      const { data } = await apiClient.post<AfterStoryDto>(`/api/stories/${storyId}/contributors`, { userId });
      return data;
    } catch (err) {
      throw toError(err, 'Could not add that person.');
    }
  },

  async removeContributor(storyId: string, userId: number): Promise<AfterStoryDto> {
    try {
      const { data } = await apiClient.delete<AfterStoryDto>(
        `/api/stories/${storyId}/contributors/${userId}`,
      );
      return data;
    } catch (err) {
      throw toError(err, 'Could not remove that person.');
    }
  },

  async respondToInvite(storyId: string, accept: boolean): Promise<AfterStoryDto> {
    try {
      const { data } = await apiClient.patch<AfterStoryDto>(
        `/api/stories/${storyId}/contributors/me?accept=${accept}`,
      );
      return data;
    } catch (err) {
      throw toError(err, 'Could not respond to that invitation.');
    }
  },

  /**
   * Every page of the printed book, as images, in order.
   *
   * Server-side Playwright screenshots of the same document the PDF is rendered
   * from, so this is a proof rather than a mock-up. It is genuinely slow and
   * rate limited: call it when someone asks to see the book, never on mount.
   */
  async getBookPreview(storyId: string): Promise<string[]> {
    try {
      const { data } = await apiClient.get<{ pages: string[] }>(
        `/api/stories/${storyId}/book/preview`,
      );
      return Array.isArray(data?.pages) ? data.pages : [];
    } catch (err) {
      throw toError(err, 'Could not lay out that book.');
    }
  },

  /**
   * Asks Navia to proof-read one passage. Never applies the result: the caller
   * shows it for approval. A 402 means the personal credit wallet is empty.
   */
  async polish(text: string, mode: 'grammar' | 'rephrase'): Promise<StoryPolishResult> {
    try {
      const { data } = await apiClient.post<StoryPolishResult>('/api/navia/story-polish', { text, mode });
      return data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 402) {
        throw new AfterStoryError(
          'You have used all your Navia credits. Top-ups are on the way, see Settings then Credits.',
          402,
        );
      }
      throw toError(err, 'Navia could not check that passage.');
    }
  },

  /**
   * Uploads one photo straight to Cloudinary using a signed payload the server
   * mints only after checking the caller may edit this story. The file never
   * passes through the API.
   */
  async uploadPhoto(storyId: string, file: File): Promise<string> {
    if (file.size > STORY_MEDIA_MAX_BYTES) {
      throw new AfterStoryError(
        `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${STORY_MEDIA_MAX_BYTES / 1024 / 1024}MB.`,
        0,
      );
    }
    if (!file.type.startsWith('image/')) {
      throw new AfterStoryError('Only image files can be added to a story.', 0);
    }

    let signed: {
      folder: string;
      public_id: string;
      timestamp: number;
      signature: string;
      allowed_formats: string;
      apiKey: string;
      cloudName: string;
      uploadUrl: string;
    };

    try {
      const { data } = await apiClient.post(`/api/stories/${storyId}/media/upload-url`, {
        fileName: file.name,
      });
      signed = data;
    } catch (err) {
      throw toError(err, 'Could not prepare that upload.');
    }

    // Every signed field has to be echoed back exactly, or Cloudinary rejects
    // the signature. `allowed_formats` is a real upload parameter, so the format
    // cap is enforced server-side. There is deliberately no size field here:
    // `max_file_size` is an upload-PRESET setting, not an upload parameter, and
    // signing it made every request fail. The size cap is the client check above.
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', signed.apiKey);
    form.append('timestamp', String(signed.timestamp));
    form.append('signature', signed.signature);
    form.append('folder', signed.folder);
    form.append('public_id', signed.public_id);
    form.append('allowed_formats', signed.allowed_formats);

    try {
      const response = await axios.post<{ secure_url?: string; url?: string }>(signed.uploadUrl, form);
      const url = response.data.secure_url ?? response.data.url;
      if (!url) throw new Error('no url returned');
      return url;
    } catch (err) {
      // Cloudinary explains every rejection in { error: { message } }. Discarding
      // it is what made this failure unreportable: the traveller got the same
      // sentence for an oversized file, a HEIC, and an expired signature.
      const response = axios.isAxiosError(err) ? err.response : undefined;
      const body = response?.data as { error?: { message?: string } } | undefined;
      throw new AfterStoryError(
        explainUploadFailure(body?.error?.message, response !== undefined),
        response?.status ?? 0,
      );
    }
  },
};

/** Wire DTO to the editor's working shape. */
export function draftFromDto(dto: AfterStoryDto, blocks: StoryDraft['blocks']): StoryDraft {
  return {
    id: dto.id,
    title: dto.title,
    summary: dto.summary ?? '',
    destination: dto.destination ?? '',
    countries: dto.countries ?? [],
    travelStartDate: dto.travelStartDate ?? null,
    travelEndDate: dto.travelEndDate ?? null,
    vibe: dto.vibe ?? null,
    template: dto.template,
    coverKind: dto.coverKind,
    coverImageUrl: dto.coverImageUrl ?? null,
    coverVideoProvider: dto.coverVideoProvider ?? null,
    coverVideoId: dto.coverVideoId ?? null,
    coverVideoThumbUrl: dto.coverVideoThumbUrl ?? null,
    blocks,
    version: dto.version,
  };
}

/** Sets a video cover from a pasted URL, keeping provider and id split apart. */
export function coverFromVideo(
  draft: StoryDraft,
  parsed: { provider: 'youtube' | 'vimeo'; id: string },
  thumbUrl: string | null,
): StoryDraft {
  return {
    ...draft,
    coverKind: 'Video',
    coverImageUrl: null,
    coverVideoProvider: toProviderWire(parsed.provider),
    coverVideoId: parsed.id,
    coverVideoThumbUrl: thumbUrl,
  };
}
