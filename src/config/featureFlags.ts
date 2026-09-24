// Centralized feature flags for Tripician frontend.
// Toggle features here; components should import FEATURE_FLAGS rather than defining local ENABLE_* constants.
// Changing a flag propagates globally.

export interface FeatureFlags {
  comments: boolean;        // Trip comments panel
  afterStory: boolean;      // After Story: writing and editing (planner tab + standalone editor)
  bookOrdering: boolean;    // Ordering a printed book: checkout, address, fulfilment
}

export const FEATURE_FLAGS: FeatureFlags = {
  comments: true,
  afterStory: true,
  bookOrdering: false,
};

export const isFeatureEnabled = <K extends keyof FeatureFlags>(k: K): boolean => FEATURE_FLAGS[k];
