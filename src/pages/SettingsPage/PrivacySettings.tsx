import React, { useState, useEffect, useCallback } from "react";
import { useAuthToken } from '../../hooks/useAuth0Token';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Select,
  MenuItem,
  FormControl,
  type SelectChangeEvent,
} from "@mui/material";
import { KeyboardArrowDown } from "@mui/icons-material";

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

const PrivacySettings: React.FC = () => {
  // Visibility enum values align with backend: Public | Private | FriendsOnly
  const [profileVisibility, setProfileVisibility] = useState("Public");
  const [privacySettings, setPrivacySettings] = useState<PrivacySetting[]>([
    {
      id: "show_travel_history",
      title: "Show Travel History",
      description: "Display your visited countries and trips",
      enabled: true,
    },
    {
      id: "show_contact_information",
      title: "Show Contact Information",
      description: "Allow others to see your contact details",
      enabled: false,
    },
    {
      id: "allow_direct_messages",
      title: "Allow Direct Messages",
      description: "Let other travelers send you messages",
      enabled: true,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null); // key currently saving
  const [error, setError] = useState<string | null>(null);

  // Reactive auth token (ensures re-fetch once token resolves after login)
  const { token: authToken } = useAuthToken();

  // Fetch initial privacy settings from backend
  const fetchPrivacy = useCallback(async () => {
    if(!authToken) return;
    setLoading(true); setError(null);
    try {
      const { apiServices } = await import('../../services/APIs/apiServices');
      // Log full request target before calling endpoint
      const base = import.meta.env.VITE_API_BASE_URL;
      const path = '/api/profile/settings/privacy';
      console.log('[PrivacySettings] GET privacy settings', { base, path, fullUrl: base.replace(/\/$/, '') + path });
      const resp = await apiServices.getPrivacySettings(authToken);
      const data = resp.data || {};
      // Support both camelCase & PascalCase names from JSON serializer
      const pick = (d:any, a:string, b:string) => d?.[a] !== undefined ? d[a] : d?.[b];
      // Backend property appears as Visibility (may be object or string). Accept nested or string.
      const rawVisibility = pick(data, 'visibility', 'Visibility');
      let pv = profileVisibility;
      if(typeof rawVisibility === 'string') {
        // Accept legacy lowercase values and normalize to proper enum
        const norm = rawVisibility.toLowerCase();
        pv = norm === 'public' ? 'Public' : norm === 'private' ? 'Private' : norm === 'friendsonly' || norm === 'friends' ? 'FriendsOnly' : profileVisibility;
      } else if(rawVisibility && typeof rawVisibility.View === 'string') {
        const v = rawVisibility.View;
        pv = ['Public','Private','FriendsOnly'].includes(v) ? v : pv;
      }
      const mapped: PrivacySetting[] = [
        {
          id: 'show_travel_history',
          title: 'Show Travel History',
          description: 'Display your visited countries and trips',
          enabled: !!pick(data, 'showTravelHistory', 'ShowTravelHistory'),
        },
        {
          id: 'show_contact_information',
          title: 'Show Contact Information',
          description: 'Allow others to see your contact details',
          enabled: !!pick(data, 'showContactInfo', 'ShowContactInfo'),
        },
        {
          id: 'allow_direct_messages',
          title: 'Allow Direct Messages',
          description: 'Let other travelers send you messages',
          enabled: !!pick(data, 'allowDirectMessages', 'AllowDirectMessages'),
        },
      ];
      setProfileVisibility(pv);
      setPrivacySettings(mapped);
    } catch(err:any){
      if(err?.response){
        console.error('[PrivacySettings] GET privacy settings failed', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
      } else {
        console.error('[PrivacySettings] GET privacy settings error', err);
      }
      setError('Failed to load privacy settings');
    } finally { setLoading(false); }
  }, [authToken, profileVisibility]);

  useEffect(()=> { fetchPrivacy(); }, [fetchPrivacy]);

  const handleVisibilityChange = async (event: SelectChangeEvent) => {
    const newVal = event.target.value; // Expect one of Public | Private | FriendsOnly
    setProfileVisibility(newVal);
    if(!authToken) return;
    setSaving('profileVisibility'); setError(null);
    try {
      const { apiServices } = await import('../../services/APIs/apiServices');
      // Build full model using latest toggles
      const current = buildModel(newVal, privacySettings);
      const base = import.meta.env.VITE_API_BASE_URL;
      console.log('[PrivacySettings] PATCH privacy settings', { base, path: '/api/profile/settings/privacy', payload: current });
      await apiServices.updatePrivacySettings(authToken, current);
    } catch(err:any) {
      if(err?.response){
        console.error('[PrivacySettings] PATCH visibility failed', {
          status: err.response.status,
          data: err.response.data
        });
      } else {
        console.error('[PrivacySettings] PATCH visibility error', err);
      }
      setError('Failed to update visibility');
    }
    finally { setSaving(null); }
  };

  const handlePrivacyToggle = async (id: string) => {
    setPrivacySettings(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
    if(!authToken) return;
    setSaving(id); setError(null);
    try {
      const { apiServices } = await import('../../services/APIs/apiServices');
      const nextSettings = privacySettings.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
      const model = buildModel(profileVisibility, nextSettings);
      const base = import.meta.env.VITE_API_BASE_URL;
      console.log('[PrivacySettings] PATCH toggle setting', { base, path: '/api/profile/settings/privacy', payload: model });
      await apiServices.updatePrivacySettings(authToken, model);
    } catch(err:any) {
      if(err?.response){
        console.error('[PrivacySettings] PATCH toggle failed', {
          status: err.response.status,
          data: err.response.data
        });
      } else {
        console.error('[PrivacySettings] PATCH toggle error', err);
      }
      setError('Failed to update setting');
    }
    finally { setSaving(null); }
  };

  // Helper to build backend update model (PascalCase keys)
  const buildModel = (visibility: string, settings: PrivacySetting[]) => {
    const find = (id:string)=> settings.find(s=> s.id===id)?.enabled || false;
    // Map to backend expected PascalCase property names (Visibility, ShowTravelHistory, ShowContactInfo, AllowDirectMessages)
    return {
      Visibility: visibility,
      ShowTravelHistory: find('show_travel_history'),
      ShowContactInfo: find('show_contact_information'),
      AllowDirectMessages: find('allow_direct_messages')
    };
  };


  const PrivacyItem = ({ 
    item, 
    onToggle 
  }: { 
    item: PrivacySetting; 
    onToggle: (id: string) => void;
  }) => (
    <Box sx={{ mb: 3, '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 500, 
              color: 'text.primary',
              mb: 0.5,
              fontSize: '0.95rem'
            }}
          >
            {item.title}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              fontSize: '0.875rem',
              lineHeight: 1.4
            }}
          >
            {item.description}
          </Typography>
        </Box>
        <Switch
          checked={item.enabled}
          onChange={() => onToggle(item.id)}
          disabled={saving===item.id || loading}
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: '#3b82f6' },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#3b82f6' },
            '& .MuiSwitch-track': { backgroundColor: '#d1d5db' },
            opacity: (saving===item.id || loading) ? 0.6 : 1
          }}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: "100%"}}>
      {/* Profile Privacy Section */}
      <Card
        sx={{
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: '0.95rem', mb: 4, color: 'text.primary', letterSpacing: '-0.01em' }}>
            Profile Privacy
          </Typography>

          {/* Profile Visibility */}
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                fontWeight: 500, 
                color: 'text.primary',
                mb: 1.5,
                fontSize: '0.95rem'
              }}
            >
              Profile Visibility
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={profileVisibility}
                onChange={handleVisibilityChange}
                IconComponent={KeyboardArrowDown}
                disabled={saving==='profileVisibility' || loading}
                MenuProps={{
                  PaperProps: {
                    sx: (theme) => ({
                      backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
                      borderRadius: 2,
                      mt: 1,
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 4px 18px -2px rgba(0,0,0,0.6)'
                        : '0 6px 20px -2px rgba(0,0,0,0.15)',
                      '& .MuiMenuItem-root': {
                        fontSize: '0.85rem',
                        '&.Mui-selected': {
                          backgroundColor: (theme.palette.mode === 'dark'
                            ? theme.palette.primary.dark
                            : theme.palette.primary.light) + '22',
                        },
                        '&:hover': {
                          backgroundColor: (theme.palette.mode === 'dark'
                            ? theme.palette.primary.dark
                            : theme.palette.primary.light) + '33',
                        }
                      }
                    })
                  }
                }}
                sx={(theme) => ({
                  borderRadius: 1.5,
                  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f9fafb',
                  '& .MuiSelect-select': {
                    py: 1.1,
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.mode === 'dark' ? theme.palette.divider : '#d1d5db',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.mode === 'dark' ? theme.palette.text.secondary : '#9ca3af',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 1.5,
                  },
                  transition: 'background-color .25s ease, border-color .25s ease'
                })}
              >
                <MenuItem value="Public">Public - Anyone can see your profile</MenuItem>
                <MenuItem value="FriendsOnly">Friends - Only friends can see your profile</MenuItem>
                <MenuItem value="Private">Private - Only you can see your profile</MenuItem>
              </Select>
            </FormControl>
            {error && (
              <Typography variant="caption" color="error" sx={{ mt:1 }}>{error}</Typography>
            )}
          </Box>

          {/* Privacy Settings */}
          {loading ? (
            <Typography variant="body2" color="text.secondary">Loading privacy settings...</Typography>
          ) : (
            privacySettings.map((item) => (
              <PrivacyItem 
                key={item.id}
                item={item} 
                onToggle={handlePrivacyToggle}
              />
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PrivacySettings;