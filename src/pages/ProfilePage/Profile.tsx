import { 
  Box, Typography, Card, CardContent, CircularProgress, 
  Alert, Button, Container, Stack
} from "@mui/material";
import { Refresh, Person } from "@mui/icons-material";
import UserProfileBanner from "./UserProfileBanner";
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
    );
  }

  // ✅ Error state
  if (error) {
    return (
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
    );
  }

  // ✅ If no profile (not authenticated)
  if (!profile) {
    return (
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
    );
  }

  // ✅ Main UI
  return (
    <Box sx={{
      width: "100%", 
      backgroundColor: "background.default",
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
        {/* <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ mt: 2, mb: 3 }}>
            <ProfileBadges />
          </Box>
        </Container> */}

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
            <Box sx={{ width: { xs: '100%', lg: '25vw' }, flexShrink: 0 }}>
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
        </Container>
    </Box>
  );
};

export default Profile;