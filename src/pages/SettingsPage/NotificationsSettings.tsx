import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useAuthToken } from '../../hooks/useAuth0Token';
import { apiServices } from '../../services/APIs/apiServices';

interface NotificationOption {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

const NotificationsSettings: React.FC = () => {
  const [emailNotifications, setEmailNotifications] = useState<NotificationOption[]>([]);
  const [pushNotifications, setPushNotifications] = useState<NotificationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const { token: authToken } = useAuthToken();

  // Initialize options after fetch
  useEffect(()=> {
    if(!authToken) return;
    let active = true;
    (async()=>{
      setLoading(true); setError(null);
      try {
        const resp = await apiServices.getNotificationSettings(authToken);
        const data = resp.data || {};
        if(!active) return;
        setEmailNotifications([
          { id:'emailUpdates', title:'Email Updates', description:'Receive email updates about your account', enabled: !!data.emailUpdates },
          { id:'communityPosts', title:'Community Posts', description:'Get notified about new community posts', enabled: !!data.communityPosts },
          { id:'blogComments', title:'Blog Comments', description:'Notifications when someone comments on your blogs', enabled: !!data.blogComments },
          { id:'newsletter', title:'Newsletter', description:'Weekly travel tips and community highlights', enabled: !!data.newsletter },
        ]);
        setPushNotifications([
          { id:'pushNotifications', title:'Push Notifications', description:'Receive push notifications on your device', enabled: !!data.pushNotifications },
          { id:'travelReminders', title:'Travel Reminders', description:'Reminders for upcoming trips and bookings', enabled: !!data.travelReminders },
        ]);
      } catch(e:any){
        setError('Failed to load notification settings');
      } finally { setLoading(false); }
    })();
    return ()=> { active=false; };
  }, [authToken]);

  const updateBackend = async (key: string, value: boolean, rollback: ()=>void) => {
    if(!authToken) return;
    setUpdatingIds(prev => new Set(prev).add(key));
    try {
      await apiServices.updateNotificationSettings(authToken, { [key]: value });
    } catch(e:any){
      rollback();
    } finally {
      setUpdatingIds(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const handleEmailToggle = (id: string) => {
    setEmailNotifications(prev => prev.map(item => {
      if(item.id !== id) return item;
      const newEnabled = !item.enabled;
      const original = item.enabled;
      // optimistic update
      setTimeout(()=> updateBackend(id, newEnabled, ()=> {
        // rollback
        setEmailNotifications(p2 => p2.map(i => i.id===id? { ...i, enabled: original }: i));
      }), 0);
      return { ...item, enabled: newEnabled };
    }));
  };

  const handlePushToggle = (id: string) => {
    setPushNotifications(prev => prev.map(item => {
      if(item.id !== id) return item;
      const newEnabled = !item.enabled;
      const original = item.enabled;
      setTimeout(()=> updateBackend(id, newEnabled, ()=> {
        setPushNotifications(p2 => p2.map(i => i.id===id? { ...i, enabled: original }: i));
      }), 0);
      return { ...item, enabled: newEnabled };
    }));
  };

  const NotificationItem = ({ 
    item, 
    onToggle 
  }: { 
    item: NotificationOption; 
    onToggle: (id: string) => void;
  }) => (
    <Box sx={{ mb: 2.5, '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 500, 
              color: "text.primary",
              mb: 0.5,
              fontSize: "0.95rem"
            }}
          >
            {item.title}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: "text.secondary",
              fontSize: "0.875rem",
              lineHeight: 1.4
            }}
          >
            {item.description}
          </Typography>
        </Box>
        <Box sx={{ position:'relative', display:'inline-flex' }}>
          <Switch
            checked={item.enabled}
            onChange={() => onToggle(item.id)}
            disabled={updatingIds.has(item.id) || loading}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'primary.main' },
              '& .MuiSwitch-track': { backgroundColor: 'action.hover' },
            }}
          />
          {updatingIds.has(item.id) && (
            <CircularProgress size={22} sx={{ position:'absolute', top:'50%', left:'50%', mt:'-11px', ml:'-11px' }} />
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: "100%"}}>
      {/* Email Notifications Section */}
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
            Email Notifications
          </Typography>

          {loading && emailNotifications.length===0 ? (
            <Typography variant="body2" color="text.secondary">Loading...</Typography>
          ) : error ? (
            <Typography variant="body2" color="error">{error}</Typography>
          ) : emailNotifications.map((item, index) => (
            <React.Fragment key={item.id}>
              <NotificationItem 
                item={item} 
                onToggle={handleEmailToggle}
              />
              {index < emailNotifications.length - 1 && (
                <Divider sx={{ my: 2.5, borderColor: 'divider' }} />
              )}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Push Notifications Section */}
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
            Push Notifications
          </Typography>

          {loading && pushNotifications.length===0 ? (
            <Typography variant="body2" color="text.secondary">Loading...</Typography>
          ) : error ? (
            <Typography variant="body2" color="error">{error}</Typography>
          ) : pushNotifications.map((item, index) => (
            <React.Fragment key={item.id}>
              <NotificationItem 
                item={item} 
                onToggle={handlePushToggle}
              />
              {index < pushNotifications.length - 1 && (
                <Divider sx={{ my: 2.5, borderColor: 'divider' }} />
              )}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

export default NotificationsSettings;