import { 
  Box, Typography, Card, CardContent, CircularProgress, 
  Alert, Button, Container, Stack
} from "@mui/material";
import { Refresh, Person } from "@mui/icons-material";
import UserProfileBanner from "./UserProfileBanner";
import NavigationPanel from "../PageLayout/CommonLayouts/NavigationPanel";
import { useEffect } from "react";
import TopBar from "../PageLayout/CommonLayouts/TopBar";
import ProfileBadges from "./ProfileBadges";
import ProfileDetailsRightCard from "./ProfileDetailsRightCard";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { fetchUserProfile, clearUser } from "../../store/userSlice";
import { useNavigate } from 'react-router-dom';
import ProfileDashboard from "../PageLayout/ProfileLayouts/ProfileDashboard";

const Profile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // ✅ Get user profile from Redux store
  const { profile, loading, error } = useSelector((state: RootState) => state.user);

  // Fetch profile once when component mounts
  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  // NOTE: Removed temporary top-level profile tabs to honor existing internal navigation (RecentPosts / TravelMap / Statistics) inside ProfileDashboard.

  const formatDate = (dateString?: string) => {
    return dateString ? new Date(dateString).toLocaleDateString() : undefined;
  };

  // ✅ Loading state
  if (loading) {
    return (
      <NavigationPanel>
        <Box sx={{ 
          width: "100%", 
          backgroundColor: "background.default",
          minHeight: "100vh"
        }}>
          <TopBar />
          <Box 
            sx={{ 
              display: "flex", 
              flexDirection: "column",
              justifyContent: "center", 
              alignItems: "center", 
              minHeight: "60vh",
              gap: 2
            }}
          >
            <CircularProgress 
              size={48} 
              sx={{ color: "primary.main" }}
            />
            <Typography 
              variant="h6" 
              sx={{ 
                color: "text.primary",
                fontWeight: 500
              }}
            >
              Loading profile...
            </Typography>
          </Box>
        </Box>
      </NavigationPanel>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <NavigationPanel>
        <Box sx={{ 
          width: "100%", 
          backgroundColor: "background.default",
          minHeight: "100vh"
        }}>
          <TopBar />
          <Container maxWidth="lg" sx={{ pt: 3 }}>
            <Alert 
              severity="error"
              sx={{
                borderRadius: 2,
                boxShadow: 1
              }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => dispatch(fetchUserProfile())}
                  sx={{ fontWeight: 500 }}
                >
                  Retry
                </Button>
              }
            >
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Error loading profile:
              </Typography>
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
          </Container>
        </Box>
      </NavigationPanel>
    );
  }

  // ✅ If no profile (not authenticated)
  if (!profile) {
    return (
      <NavigationPanel>
        <Box sx={{ 
          width: "100%", 
          backgroundColor: "background.default",
          minHeight: "100vh"
        }}>
          <TopBar />
          <Container maxWidth="lg" sx={{ pt: 3 }}>
            <Alert 
              severity="warning"
              sx={{
                borderRadius: 2,
                boxShadow: 1
              }}
              icon={<Person />}
            >
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Please log in to view your profile.
              </Typography>
            </Alert>
          </Container>
        </Box>
      </NavigationPanel>
    );
  }

  // ✅ Main UI
  return (
    <NavigationPanel>
      <Box sx={{ 
        width: "100%", 
        backgroundColor: "background.default",
        minHeight: "100vh"
      }}>
        <TopBar />

        {/* Banner */}
        <UserProfileBanner
          name={`${profile.fname ?? ""} ${profile.lname ?? ""}`}
          bio={profile.bio}
          following={12}
            followers={34}
          countries={32}
          avatarUrl={profile.profilepicture}
          backgroundUrl={profile.coverpicture}
          tintColor={profile.bannertint}
        />
        {/* Badges */}
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ mt: 2, mb: 3 }}>
            <ProfileBadges />
          </Box>
        </Container>

        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 }, pb: 4 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 3, 
              flexDirection: { xs: 'column', lg: 'row' }, 
              alignItems: 'flex-start' 
            }}
          >
            {/* Left: Dashboard (contains its own nav) */}
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <ProfileDashboard />
            </Box>

            {/* Right: Profile details */}
            <Box sx={{ width: { xs: '100%', lg: '20vw' }, flexShrink: 0 }}>
              <ProfileDetailsRightCard
                title="Profile Details"
                rows={[
                  { label: 'Email', value: profile.email },
                  { label: 'Phone', value: profile.phone },
                  { label: 'Country', value: profile.country },
                  { label: 'Gender', value: profile.gender },
                  { label: 'Date of Birth', value: formatDate(profile.dateOfBirth) },
                  { label: 'Facebook', value: profile.facebook },
                  { label: 'Twitter', value: profile.twitter },
                  { label: 'Instagram', value: profile.instagram },
                  { label: 'Website', value: profile.website }
                ]}
              />
            </Box>
          </Box>

          {/* Refresh Button */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mt: 4 }}>
            <Button 
              variant="outlined" 
              startIcon={<Refresh />}
              onClick={() => dispatch(fetchUserProfile())}
              disabled={loading}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                px: 3,
                py: 1.5,
                borderRadius: 2,
                borderColor: "divider",
                color: "text.primary",
                backgroundColor: 'background.paper',
                '&:hover': { borderColor: 'primary.main', backgroundColor: 'background.default' },
                '&:disabled': { opacity: 0.6 }
              }}
            >
              {loading ? "Refreshing..." : "Refresh Profile"}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                dispatch(clearUser());
                navigate('/signin');
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': { boxShadow: 2 }
              }}
            >
              Log out
            </Button>
          </Stack>
          {/* Debug info (dev only) */}
          {process.env.NODE_ENV === 'development' && (
            <Card sx={{ mt: 4, borderRadius: 2, boxShadow: 1, border: 1, borderColor: 'divider', backgroundColor: 'warning.light' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'warning.dark', fontWeight: 600, fontSize: '1.1rem' }}>
                  🔧 Debug: Raw Profile Data
                </Typography>
                <Box component="pre" sx={{ fontSize: '0.8rem', overflow: 'auto', backgroundColor: 'background.paper', p: 2, borderRadius: 1.5, border: 1, borderColor: 'divider', maxHeight: '400px', fontFamily: "Monaco, 'Cascadia Code', 'Roboto Mono', monospace" }}>
                  {JSON.stringify(profile, null, 2)}
                </Box>
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>
    </NavigationPanel>
  );
};

export default Profile;