import { Box, Typography, Card, CardContent, CircularProgress, Alert, Button } from "@mui/material";
import UserProfileBanner from "./UserProfileBanner";
import NavigationPannel from "../PageLayout/CommonLayouts/NavigationPannel";
import { useState, useEffect } from "react";
import TopBar from "../PageLayout/CommonLayouts/TopBar";
import { useAuthToken } from '../../../hooks/useAuth0Token';
import { apiServices } from '../../../services/APIs/ApiServices';

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
        // The 401 interceptor in ApiServices will handle logout automatically
        return; // Early return since logout will handle the redirect
      } else if (error.response?.status === 404) {
        errorMessage = 'Profile not found.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message === 'No authentication token found') {
        errorMessage = 'Authentication required. Please log in.';
        logout(); // Manually trigger logout for missing token
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
  }  // Authentication check
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
        
        {/* UserProfileBanner without profileData prop */}
        <UserProfileBanner />
        
        <Box sx={{ p: 2 }}>
          {/* About Me Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h4" gutterBottom>
                About Me
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {profileData?.bio || 'No description available.'}
              </Typography>
            </CardContent>
          </Card>

          {/* Profile Details Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Profile Details
              </Typography>
              
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                {profileData?.name && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Full Name
                    </Typography>
                    <Typography variant="body1">
                      {profileData.name}
                    </Typography>
                  </Box>
                )}
                
                {profileData?.email && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {profileData.email}
                    </Typography>
                  </Box>
                )}
                
                {profileData?.phone && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {profileData.phone}
                    </Typography>
                  </Box>
                )}
                
                {profileData?.country && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Country
                    </Typography>
                    <Typography variant="body1">
                      {profileData.country}
                    </Typography>
                  </Box>
                )}
                
                {profileData?.gender && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Gender
                    </Typography>
                    <Typography variant="body1">
                      {profileData.gender}
                    </Typography>
                  </Box>
                )}
                
                {profileData?.dateOfBirth && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography variant="body1">
                      {new Date(profileData.dateOfBirth).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

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