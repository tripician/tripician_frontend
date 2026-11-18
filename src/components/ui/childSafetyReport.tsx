import React from 'react';
import { Typography } from '@mui/material';

/**
 * The child safety report reason, the same string the backend's report
 * endpoints accept (AdminModel.ChildSafety.ReportReason). A report with it
 * alerts Tripician's child safety contact at once and goes to /admin/child-safety.
 */
export const CHILD_SAFETY_REASON = 'child_safety';
export const CHILD_SAFETY_LABEL = 'Child safety: a minor at risk';

/** Shown under the form when that reason is picked: what to do, and what not to send. */
export const ChildSafetyReportNote: React.FC = () => (
  <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 1.5, lineHeight: 1.5 }}>
    We review these first. Describe what you saw, but don't attach, save or share any images.
    If a child is in immediate danger, contact local emergency services now.
  </Typography>
);
