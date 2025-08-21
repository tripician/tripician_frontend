import { 
  Box, Typography, Card, CardContent, CircularProgress, 
  Alert, Button 
} from "@mui/material";
import UserProfileBanner from "./UserProfileBanner";
import NavigationPanel from "../PageLayout/CommonLayouts/NavigationPanel";
import { useState, useEffect } from "react";
import TopBar from "../PageLayout/CommonLayouts/TopBar";
import ProfileBadges from "./ProfileBadges";
import ProfileDetailsRightCard from "./ProfileDetailsRightCard";
import Dashboard from "../PageLayout/DashboardLayout/Dashboard";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import { fetchUserProfile } from "../../store/userSlice";

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
        <Box sx={{ width: "100%", backgroundColor: "#e1e0e0ff" }}>
          <TopBar selectedMenuItem={selectedMenuItem} />
          <Box 
            sx={{ 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              minHeight: "60vh" 
            }}
          >
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ ml: 2 }}>
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
        <Box sx={{ width: "100vw", backgroundColor: "#e1e0e0ff" }}>
          <TopBar selectedMenuItem={selectedMenuItem} />
          <Box sx={{ p: 3 }}>
            <Alert 
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => dispatch(fetchUserProfile())}>
                  Retry
                </Button>
              }
            >
              <strong>Error loading profile:</strong> {error}
            </Alert>
          </Box>
        </Box>
      </NavigationPanel>
    );
  }

  // ✅ If no profile (not authenticated)
  if (!profile) {
    return (
      <NavigationPanel onMenuItemChange={handleMenuItemChange}>
        <Box sx={{ width: "100vw", backgroundColor: "#e1e0e0ff" }}>
          <TopBar selectedMenuItem={selectedMenuItem} />
          <Box sx={{ p: 3 }}>
            <Alert severity="warning">Please log in to view your profile.</Alert>
          </Box>
        </Box>
      </NavigationPanel>
    );
  }

  // ✅ Main UI
  return (
    <NavigationPanel onMenuItemChange={handleMenuItemChange}>
      <Box sx={{ maxWidth: "100%", backgroundColor: "#e1e0e0ff" }}>
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
        <Box sx={{ px: 2, mt: 1, mb: 1 }}>
          <ProfileBadges />
        </Box>

        <Box sx={{ p: 2 }}>
          <Box 
            sx={{ 
              maxWidth: "100vw",
              display: "flex", 
              gap: 3, 
              flexDirection: { xs: "column", md: "row" }, 
              alignItems: "flex-start" 
            }}
          >
            {/* Left: Dashboard */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                maxWidth: { md: "calc(100% - 340px)" },
                background: "#fff",
                borderRadius: 2,
                boxShadow: 1,
                p: { xs: 1, md: 2 },
                mb: { xs: 2, md: 0 },
              }}
            >
              <Dashboard />
            </Box>

            {/* Right: Profile details */}
            <Box
              sx={{
                width: { xs: "100%", md: "320px" },
                flexShrink: 0,
                background: "#fff",
                borderRadius: 2,
                boxShadow: 1,
                p: 2,
              }}
            >
              <ProfileDetailsRightCard
                title="Profile Details"
                rows={[
                  { label: "Full Name", value: `${profile.fname ?? ""} ${profile.lname ?? ""}` },
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
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => dispatch(fetchUserProfile())}
              disabled={loading}
            >
              Refresh Profile
            </Button>
          </Box>

          {/* Debug info (dev only) */}
          {process.env.NODE_ENV === "development" && (
            <Card sx={{ mt: 3, backgroundColor: "#f5f5f5" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Debug: Raw Profile Data
                </Typography>
                <Box 
                  component="pre" 
                  sx={{ 
                    fontSize: "0.8rem", 
                    overflow: "auto",
                    backgroundColor: "#ffffff",
                    p: 2,
                    borderRadius: 1,
                    border: "1px solid #ddd"
                  }}
                >
                  {JSON.stringify(profile, null, 2)}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </NavigationPanel>
  );
};

export default Profile;
