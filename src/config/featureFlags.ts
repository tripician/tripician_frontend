// Centralized feature flags for Tripician frontend.
// Toggle features here; components should import FEATURE_FLAGS rather than defining local ENABLE_* constants.
// Changing a flag propagates globally.

export interface FeatureFlags {
  expenses: boolean;        // Trip expenses panel
  comments: boolean;        // Trip comments panel
  docsUpload: boolean;      // Uploading visa / pinned / destination docs
  docsSection: boolean;     // Left nav Docs section (library)
  importExport: boolean;    // Import / Export functionality
  afterStory: boolean;      // After Story: writing and editing (planner tab + standalone editor)
  bookOrdering: boolean;    // Ordering a printed book: checkout, address, fulfilment
}

export const FEATURE_FLAGS: FeatureFlags = {
  expenses: true,
  comments: true,
  docsUpload: false,
  docsSection: true, // keep Docs section visible but internally read-only/on-hold
  importExport: false,
  // On since Stage 2: a story now has a public URL, Open Graph previews and a
  // moderation path, so there is somewhere to publish to.
  //
  // Community discovery (Stage 3) is deliberately still absent. That is the
  // right order: opening a public feed before any stories exist is the classic
  // way to make a new surface read as abandoned. Early authors seed it first.
  afterStory: true,

  /*
   * OFF until payment is live end to end.
   *
   * The book pipeline is complete - render, page preview, order state machine,
   * Gelato - and `BookOrderService.ConfirmAsync` already refuses to produce
   * anything without both preview approval and payment. What does not exist yet
   * is checkout, so nobody can pay.
   *
   * This flag is what stops the marketing copy getting ahead of that. With it
   * off, the landing page and the preview dialog both say the PDF is the
   * finished book and printed copies are not on sale. Turning it on switches
   * that language to ordering. Flip it only once a real payment has completed,
   * because the alternative is a page promising something it cannot deliver.
   */
  bookOrdering: false
};

// Utility predicate (optional convenience)
export const isFeatureEnabled = <K extends keyof FeatureFlags>(k: K): boolean => FEATURE_FLAGS[k];
