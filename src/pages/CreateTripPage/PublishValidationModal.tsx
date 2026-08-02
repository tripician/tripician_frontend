import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';

export interface PublishChecks {
  hasTitle: boolean;
  hasDescription: boolean;
  allDatesCovered: boolean;
  wordCount: number;
  expectedNights: number;
  coveredNights: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  checks: PublishChecks;
}

const CheckRow: React.FC<{ passed: boolean; label: string; helperText?: string }> = ({
  passed,
  label,
  helperText,
}) => (
  <ListItem disablePadding sx={{ py: 0.75 }}>
    <ListItemIcon sx={{ minWidth: 36 }}>
      {passed ? (
        <CheckCircleRoundedIcon sx={{ color: '#2e7d32', fontSize: 22 }} />
      ) : (
        <CancelRoundedIcon sx={{ color: '#d32f2f', fontSize: 22 }} />
      )}
    </ListItemIcon>
    <ListItemText
      primary={
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ color: passed ? 'text.primary' : '#c62828', lineHeight: 1.4 }}
        >
          {label}
        </Typography>
      }
      secondary={
        helperText ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {helperText}
          </Typography>
        ) : undefined
      }
    />
  </ListItem>
);

const PublishValidationModal: React.FC<Props> = ({ open, onClose, checks }) => {
  const allPassed = checks.hasTitle && checks.hasDescription && checks.allDatesCovered;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          px: 0.5,
          py: 0.5,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: 17,
          pb: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {allPassed ? 'Ready to Publish' : 'Almost there!'}
      </DialogTitle>

      <DialogContent sx={{ pt: 0.5, pb: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {allPassed
            ? 'All checks passed. You can go ahead and publish your trip.'
            : 'Complete the following before publishing your trip.'}
        </Typography>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            px: 1,
            py: 0.5,
            bgcolor: 'background.paper',
          }}
        >
          <List dense disablePadding>
            <CheckRow
              passed={checks.hasTitle}
              label="Trip has a title"
              helperText={
                !checks.hasTitle
                  ? 'Add a meaningful title to your trip (not "Untitled Trip").'
                  : undefined
              }
            />

            <CheckRow
              passed={checks.hasDescription}
              label="Description has at least 10 words"
              helperText={
                !checks.hasDescription
                  ? `Currently ${checks.wordCount} ${checks.wordCount === 1 ? 'word' : 'words'} - add ${10 - checks.wordCount} more.`
                  : undefined
              }
            />

            <CheckRow
              passed={checks.allDatesCovered}
              label="All trip days are planned"
              helperText={
                !checks.allDatesCovered
                  ? checks.expectedNights === 0
                    ? 'Set your trip start and end dates first.'
                    : `${checks.coveredNights} of ${checks.expectedNights} ${checks.expectedNights === 1 ? 'night' : 'nights'} covered - plan the remaining days.`
                  : undefined
              }
            />
          </List>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1.5 }}>
        <Button
          onClick={onClose}
          variant="contained"
          disableElevation
          sx={{
            borderRadius: '20px',
            textTransform: 'none',
            fontWeight: 700,
            px: 2.5,
                      }}
        >
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PublishValidationModal;
