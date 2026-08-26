/**
 * Every network call the post feature makes.
 *
 * Uses the shared apiClient, so it inherits the token-refresh request interceptor
 * and the 401 handling. A second axios instance would silently miss both.
 */

import axios from 'axios';
import { apiClient } from '../services/APIs/apiServices';
import { uploadSignedAsset, UploadError } from '../utils/signedUpload';
import { POST_LIMITS, PostRejectedError } from './types';
import type {
  PostDraft, PostMediaInput, TravelerPost, PostTagCount, QuestionPage, QuestionSort,
} from './types';

function toError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return new Error(data?.message ?? fallback);
  }
  return new Error(fallback);
}

export const postsService = {
  /**
   * Publishes a post, or throws PostRejectedError with what to tell the author.
   *
   * 422 is the refusal: the request was fine, we will not publish it. The server
   * has already destroyed any pictures by the time this throws, so the composer
   * must clear its own preview rather than offer to retry with the same uploads.
   */
  async create(draft: PostDraft): Promise<TravelerPost> {
    try {
      const { data } = await apiClient.post<TravelerPost>('/api/posts', draft);
      return data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const body = err.response.data as { message?: string; category?: string } | undefined;
        throw new PostRejectedError(
          body?.message ?? 'This could not be posted.',
          body?.category ?? 'other',
        );
      }
      throw toError(err, 'That could not be posted just now.');
    }
  },

  async feed(take = 20, before?: string | null, kind?: 'note' | 'question'): Promise<TravelerPost[]> {
    const params = new URLSearchParams({ take: String(take) });
    if (before) params.set('before', before);
    // Omitted means both kinds, which is what a "what is happening" rail wants.
    if (kind) params.set('kind', kind);
    try {
      const { data } = await apiClient.get<TravelerPost[]>(`/api/posts?${params}`);
      return Array.isArray(data) ? data : [];
    } catch {
      // The feed is one module on a page full of others. It hides rather than
      // taking the page down.
      return [];
    }
  },

  async byAuthor(authorUserId: number, take = 20, before?: string | null): Promise<TravelerPost[]> {
    const params = new URLSearchParams({ take: String(take) });
    // Was omitted, so "show more" on a profile refetched page one and appended it.
    if (before) params.set('before', before);
    try {
      const { data } = await apiClient.get<TravelerPost[]>(
        `/api/posts/by-author/${authorUserId}?${params}`,
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async get(postId: string): Promise<TravelerPost | null> {
    try {
      const { data } = await apiClient.get<TravelerPost>(`/api/posts/${postId}`);
      return data;
    } catch {
      return null;
    }
  },

  async replies(postId: string, take = 50): Promise<TravelerPost[]> {
    try {
      const { data } = await apiClient.get<TravelerPost[]>(`/api/posts/${postId}/replies?take=${take}`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Questions only, filtered and sorted. Paged with a total, unlike the feed:
   * a question list can say how many there are and a live feed cannot.
   */
  async questions(params: {
    q?: string;
    tags?: string[];
    sort?: QuestionSort;
    page?: number;
    pageSize?: number;
  } = {}): Promise<QuestionPage> {
    const search = new URLSearchParams();
    if (params.q?.trim()) search.set('q', params.q.trim());
    if (params.tags?.length) search.set('tags', params.tags.join(','));
    if (params.sort) search.set('sort', params.sort);
    search.set('page', String(params.page ?? 1));
    search.set('pageSize', String(params.pageSize ?? 20));

    const empty: QuestionPage = { items: [], page: 1, pageSize: 20, total: 0, hasMore: false };
    try {
      const { data } = await apiClient.get<QuestionPage>(`/api/posts/questions?${search.toString()}`);
      return Array.isArray(data?.items) ? data : empty;
    } catch {
      return empty;
    }
  },

  /** The curated vocabulary with a live count. The one source of truth for it. */
  async tags(): Promise<PostTagCount[]> {
    try {
      const { data } = await apiClient.get<PostTagCount[]>('/api/posts/tags');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /** 1, -1, or 0 to clear. Returns the new score and the caller's own vote. */
  async vote(postId: string, value: number): Promise<{ score: number; viewerVote: number }> {
    const { data } = await apiClient.post<{ score: number; viewerVote: number }>(
      `/api/posts/${postId}/vote`, { value },
    );
    return data;
  },

  /** Asker only. Sending the same answer again un-accepts it. */
  async accept(questionId: string, answerId: string): Promise<void> {
    await apiClient.post(`/api/posts/${questionId}/accept/${answerId}`);
  },

  async toggleLike(postId: string): Promise<number> {
    const { data } = await apiClient.post<{ likeCount: number }>(`/api/posts/${postId}/like`);
    return data.likeCount;
  },

  async remove(postId: string): Promise<void> {
    await apiClient.delete(`/api/posts/${postId}`);
  },

  /**
   * Uploads one picture and keeps its public id.
   *
   * The id is the point: Cloudinary needs the folder-qualified public id to
   * delete an asset, and nothing can recover it from a delivery URL. Without it,
   * a post refused by moderation would leave its pictures behind forever.
   */
  async uploadPhoto(file: File): Promise<PostMediaInput> {
    const asset = await uploadSignedAsset({
      signUrl: '/api/posts/media/upload-url',
      file,
      maxBytes: POST_LIMITS.maxPhotoBytes,
    });
    return { url: asset.url, publicId: asset.publicId };
  },
};

export { UploadError };
