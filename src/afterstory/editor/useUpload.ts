/**
 * Photo upload state for one editor surface.
 *
 * Lives in its own file rather than beside the components that use it because a
 * module that exports both components and hooks defeats React fast refresh, and
 * the editor is exactly where a lost-state-on-save-file reload hurts most.
 */

import React from 'react';

export interface UploadState {
  busy: boolean;
  error: string | null;
  /** Uploads one file and hands the resulting URL to `apply` on success. */
  pick: (file: File, apply: (url: string) => void) => Promise<void>;
}

export function useUpload(onUpload: (file: File) => Promise<string>): UploadState {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pick = React.useCallback(
    async (file: File, apply: (url: string) => void) => {
      setBusy(true);
      setError(null);
      try {
        apply(await onUpload(file));
      } catch (err) {
        // The service already turns size, type and network failures into
        // sentences worth reading, so this passes them straight through.
        setError(err instanceof Error ? err.message : 'That image could not be uploaded.');
      } finally {
        setBusy(false);
      }
    },
    [onUpload],
  );

  return { busy, error, pick };
}
