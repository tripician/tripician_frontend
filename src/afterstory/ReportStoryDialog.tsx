// Reporting a story. Open to signed-out readers on purpose; the endpoint is rate limited rather than gated.
import React from 'react';
import { useTheme } from '@mui/material';
import ReportDialog from '../components/ui/ReportDialog';
import { afterStoryService } from './afterStoryService';
import { STORY_FIELD_SX } from './storyFormat';

interface ReportStoryDialogProps {
  open: boolean;
  storyId: string;
  onClose: () => void;
}

const ReportStoryDialog: React.FC<ReportStoryDialogProps> = ({ open, storyId, onClose }) => {
  const theme = useTheme();
  return (
    <ReportDialog
      open={open}
      noun="story"
      onClose={onClose}
      fieldSx={STORY_FIELD_SX}
      titleSx={{ fontFamily: theme.custom.fontDisplay }}
      onSubmit={(reason, detail) => afterStoryService.report(storyId, reason, detail)}
    />
  );
};

export default ReportStoryDialog;
