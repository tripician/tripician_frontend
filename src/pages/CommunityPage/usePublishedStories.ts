import React from 'react';
import { afterStoryService } from '../../afterstory/afterStoryService';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { createSharedResource } from '../../utils/sharedResource';

// The server caps a page of stories at 48; a search that stopped there could never find the 49th.
const STORY_PAGE = 48;
const STORY_PAGE_LIMIT = 25;

export interface PublishedStoriesState {
  stories: AfterStorySummaryDto[];
  /** True until the first page lands. */
  loading: boolean;
  /** True once every page has been read, so "no story matches" is a real answer. */
  complete: boolean;
}

const publishedStories = createSharedResource<AfterStorySummaryDto[]>(
  [],
  async (emit) => {
    if (!FEATURE_FLAGS.afterStory) return [];
    const all: AfterStorySummaryDto[] = [];
    for (let page = 1; page <= STORY_PAGE_LIMIT; page += 1) {
      let items: AfterStorySummaryDto[] = [];
      let hasMore = false;
      try {
        const r = await afterStoryService.listPublished({ page, pageSize: STORY_PAGE });
        items = Array.isArray(r?.items) ? r.items : [];
        hasMore = Boolean(r?.hasMore);
      } catch {
        // Stories are one part of pages that also show plans, so a failure ends the list rather than the page.
        break;
      }
      all.push(...items);
      emit([...all]);
      if (!hasMore || items.length === 0) break;
    }
    return all;
  },
  { ttlMs: 60_000 },
);

/** Every published story, paged through rather than truncated, painted from the first page. */
export function usePublishedStories(): PublishedStoriesState {
  const snap = React.useSyncExternalStore(publishedStories.subscribe, publishedStories.getSnapshot);
  React.useEffect(() => { void publishedStories.ensure(); }, []);
  return { stories: snap.data, loading: snap.loading, complete: snap.complete };
}
