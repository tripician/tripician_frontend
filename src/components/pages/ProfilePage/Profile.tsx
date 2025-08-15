import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress, 
  Alert, 
  Button, 
  Grid, 
  ImageList, 
  ImageListItem 
} from "@mui/material";
import UserProfileBanner from "./UserProfileBanner";
import NavigationPannel from "../PageLayout/CommonLayouts/NavigationPannel";
import { useState, useEffect } from "react";
import TopBar from "../PageLayout/CommonLayouts/TopBar";
import { useAuthToken } from '../../../hooks/useAuth0Token';
import { apiServices } from '../../../services/APIs/ApiServices';
import ProfileBadges from "./ProfileBadges";
import ProfileDetailsRightCard from "./ProfileDetailsRightCard";

// Define interface for profile data
interface UserProfileData {
  id?: string;
  email?: string;
  name?: string; 
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  bio?: string;
  // Add other fields based on your backend response
}

const Profile: React.FC = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState('Profile');
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleMenuItemChange = (itemName: string) => {
    setSelectedMenuItem(itemName);
  };
  
  const { getToken, isAuthenticated, loading: authLoading, logout } = useAuthToken();

  // Helper function for date formatting
  const formatDate = (dateString?: string) => {
    return dateString ? new Date(dateString).toLocaleDateString() : undefined;
  };

  // Fetch profile data function
  const fetchProfileData = async () => {
    if (!isAuthenticated || authLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await apiServices.getUserProfile(token);
      setProfileData(response.data);
    } catch (error: any) {
      let errorMessage = 'Failed to fetch profile';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Redirecting to login...';
        return;
      } else if (error.response?.status === 404) {
        errorMessage = 'Profile not found.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message === 'No authentication token found') {
        errorMessage = 'Authentication required. Please log in.';
        logout();
        return;
      }
      
      setError(errorMessage);
      console.error('Profile fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch profile data when component mounts or auth state changes
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchProfileData();
    }
  }, [isAuthenticated, authLoading]);

  // Refetch function for retry button
  const refetch = () => {
    fetchProfileData();
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <NavigationPannel onMenuItemChange={handleMenuItemChange}>
        <Box sx={{ width: "100%", backgroundColor: "#e1e0e0ff" }}>
          <TopBar selectedMenuItem={selectedMenuItem} />
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '60vh' 
            }}
          >
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading profile...
            </Typography>
          </Box>
        </Box>
      </NavigationPannel>
    );
  }

  // Error state
  if (error) {
    const isAuthError = error.includes('session has expired') || error.includes('Authentication required');
    
    return (
      <NavigationPannel onMenuItemChange={handleMenuItemChange}>
        <Box sx={{ width: "100%", backgroundColor: "#e1e0e0ff" }}>
          <TopBar selectedMenuItem={selectedMenuItem} />
          <Box sx={{ p: 3 }}>
            <Alert 
              severity={isAuthError ? "warning" : "error"}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {isAuthError && (
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={() => logout()}
                    >
                      Login Again
                    </Button>
                  )}
                  {!isAuthError && (
                    <Button color="inherit" size="small" onClick={() => refetch()}>
                      Retry
                    </Button>
                  )}
                </Box>
              }
            >
              {isAuthError ? (
                <>
                  <strong>Authentication Issue:</strong> {error}
                </>
              ) : (
                <>
                  <strong>Error loading profile:</strong> {error}
                </>
              )}
            </Alert>
          </Box>
        </Box>
      </NavigationPannel>
    );
  }

  // Authentication check
  if (!isAuthenticated) {
    return (
      <NavigationPannel onMenuItemChange={handleMenuItemChange}>
        <Box sx={{ width: "100%", backgroundColor: "#e1e0e0ff" }}>
          <TopBar selectedMenuItem={selectedMenuItem} />
          <Box sx={{ p: 3 }}>
            <Alert severity="warning">
              Please log in to view your profile.
            </Alert>
          </Box>
        </Box>
      </NavigationPannel>
    );
  }

  return (
    <NavigationPannel onMenuItemChange={handleMenuItemChange}>
      <Box sx={{ width: "100%", backgroundColor: "#e1e0e0ff" }}>
        <TopBar selectedMenuItem={selectedMenuItem} />
        
        {/* UserProfileBanner - Edit/Logout buttons remain in same position */}
        <UserProfileBanner />
        
        {/* Profile Badges */}
        <Box sx={{ px: 2, mt: 1, mb: 1 }}>
          <ProfileBadges />
        </Box>
        
        <Box sx={{ p: 2 }}>

          {/* Two-column section using Box instead of Grid if Grid causes issues */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Left column: "Your Contributions" gallery */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Your Contributions
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    See your trip reviews and shared itineraries
                  </Typography>

                  {/* Image tiles to mimic the mock */}
                  <ImageList cols={3} gap={8} sx={{ m: 0, overflow: "hidden" }}>
                    {[
                      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop",
                      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=800&auto=format&fit=crop",
                      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop",
                      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=800&auto=format&fit=crop",
                      "https://images.unsplash.com/photo-1500043357865-c6b8827edf2a?q=80&w=800&auto=format&fit=crop",
                      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=800&auto=format&fit=crop",
                    ].map((src, i) => (
                      <ImageListItem key={i}>
                        <img 
                          src={src} 
                          alt={`contrib-${i}`} 
                          loading="lazy" 
                          style={{ borderRadius: 8 }} 
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </CardContent>
              </Card>

              {/* Recent Reviews block */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Reviews
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Great hike with stunning reviews along the way
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", maxWidth: 360 }}>
                      <img
                        src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=300&auto=format&fit=crop"
                        alt="review-1"
                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }}
                      />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          April 3, 2024
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          Great hike with stunning views
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Great hike with stunning views along the way
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", maxWidth: 360 }}>
                      <img
                        src="https://images.unsplash.com/photo-1500043357865-c6b8827edf2a?q=80&w=300&auto=format&fit=crop"
                        alt="review-2"
                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }}
                      />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          March 20, 2024
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          Incredible city with much history
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Incredible city with much history to explore!
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Right column: Profile Details card */}
            <Box sx={{ width: { xs: '100%', md: '300px' }, flexShrink: 0 }}>
              <ProfileDetailsRightCard
                title="Profile Details"
                rows={[
                  { label: "Full Name", value: profileData?.name },
                  { label: "Email", value: profileData?.email },
                  { label: "Phone", value: profileData?.phone },
                  { label: "Country", value: profileData?.country },
                  { label: "Gender", value: profileData?.gender },
                  { label: "Date of Birth", value: formatDate(profileData?.dateOfBirth) },
                ]}
              />
            </Box>
          </Box>

          {/* Refresh Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh Profile
            </Button>
          </Box>

          {/* Debug Information - Remove in production */}
          {process.env.NODE_ENV === 'development' && profileData && (
            <Card sx={{ mt: 3, backgroundColor: '#f5f5f5' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Debug: Raw Profile Data
                </Typography>
                <Box 
                  component="pre" 
                  sx={{ 
                    fontSize: '0.8rem', 
                    overflow: 'auto',
                    backgroundColor: '#ffffff',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid #ddd'
                  }}
                >
                  {JSON.stringify(profileData, null, 2)}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </NavigationPannel>
  );
};

export default Profile;
