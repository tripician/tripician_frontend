import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
} from "@mui/material";

interface NotificationOption {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

const NotificationsSettings: React.FC = () => {
  const [emailNotifications, setEmailNotifications] = useState<NotificationOption[]>([
    {
      id: "email_updates",
      title: "Email Updates",
      description: "Receive email updates about your account",
      enabled: true,
    },
    {
      id: "community_posts",
      title: "Community Posts",
      description: "Get notified about new community posts",
      enabled: true,
    },
    {
      id: "blog_comments",
      title: "Blog Comments",
      description: "Notifications when someone comments on your blogs",
      enabled: false,
    },
    {
      id: "newsletter",
      title: "Newsletter",
      description: "Weekly travel tips and community highlights",
      enabled: true,
    },
  ]);

  const [pushNotifications, setPushNotifications] = useState<NotificationOption[]>([
    {
      id: "push_notifications",
      title: "Push Notifications",
      description: "Receive push notifications on your device",
      enabled: true,
    },
    {
      id: "travel_reminders",
      title: "Travel Reminders",
      description: "Reminders for upcoming trips and bookings",
      enabled: true,
    },
  ]);

  const handleEmailToggle = (id: string) => {
    setEmailNotifications(prev =>
      prev.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handlePushToggle = (id: string) => {
    setPushNotifications(prev =>
      prev.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
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
        <Switch
          checked={item.enabled}
          onChange={() => onToggle(item.id)}
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: 'primary.main',
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: 'primary.main',
            },
            '& .MuiSwitch-track': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: "100%"}}>
      {/* Email Notifications Section */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
            Email Notifications
          </Typography>

          {emailNotifications.map((item, index) => (
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
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
            Push Notifications
          </Typography>

          {pushNotifications.map((item, index) => (
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