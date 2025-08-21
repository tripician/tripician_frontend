import { 
  Box, Typography, Card, CardContent, CircularProgress, 
  Alert, Button, Container
} from "@mui/material";
import { Refresh, Person } from "@mui/icons-material";
import UserProfileBanner from "./UserProfileBanner";
import NavigationPanel from "../PageLayout/CommonLayouts/NavigationPanel";
import { useState, useEffect } from "react";
import TopBar from "../PageLayout/CommonLayouts/TopBar";
import ProfileBadges from "./ProfileBadges";
import ProfileDetailsRightCard from "./ProfileDetailsRightCard";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { fetchUserProfile } from "../../store/userSlice";
import ProfileDashboard from "../PageLayout/ProfileLayouts/ProfileDashboard";

const Profile: React.FC = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState("Profile");
  const dispatch = useDispatch<AppDispatch>();

  // ✅ Get user profile from Redux store
  const { profile, loading, error } = useSelector((state: RootState) => state.user);

  // Fetch profile once when component mounts
  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  const handleMenuItemChange = (itemName: string) => {
    setSelectedMenuItem(itemName);
  };

  const formatDate = (dateString?: string) => {
    return dateString ? new Date(dateString).toLocaleDateString() : undefined;
  };

  // ✅ Loading state
  if (loading) {
    return (
      <NavigationPanel onMenuItemChange={handleMenuItemChange}>
        <Box sx={{ 
          width: "100%", 
          backgroundColor: "#f8fafc",
          minHeight: "100vh"
        }}>
          <TopBar selectedMenuItem={selectedMenuItem} />
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
              sx={{ color: "#3b82f6" }}
            />
            <Typography 
              variant="h6" 
              sx={{ 
                color: "#374151",
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
      <NavigationPanel onMenuItemChange={handleMenuItemChange}>
        <Box sx={{ 
          width: "100%", 
          backgroundColor: "#f8fafc",
          minHeight: "100vh"
        }}>
          <TopBar selectedMenuItem={selectedMenuItem} />
          <Container maxWidth="lg" sx={{ pt: 3 }}>
            <Alert 
              severity="error"
              sx={{
                borderRadius: 2,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
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
      <NavigationPanel onMenuItemChange={handleMenuItemChange}>
        <Box sx={{ 
          width: "100%", 
          backgroundColor: "#f8fafc",
          minHeight: "100vh"
        }}>
          <TopBar selectedMenuItem={selectedMenuItem} />
          <Container maxWidth="lg" sx={{ pt: 3 }}>
            <Alert 
              severity="warning"
              sx={{
                borderRadius: 2,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
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
    <NavigationPanel onMenuItemChange={handleMenuItemChange}>
      <Box sx={{ 
        width: "100%", 
        backgroundColor: "#f8fafc",
        minHeight: "100vh"
      }}>
        <TopBar selectedMenuItem={selectedMenuItem} />

        {/* Banner */}
        <UserProfileBanner 
          name={`${profile.fname ?? ""} ${profile.lname ?? ""}`}
          bio={profile.bio}
          following={12}
          followers={12}
          avatarUrl={profile.profilepicture}
          backgroundUrl={profile.coverpicture}
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
              display: "flex", 
              gap: 3, 
              flexDirection: { xs: "column", lg: "row" }, 
              alignItems: "flex-start" 
            }}
          >
            {/* Left: Dashboard */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                width: "100%"
              }}
            >
                  <ProfileDashboard />
            </Box>

            {/* Right: Profile details */}
            <Box
              sx={{
                width: { xs: "100%", lg: "20vw" },
                flexShrink: 0,
              }}
            >
                  <ProfileDetailsRightCard
                    title="Profile Details"
                    rows={[
                      { label: "Email", value: profile.email },
                      { label: "Phone", value: profile.phone },
                      { label: "Country", value: profile.country },
                      { label: "Gender", value: profile.gender },
                      { label: "Date of Birth", value: formatDate(profile.dateOfBirth) },
                      { label: "Facebook", value: profile.facebook },
                      { label: "Twitter", value: profile.twitter },
                      { label: "Instagram", value: profile.instagram },
                      { label: "Website", value: profile.website }
                    ]}
                  />
            </Box>
          </Box>

          {/* Refresh Button */}
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center", 
            mt: 4 
          }}>
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
                borderColor: "#d1d5db",
                color: "#374151",
                "&:hover": {
                  borderColor: "#9ca3af",
                  backgroundColor: "#f9fafb"
                },
                "&:disabled": {
                  opacity: 0.6
                }
              }}
            >
              {loading ? "Refreshing..." : "Refresh Profile"}
            </Button>
          </Box>

          {/* Debug info (dev only) */}
          {process.env.NODE_ENV === "development" && (
            <Card sx={{ 
              mt: 4, 
              borderRadius: 2,
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e5e7eb",
              backgroundColor: "#fef3c7"
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    color: "#92400e",
                    fontWeight: 600,
                    fontSize: "1.1rem"
                  }}
                >
                  🔧 Debug: Raw Profile Data
                </Typography>
                <Box 
                  component="pre" 
                  sx={{ 
                    fontSize: "0.8rem", 
                    overflow: "auto",
                    backgroundColor: "#ffffff",
                    p: 2,
                    borderRadius: 1.5,
                    border: "1px solid #d1d5db",
                    maxHeight: "400px",
                    fontFamily: "Monaco, 'Cascadia Code', 'Roboto Mono', monospace"
                  }}
                >
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