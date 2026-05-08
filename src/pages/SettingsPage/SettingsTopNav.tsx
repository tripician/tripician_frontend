import React from "react";
import { Box } from "@mui/material";
import { User, Bell, Shield, Globe } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsTopNavProps {
  selectedSettingsMenuItem: string;
  onChange: (value: string) => void;
}

const NAV_ITEMS = [
  { value: 'profile',       label: 'Profile',       Icon: User   },
  { value: 'notifications', label: 'Notifications', Icon: Bell   },
  { value: 'privacy',       label: 'Privacy',       Icon: Shield },
  { value: 'preferences',   label: 'Preferences',   Icon: Globe  },
];

const SettingsTopNav: React.FC<SettingsTopNavProps> = ({ selectedSettingsMenuItem, onChange }) => (
  <Box sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, gap: 0.5, flexWrap: 'wrap' }}>
    {NAV_ITEMS.map(({ value, label, Icon }) => {
      const active = selectedSettingsMenuItem.toLowerCase() === value;
      return (
        <Box
          component={motion.div}
          key={value}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => onChange(label)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 1.1, borderRadius: '10px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontWeight: active ? 600 : 500,
            fontSize: '0.875rem',
            color: active ? '#FF385C' : 'text.secondary',
            bgcolor: active ? 'rgba(255,56,92,0.08)' : 'transparent',
            userSelect: 'none',
            '&:hover': {
              bgcolor: active ? 'rgba(255,56,92,0.1)' : 'action.hover',
              color: active ? '#FF385C' : 'text.primary',
            },
            transition: 'all 0.15s ease',
          }}
        >
          <Icon size={15} strokeWidth={active ? 2.3 : 1.8} />
          {label}
        </Box>
      );
    })}
  </Box>
);

export default SettingsTopNav;
