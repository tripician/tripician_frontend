import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Avatar,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { LocationOn, Language, Email, Phone, Visibility, VisibilityOff } from "@mui/icons-material";

const ProfileSettings: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <Box sx={{ maxWidth: "100%"}}>
      {/* Profile Photo Section */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: 1,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>            
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600, 
                color: "text.primary",
                fontSize: "1.1rem"
              }}
            >
              Profile Photo
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: "background.default",
                color: "text.secondary",
                fontSize: "1.5rem",
                fontWeight: 500
              }}
            >
              SC
            </Avatar>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button 
                variant="contained" 
                size="small"
                sx={{ 
                  textTransform: "none",
                  fontWeight: 500,
                  px: 2,
                  py: 1
                }}
              >
                Upload New Photo
              </Button>
              <Button 
                variant="text" 
                color="error" 
                size="small"
                sx={{ 
                  textTransform: "none",
                  fontWeight: 500,
                  px: 2,
                  py: 1
                }}
              >
                Remove Photo
              </Button>
            </Box>
          </Box>

          <Typography 
            variant="body2" 
            sx={{ 
              color: "text.secondary", 
              mt: 2,
              fontSize: "0.875rem"
            }}
          >
            Recommended: Square image, at least 400x400px
          </Typography>
        </CardContent>
      </Card>

      {/* Personal Information Section */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: 1,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600, 
              mb: 3,
              color: "text.primary",
              fontSize: "1.1rem"
            }}
          >
            Personal Information
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <TextField 
              fullWidth 
              label="First Name" 
              defaultValue="Sarah"
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                }
              }}
            />
            <TextField 
              fullWidth 
              label="Last Name" 
              defaultValue="Chen"
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                }
              }}
            />
          </Box>

          <TextField
            fullWidth
            label="Bio"
            defaultValue="Digital nomad exploring the world one adventure at a time ✈️"
            multiline
            rows={3}
            size="small"
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              }
            }}
          />

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <TextField 
              fullWidth 
              label="Current Location" 
              defaultValue="Bangkok, Thailand"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationOn sx={{ color: "text.secondary", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                }
              }}
            />
            <TextField 
              fullWidth 
              label="Website" 
              defaultValue="sarahexplores.com"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Language sx={{ color: "text.secondary", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                }
              }}
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button 
              variant="contained"
              sx={{ 
                textTransform: "none",
                fontWeight: 500,
                px: 3,
                py: 1,
                borderRadius: 1.5
              }}
            >
              Save Changes
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Contact Information Section */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: 1,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600, 
              mb: 3,
              color: "text.primary",
              fontSize: "1.1rem"
            }}
          >
            Contact Information
          </Typography>

          <TextField
            fullWidth
            label="Email Address"
            defaultValue="sarah.chen@email.com"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              }
            }}
          />

          <TextField
            fullWidth
            label="Phone Number"
            defaultValue="+1 (555) 123-4567"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              }
            }}
          />

          <Button 
            variant="outlined"
            sx={{ 
              textTransform: "none",
              fontWeight: 500,
              px: 3,
              py: 1,
              borderRadius: 1.5
            }}
          >
            Update Contact Info
          </Button>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card
        sx={{
          borderRadius: 2,
          boxShadow: 1,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600, 
              mb: 3,
              color: "text.primary",
              fontSize: "1.1rem"
            }}
          >
            Security
          </Typography>

          <TextField
            fullWidth
            label="Current Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter current password"
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              }
            }}
          />

          <TextField
            fullWidth
            label="New Password"
            type={showNewPassword ? "text" : "password"}
            placeholder="Enter new password"
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    size="small"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              }
            }}
          />

          <TextField
            fullWidth
            label="Confirm New Password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm new password"
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              }
            }}
          />

          <Button 
            variant="outlined"
            sx={{ 
              textTransform: "none",
              fontWeight: 500,
              px: 3,
              py: 1,
              borderRadius: 1.5
            }}
          >
            Change Password
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfileSettings;