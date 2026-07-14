// Centralized feature flags for Tripician frontend.
// Toggle features here; components should import FEATURE_FLAGS rather than defining local ENABLE_* constants.
// Changing a flag propagates globally.

export interface FeatureFlags {
  expenses: boolean;        // Trip expenses panel
  comments: boolean;        // Trip comments panel
  docsUpload: boolean;      // Uploading visa / pinned / destination docs
  docsSection: boolean;     // Left nav Docs section (library)
  importExport: boolean;    // Import / Export functionality
}

export const FEATURE_FLAGS: FeatureFlags = {
  expenses: true,
  comments: true,
  docsUpload: false,
  docsSection: true, // keep Docs section visible but internally read-only/on-hold
  importExport: false
};

// Utility predicate (optional convenience)
export const isFeatureEnabled = <K extends keyof FeatureFlags>(k: K): boolean => FEATURE_FLAGS[k];
