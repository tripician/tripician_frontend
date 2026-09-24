import React from 'react';
import { Avatar, Box, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import { groupHomePath } from './groupLogic';
import type { Organization } from './types';

// The groups you belong to, one tap away. Held in component state, never a module cache, so one account's groups never show to the next.
const YourGroupsStrip: React.FC = () => {
  const theme = useTheme();
  const { token } = useAuthToken();
  const [groups, setGroups] = React.useState<Organization[]>([]);

  React.useEffect(() => {
    if (!token) { setGroups([]); return; }
    let active = true;
    apiServices.getMyOrganizations(token)
      .then((r) => { if (active) setGroups(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (active) setGroups([]); });
    return () => { active = false; };
  }, [token]);

  if (groups.length === 0) return null;

  return (
    <Box component="section" aria-label="Your groups" sx={{ mt: { xs: 2.5, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 1 }}>
        <Typography variant="overline" component="h2" sx={{ color: 'text.secondary' }}>Your groups</Typography>
        <Box component={RouterLink} to="/groups" sx={{ typography: 'caption', fontWeight: 700, color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
          See all
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5,
          mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 },
          scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {groups.map((g) => (
          <Box
            key={g.id}
            component={RouterLink}
            to={groupHomePath(g.id)}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1, flexShrink: 0,
              height: 40, pl: 0.5, pr: 1.75, borderRadius: 999,
              border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper',
              color: 'text.primary', textDecoration: 'none',
              '&:hover': { borderColor: 'text.disabled' },
              '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
            }}
          >
            <Avatar src={g.logoUrl ?? undefined} variant="rounded" alt="" sx={{ width: 30, height: 30, borderRadius: '9px', bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
              {g.name.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, maxWidth: 200 }}>{g.name}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default YourGroupsStrip;
