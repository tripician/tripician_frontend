import React from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';

const TripComments: React.FC = () => {
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant='body2' color='text.secondary'>Comments (coming soon – collaborate with your travel partners)</Typography>
      <TextField
        multiline
        minRows={3}
        placeholder='Add a comment...'
        variant='outlined'
        size='small'
        sx={{
          '& .MuiOutlinedInput-root': { borderRadius: 2 }
        }}
      />
      <Button variant='contained' size='small' sx={{ alignSelf: 'flex-end', textTransform: 'none', borderRadius: 2 }}>Post</Button>
    </Box>
  );
};

export default TripComments;
