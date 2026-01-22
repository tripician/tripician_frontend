import React, { useState, useEffect } from "react";
import { useAuthToken } from '../../hooks/useAuth0Token';
import { apiServices } from '../../services/APIs/apiServices';
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
  CircularProgress,
} from "@mui/material";
import { LocationOn, Language, Email, Phone, Visibility, VisibilityOff, Save } from "@mui/icons-material";
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { fetchUserProfile, setUserProfile, type UserProfile } from '../../store/userSlice';

const ProfileSettings: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile settings state (fetched from backend)
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [bioHighlights, setBioHighlights] = useState({
    about: '',
    dreamPlace: '',
    from: ''
  });
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // initial fetch
  const [saving, setSaving] = useState(false);   // personal info save
  const [contactSaving, setContactSaving] = useState(false); // contact info save
  const [error, setError] = useState<string | null>(null);
  // Removed local success state; using global overlay events instead

  const { token: authToken } = useAuthToken();
  const dispatch = useDispatch<AppDispatch>();
  const currentProfile = useSelector((state: RootState)=> state.user.profile);

  useEffect(()=> {
    if(!authToken) return;
    let active = true;
    (async()=>{
      setLoading(true); setError(null);
      try {
        const resp = await apiServices.getProfileSettings(authToken);
        const data = resp.data || {};
        if(!active) return;
        setFname(data.Fname || data.fname || '');
        setLname(data.Lname || data.lname || '');
        
        // Parse bio highlights
        const bioData = data.Bio || data.bio;
        if (bioData && typeof bioData === 'object' && bioData.highlights) {
          const highlights = bioData.highlights;
          setBioHighlights({
            about: highlights.find((h: any) => h.key === 'about')?.value || '',
            dreamPlace: highlights.find((h: any) => h.key === 'dreamPlace')?.value || '',
            from: highlights.find((h: any) => h.key === 'from')?.value || ''
          });
        } else {
          setBioHighlights({ about: '', dreamPlace: '', from: '' });
        }
        
        setLocation(data.Location || data.location || '');
        setWebsite(data.Website || data.website || '');
        setEmail(data.Email || data.email || '');
        setPhone(data.Phone || data.phone || '');
        setProfilePicture(data.ProfilePicture || data.profilePicture || null);
      } catch(err:any){
        setError('Failed to load profile settings');
      } finally { setLoading(false); }
    })();
    return ()=> { active=false; };
  }, [authToken]);

  return (
    <Box sx={{ maxWidth: "100%" }}>
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
                fontSize: "1.1rem",
              }}
            >
              Profile Photo
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Avatar
              src={profilePicture || undefined}
              sx={{
                width: 80,
                height: 80,
                bgcolor: profilePicture ? "transparent" : "background.default",
                color: "text.secondary",
                fontSize: "1.5rem",
                fontWeight: 500,
              }}
            >
              {!profilePicture && (fname?.[0] || "U")}
              {!profilePicture && (lname?.[0] || "")}
            </Avatar>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("app:success", { detail: { message: "Photo uploaded" } })
                  );
                }}
                sx={{ textTransform: "none", fontWeight: 500, px: 2, py: 1 }}
              >
                Upload New Photo
              </Button>
              <Button
                variant="text"
                color="error"
                size="small"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("app:success", { detail: { message: "Photo removed" } })
                  );
                }}
                sx={{ textTransform: "none", fontWeight: 500, px: 2, py: 1 }}
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
              fontSize: "0.875rem",
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
              value={fname}
              onChange={e=> setFname(e.target.value)}
              size="small"
              disabled={loading}
              sx={{"& .MuiOutlinedInput-root": { borderRadius: 1.5 }}}
            />
            <TextField 
              fullWidth 
              label="Last Name" 
              value={lname}
              onChange={e=> setLname(e.target.value)}
              size="small"
              disabled={loading}
              sx={{"& .MuiOutlinedInput-root": { borderRadius: 1.5 }}}
            />
          </Box>

          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 600, 
              mb: 2,
              color: "text.primary",
              fontSize: "0.95rem"
            }}
          >
            Bio Highlights
          </Typography>

          <TextField
            fullWidth
            label="I'm a/an"
            placeholder="e.g., Traveller, Photographer, Adventure Seeker"
            value={bioHighlights.about}
            onChange={e=> setBioHighlights(prev => ({ ...prev, about: e.target.value }))}
            size="small"
            disabled={loading}
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />

          <TextField
            fullWidth
            label="My dream place is"
            placeholder="e.g., Bali, Indonesia"
            value={bioHighlights.dreamPlace}
            onChange={e=> setBioHighlights(prev => ({ ...prev, dreamPlace: e.target.value }))}
            size="small"
            disabled={loading}
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />

          <TextField
            fullWidth
            label="I'm from"
            placeholder="e.g., New York, USA"
            value={bioHighlights.from}
            onChange={e=> setBioHighlights(prev => ({ ...prev, from: e.target.value }))}
            size="small"
            disabled={loading}
            sx={{ mb: 3, "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <TextField 
              fullWidth 
              label="Current Location" 
              value={location}
              onChange={e=> setLocation(e.target.value)}
              size="small"
              disabled={loading}
              InputProps={{ startAdornment: (<InputAdornment position="start"><LocationOn sx={{ color: "text.secondary", fontSize: 20 }} /></InputAdornment>) }}
              sx={{"& .MuiOutlinedInput-root": { borderRadius: 1.5 }}}
            />
            <TextField 
              fullWidth 
              label="Website" 
              value={website}
              onChange={e=> setWebsite(e.target.value)}
              size="small"
              disabled={loading}
              InputProps={{ startAdornment: (<InputAdornment position="start"><Language sx={{ color: "text.secondary", fontSize: 20 }} /></InputAdornment>) }}
              sx={{"& .MuiOutlinedInput-root": { borderRadius: 1.5 }}}
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} /> : <Save />}
              disabled={loading || saving}
              onClick={async () => {
                if (!authToken) return;
                setSaving(true);
                setError(null);
                try {
                  // Build bio highlights array
                  const highlights = [];
                  if (bioHighlights.about) {
                    highlights.push({
                      key: 'about',
                      label: "I'm a/an",
                      value: bioHighlights.about,
                      icon: 'heart'
                    });
                  }
                  if (bioHighlights.dreamPlace) {
                    highlights.push({
                      key: 'dreamPlace',
                      label: 'My dream place is',
                      value: bioHighlights.dreamPlace,
                      icon: 'map'
                    });
                  }
                  if (bioHighlights.from) {
                    highlights.push({
                      key: 'from',
                      label: "I'm from",
                      value: bioHighlights.from,
                      icon: 'map-pin'
                    });
                  }

                  const payload = {
                    Fname: fname,
                    Lname: lname,
                    Bio: { highlights },
                    Location: location,
                    Website: website,
                  };
                  await apiServices.updatePersonalInfoSettings(authToken, payload);
                  try {
                    const optimisticProfile: UserProfile = {
                      ...(currentProfile ?? {}),
                      fname,
                      lname,
                      bio: { highlights },
                      location,
                      website,
                      bannertint: currentProfile?.bannertint,
                    };
                    dispatch(setUserProfile(optimisticProfile));
                    await dispatch(fetchUserProfile({ force: true })).unwrap();
                  } catch {}
                  window.dispatchEvent(
                    new CustomEvent("app:success", { detail: { message: "Personal info updated" } })
                  );
                } catch (e: any) {
                  setError("Failed to save changes");
                } finally {
                  setSaving(false);
                }
              }}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                px: 3,
                py: 1.5,
                borderRadius: 1.5,
                backgroundColor: "#3b82f6",
                "&:hover": { backgroundColor: "#2563eb" },
              }}
            >
              {saving ? "Saving..." : "Save"}
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
            value={email}
            onChange={e=> setEmail(e.target.value)}
            size="small"
            disabled={loading}
            InputProps={{ startAdornment: (<InputAdornment position="start"><Email sx={{ color: "text.secondary", fontSize: 20 }} /></InputAdornment>) }}
            sx={{ mb: 3, "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />

          <TextField
            fullWidth
            label="Phone Number"
            value={phone}
            onChange={e=> setPhone(e.target.value)}
            size="small"
            disabled={loading}
            InputProps={{ startAdornment: (<InputAdornment position="start"><Phone sx={{ color: "text.secondary", fontSize: 20 }} /></InputAdornment>) }}
            sx={{ mb: 3, "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />

          <Button 
            variant="outlined"
            disabled={loading || contactSaving}
            onClick={async ()=> {
              if(!authToken) return;
              setContactSaving(true); setError(null);
              try {
                await apiServices.updateContactInfoSettings(authToken, { Email: email, Phone: phone });
                try {
                  const optimisticProfile: UserProfile = {
                    ...(currentProfile ?? {}),
                    email,
                    phone,
                    bannertint: currentProfile?.bannertint,
                  };
                  dispatch(setUserProfile(optimisticProfile));
                  await dispatch(fetchUserProfile({ force: true })).unwrap();
                } catch {}
                window.dispatchEvent(new CustomEvent('app:success',{ detail:{ message:'Contact info updated' }}));
              } catch(e:any){
                setError('Failed to update contact info');
              } finally { setContactSaving(false); }
            }}
            sx={{ 
              textTransform: "none",
              fontWeight: 500,
              px: 3,
              py: 1,
              borderRadius: 1.5
            }}
          >
            {contactSaving ? 'Updating...' : 'Update Contact Info'}
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
            disabled={loading}
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
              )
            }}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": { borderRadius: 1.5 }
            }}
          />

          <TextField
            fullWidth
            label="New Password"
            type={showNewPassword ? "text" : "password"}
            placeholder="Enter new password"
            size="small"
            disabled={loading}
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
              )
            }}
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": { borderRadius: 1.5 }
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
            disabled={loading}
            onClick={()=> window.dispatchEvent(new CustomEvent('app:success',{ detail:{ message:'Password changed' }}))}
            sx={{ textTransform: "none", fontWeight: 500, px: 3, py: 1, borderRadius: 1.5 }}
          >
            Change Password
          </Button>
        </CardContent>
      </Card>
    {error && (
      <Typography variant="caption" color="error" sx={{ mt:2, display:'block' }}>{error}</Typography>
    )}
    {/* success caption removed in favor of global overlay */}
    </Box>
  );
};

export default ProfileSettings;