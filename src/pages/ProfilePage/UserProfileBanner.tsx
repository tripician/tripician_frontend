import React, { useState } from 'react';
import { Box, Avatar, Typography, IconButton, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuthToken } from '../../hooks/useAuth0Token';

interface UserProfileBannerProps {
  name?: string;
  bio?: string;
  following?: number;
  followers?: number;
  countries?: number;
  avatarUrl?: string;
  backgroundUrl?: string;
  // Custom per-user tint color (hex or rgba). If provided, applies a colorized overlay.
  tintColor?: string;
  onEditClick?: () => void;
  onLogoutClick?: () => void;
}

const ProfileContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  color: 'white',
  width: '100%',
  minHeight: '280px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'flex-start',
  paddingTop: theme.spacing(6),
  paddingLeft: theme.spacing(4),
  paddingRight: theme.spacing(4),
  boxSizing: 'border-box',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
}));

// Theme-aware overlay: dark mode gets a stronger dark gradient; light mode a softer veil
const Overlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.85) 100%)'
    : 'linear-gradient(135deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.55) 100%)',
  // Subtle color tint using primary color at very low alpha to blend brand hue (more visible in light mode)
  boxShadow: theme.palette.mode === 'light'
    ? `inset 0 0 0 1000px rgba( ${parseInt(theme.palette.primary.main.slice(1,3),16)}, ${parseInt(theme.palette.primary.main.slice(3,5),16)}, ${parseInt(theme.palette.primary.main.slice(5,7),16)}, 0.05)`
    : 'none',
  zIndex: 1,
  pointerEvents: 'none'
}));

// Helper to convert a hex (#RRGGBB or #RGB) to rgba string with alpha.
const hexToRgba = (hex: string, alpha: number) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  if (hex.startsWith('rgba')) return hex; // already rgba
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.substring(0,2), 16);
  const g = parseInt(h.substring(2,4), 16);
  const b = parseInt(h.substring(4,6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Color tint layer that sits above the base overlay when a custom tintColor is provided.
const TintLayer = styled(Box)<{ tintcolor: string }>(({ tintcolor }) => ({
  position: 'absolute',
  inset: 0,
  background: `linear-gradient(140deg, ${hexToRgba(tintcolor, 0.45)} 0%, ${hexToRgba(tintcolor, 0.70)} 100%)`,
  mixBlendMode: 'overlay',
  zIndex: 2,
  pointerEvents: 'none'
}));

const ProfileContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(3),
  position: 'relative',
  zIndex: 3,
  flexWrap: 'wrap',
}));

const ProfileAvatar = styled(Avatar)(() => ({
  width: 120,
  height: 120,
  border: '4px solid rgba(255, 255, 255, 0.9)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
}));


const ProfileAvatarWrapper = styled(Box)(() => ({
  position: "relative",
  display: "inline-block",
  "&:hover .avatar-edit-overlay": {
    opacity: 1,
    visibility: "visible",
  },
}));

const AvatarEditOverlay = styled(IconButton)(() => ({
  position: "absolute",
  bottom: 8,
  right: 8,
  backgroundColor: "rgba(0,0,0,0.6)",
  color: "white",
  padding: 6,
  borderRadius: "50%",
  opacity: 0,
  visibility: "hidden",
  transition: "opacity 0.3s ease, visibility 0.3s ease",
  "&:hover": {
    backgroundColor: "rgba(0,0,0,0.8)",
  },
}));

const StatsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(4),
  marginTop: theme.spacing(1),
  flexWrap: 'wrap',
}));

const StatItem = styled(Box)(() => ({
  textAlign: 'left',
}));

const EditButton = styled(IconButton)(() => ({
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 3,
  backgroundColor: 'rgba(0,0,0,0.5)',
  color: 'white',
  '&:hover': {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
}));

// Theme-aware bottom fade to smoothly blend banner into the page background
const BottomFade = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '20vh',
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(to top, ${theme.palette.background.default} 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.15) 60%, transparent 100%)`
    : `linear-gradient(to top, ${theme.palette.background.default} 0%, rgba(255,255,255,0.65) 35%, rgba(255,255,255,0.35) 60%, transparent 100%)`,
  zIndex: 2,
  pointerEvents: 'none',
}));

const LogoutButton = styled(Button)(({ theme }) => ({
  position: 'absolute',
  bottom: 16,
  right: 16,
  zIndex: 3,
  backgroundColor: theme.palette.error.main,
  color: 'primary.contrastText',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
    boxShadow: '0 0 12px rgba(255,0,0,0.8)',
  },
}));

const UserProfileBanner: React.FC<UserProfileBannerProps> = ({
  name = 'Srideep Kar',
  bio = 'Passionate traveler and abstract photographer',
  following = 0,
  followers = 0,
  countries = 0,
  avatarUrl = import.meta.env.VITE_NO_PROFILE_PIC_URL,
  backgroundUrl = 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1500&q=80',
  tintColor,
  onEditClick
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuthToken();
  const navigate = useNavigate();
  
  const onLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', p: 0, m: 0 }}>
      <ProfileContainer sx={{ backgroundImage: `url(${backgroundUrl})` }}>
  <BottomFade />
  <Overlay />
  {tintColor && <TintLayer tintcolor={tintColor} />}

        {/* Action Buttons - Kept in same position */}
        <EditButton onClick={onEditClick}>
          <EditIcon />
        </EditButton>

        <LogoutButton
          startIcon={<LogoutIcon />}
          variant="contained"
          size="medium"
          onClick={onLogoutClick}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </LogoutButton>

        {/* Profile Details */}
  <ProfileContent>
          <ProfileAvatarWrapper>
            <ProfileAvatar src={avatarUrl} alt={`${name}'s profile`} />
            <AvatarEditOverlay
              className="avatar-edit-overlay"
              size="small"
              onClick={onEditClick}
            >
              <EditIcon fontSize="small" />
            </AvatarEditOverlay>
          </ProfileAvatarWrapper>

          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.8rem', md: '2.5rem' },
                mb: 1,
                color: 'white',
              }}
            >
              {name}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                fontSize: '1.1rem',
                opacity: 0.9,
                mb: 2,
                lineHeight: 1.5,
              }}
            >
              {bio}
            </Typography>

            <StatsContainer>
              <StatItem>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {following}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Following
                </Typography>
              </StatItem>

              <StatItem>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {followers}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Followers
                </Typography>
              </StatItem>

              <StatItem>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {countries}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Countries
                </Typography>
              </StatItem>
            </StatsContainer>
          </Box>
        </ProfileContent>
      </ProfileContainer>
    </Box>
  );
};

export default UserProfileBanner;
