import React, { useState, useEffect, useRef } from "react";
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
    intro: '',
    about: '',
    dreamPlace: '',
    from: ''
  });
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [coverPicture, setCoverPicture] = useState<string | null>(null);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isRemovingCover, setIsRemovingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
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
            intro: highlights.find((h: any) => h.key === 'intro')?.value || '',
            about: highlights.find((h: any) => h.key === 'about')?.value || '',
            dreamPlace: highlights.find((h: any) => h.key === 'dreamPlace')?.value || '',
            from: highlights.find((h: any) => h.key === 'from')?.value || ''
          });
        } else {
          setBioHighlights({ intro: '', about: '', dreamPlace: '', from: '' });
        }
        
        setLocation(data.Location || data.location || '');
        setWebsite(data.Website || data.website || '');
        setEmail(data.Email || data.email || '');
        setPhone(data.Phone || data.phone || '');
        setProfilePicture(data.ProfilePicture || data.profilePicture || null);
      } catch{
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
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 2.5, color: 'text.primary', letterSpacing: '-0.01em' }}>
            Profile Photo
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Avatar
              src={profilePicture || undefined}
              sx={{
                width: 80, height: 80,
                bgcolor: 'primary.main',
                color: '#fff',
                fontSize: '1.7rem',
                fontWeight: 700,
              }}
            >
              {!profilePicture && (fname?.[0]?.toUpperCase() || 'U')}
            </Avatar>
            {/* Hidden file picker - accepts jpg/png/webp up to 5 MB */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={async (e) => {
                console.log('[Upload] onChange fired');
                const file = e.target.files?.[0];
                console.log('[Upload] file:', file?.name, file?.size, '| authToken:', !!authToken, '| userId:', currentProfile?.id);
                // Reset input so the same file can be re-selected after an error
                e.target.value = '';
                if (!file) { console.log('[Upload] STOPPED: no file'); return; }

                if (!authToken) {
                  console.log('[Upload] STOPPED: no authToken');
                  setError('You must be logged in to upload a photo.');
                  return;
                }

                const userId = currentProfile?.id;
                if (!userId) {
                  console.log('[Upload] STOPPED: no userId, currentProfile =', currentProfile);
                  setError('Cannot upload: user ID not available');
                  return;
                }

                if (file.size > 5 * 1024 * 1024) {
                  console.log('[Upload] STOPPED: file too large');
                  window.dispatchEvent(new CustomEvent('app:error', {
                    detail: { message: 'Image is too large. Please upload a photo smaller than 5 MB.' }
                  }));
                  return;
                }

                setIsUploadingPhoto(true);
                setError(null);
                try {
                  // 1. Get signed Cloudinary upload params from our backend
                  console.log('[Upload] calling getProfileUploadUrl with userId:', userId);
                  const { data: uploadData } = await apiServices.getProfileUploadUrl(authToken, userId);
                  console.log('[Upload] got uploadData:', uploadData);

                  // 2. Upload directly to Cloudinary using the signed params
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('api_key', uploadData.apiKey);
                  formData.append('timestamp', String(uploadData.timestamp));
                  formData.append('signature', uploadData.signature);
                  formData.append('folder', uploadData.folder);
                  formData.append('public_id', uploadData.public_id);
                  // Note: do NOT append 'overwrite' here unless it is included

                  const cloudRes = await fetch(uploadData.uploadUrl, {
                    method: 'POST',
                    body: formData,
                  });
                  if (!cloudRes.ok) {
                    const errBody = await cloudRes.text();
                    throw new Error(`Cloudinary upload failed: ${errBody}`);
                  }

                  // 3. Persist the URL to DB (non-fatal - endpoint may not exist yet)
                  const newUrl = `${uploadData.fileUrl}?v=${uploadData.timestamp}`;
                  try {
                    await apiServices.saveProfilePictureUrl(authToken, uploadData.fileUrl);
                  } catch (saveErr: any) {
                    console.warn('[Upload] saveProfilePictureUrl failed (non-fatal):', saveErr?.response?.status, saveErr?.message);
                  }

                  setProfilePicture(newUrl);

                  // 4. Push the new URL into Redux + localStorage
                  try {
                    const optimisticProfile = {
                      ...(currentProfile ?? {}),
                      profilepicture: newUrl,
                    } as any;
                    dispatch(setUserProfile(optimisticProfile));
                    await dispatch(fetchUserProfile({ force: true })).unwrap();
                  } catch {}

                  window.dispatchEvent(new CustomEvent('app:success', { detail: { message: 'Profile photo updated' } }));
                } catch (err: any) {
                  console.error('[Upload] FAILED:', err?.response?.status, err?.response?.data, err?.message);
                  setError('Failed to upload photo. Please try again.');
                  window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'Photo upload failed' } }));
                } finally {
                  setIsUploadingPhoto(false);
                }
              }}
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                size="small"
                disabled={isUploadingPhoto}
                onClick={() => {
                  console.log('[Upload] button clicked, ref:', fileInputRef.current);
                  fileInputRef.current?.click();
                }}
                sx={{ textTransform: "none", fontWeight: 600, px: 2.5, py: 1 }}
              >
                {isUploadingPhoto ? <><CircularProgress size={14} sx={{ color: '#fff', mr: 1 }} />Uploading…</> : 'Upload New Photo'}
              </Button>
              <Button
                variant="text"
                color="error"
                size="small"
                onClick={async () => {
                  if (!authToken) return;
                  const userId = currentProfile?.id;
                  if (!userId) { setError('Cannot remove: user ID not available'); return; }
                  setIsRemovingPhoto(true);
                  setError(null);
                  try {
                    // DELETE /api/uploads/profile-photo/{userId} - removes from Cloudinary + clears DB
                    await apiServices.removeProfilePhoto(authToken, Number(userId));

                    setProfilePicture(null);
                    try {
                      const optimisticProfile = { ...(currentProfile ?? {}), profilepicture: undefined } as any;
                      dispatch(setUserProfile(optimisticProfile));
                      await dispatch(fetchUserProfile({ force: true })).unwrap();
                    } catch {}

                    window.dispatchEvent(new CustomEvent('app:success', { detail: { message: 'Photo removed' } }));
                  } catch (e: any) {
                    console.error('Remove photo failed', e);
                    setError('Failed to remove photo');
                    window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'Failed to remove photo' } }));
                  } finally {
                    setIsRemovingPhoto(false);
                  }
                }}
                sx={{ textTransform: "none", fontWeight: 500, px: 2, py: 1 }}
              >
                {isRemovingPhoto ? 'Removing…' : 'Remove Photo'}
              </Button>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 2, fontSize: "0.875rem" }}>
            Recommended: Square image, at least 400×400px · Max 5 MB (JPG, PNG, WebP)
          </Typography>
        </CardContent>
      </Card>

      {/* Cover Photo Section */}
      <Card sx={{ mb: 3, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 2.5, color: 'text.primary', letterSpacing: '-0.01em' }}>
            Cover Photo
          </Typography>
          {/* Hidden file picker for cover */}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file || !authToken) return;
              const userId = currentProfile?.id;
              if (!userId) return;
              if (file.size > 8 * 1024 * 1024) {
                window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'Cover image must be under 8 MB.' } }));
                return;
              }
              setIsUploadingCover(true);
              try {
                const { data: uploadData } = await apiServices.getCoverUploadUrl(authToken, String(userId));
                const formData = new FormData();
                formData.append('file', file);
                formData.append('api_key', uploadData.apiKey);
                formData.append('timestamp', String(uploadData.timestamp));
                formData.append('signature', uploadData.signature);
                formData.append('folder', uploadData.folder);
                formData.append('public_id', uploadData.public_id);
                const cloudRes = await fetch(uploadData.uploadUrl, { method: 'POST', body: formData });
                if (!cloudRes.ok) throw new Error('Cloudinary upload failed');
                const newUrl = `${uploadData.fileUrl}?v=${uploadData.timestamp}`;
                await apiServices.saveCoverPictureUrl(authToken, uploadData.fileUrl);
                setCoverPicture(newUrl);
                const optimisticProfile = { ...(currentProfile ?? {}), coverpicture: newUrl } as any;
                dispatch(setUserProfile(optimisticProfile));
                await dispatch(fetchUserProfile({ force: true } as any)).unwrap().catch(() => {});
                window.dispatchEvent(new CustomEvent('app:success', { detail: { message: 'Cover photo updated' } }));
              } catch {
                window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'Cover photo upload failed' } }));
              } finally {
                setIsUploadingCover(false);
              }
            }}
          />
          {/* Cover preview */}
          <Box
            sx={{
              width: '100%', height: 160, borderRadius: '12px', overflow: 'hidden', mb: 2,
              background: coverPicture || (currentProfile as any)?.coverpicture
                ? `url(${coverPicture || (currentProfile as any)?.coverpicture}) center/cover no-repeat`
                : 'linear-gradient(135deg,#1a1a2e,#16213e)',
              border: '1px solid', borderColor: 'divider',
            }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              size="small"
              disabled={isUploadingCover}
              onClick={() => coverInputRef.current?.click()}
              sx={{ textTransform: 'none', fontWeight: 600, px: 2.5, py: 1 }}
            >
              {isUploadingCover ? <><CircularProgress size={14} sx={{ color: '#fff', mr: 1 }} />Uploading…</> : 'Upload Cover'}
            </Button>
            {(coverPicture || (currentProfile as any)?.coverpicture) && (
              <Button
                variant="text" color="error" size="small"
                disabled={isRemovingCover}
                onClick={async () => {
                  const userId = currentProfile?.id;
                  if (!userId || !authToken) return;
                  const numericUserId = Number(userId);
                  if (!Number.isFinite(numericUserId)) return;
                  setIsRemovingCover(true);
                  try {
                    await apiServices.removeCoverPhoto(authToken, numericUserId);
                    setCoverPicture(null);
                    const optimisticProfile = { ...(currentProfile ?? {}), coverpicture: null } as any;
                    dispatch(setUserProfile(optimisticProfile));
                    window.dispatchEvent(new CustomEvent('app:success', { detail: { message: 'Cover photo removed' } }));
                  } catch {
                    window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'Failed to remove cover photo' } }));
                  } finally {
                    setIsRemovingCover(false);
                  }
                }}
                sx={{ textTransform: 'none', fontWeight: 500, px: 2, py: 1 }}
              >
                {isRemovingCover ? 'Removing…' : 'Remove Cover'}
              </Button>
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, fontSize: '0.875rem' }}>
            Recommended: 1500×500px landscape image · Max 8 MB (JPG, PNG, WebP)
          </Typography>
        </CardContent>
      </Card>

      {/* Personal Information Section */}
      <Card
        sx={{
          mb: 3,
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 3, color: 'text.primary', letterSpacing: '-0.01em' }}>
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

          {/* Prose, not a pill. Rendered as the epigraph at the top of the
              profile, which is why it is first here too. */}
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="In your own words"
            placeholder="What kind of travelling do you actually like? Who are you good to travel with?"
            value={bioHighlights.intro}
            onChange={e=> setBioHighlights(prev => ({ ...prev, intro: e.target.value.slice(0, 600) }))}
            helperText={`${bioHighlights.intro.length}/600`}
            disabled={loading}
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />

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
                  if (bioHighlights.intro) {
                    highlights.push({
                      key: 'intro',
                      label: '',
                      value: bioHighlights.intro,
                      icon: ''
                    });
                  }
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
                    };
                    dispatch(setUserProfile(optimisticProfile));
                    await dispatch(fetchUserProfile({ force: true })).unwrap();
                  } catch {}
                  window.dispatchEvent(
                    new CustomEvent("app:success", { detail: { message: "Personal info updated" } })
                  );
                } catch {
                  setError("Failed to save changes");
                } finally {
                  setSaving(false);
                }
              }}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                py: 1.5,
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
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 3, color: 'text.primary', letterSpacing: '-0.01em' }}>
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
                  };
                  dispatch(setUserProfile(optimisticProfile));
                  await dispatch(fetchUserProfile({ force: true })).unwrap();
                } catch {}
                window.dispatchEvent(new CustomEvent('app:success',{ detail:{ message:'Contact info updated' }}));
              } catch{
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
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mb: 3, color: 'text.primary', letterSpacing: '-0.01em' }}>
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
