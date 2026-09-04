import React from "react";
import { BRAND } from '../../theme';
import { alpha } from '@mui/material/styles';
import { Box } from "@mui/material";
import { User, Bell, Shield, Globe, Coins } from "lucide-react";
import { motion } from 'framer-motion';

interface SettingsTopNavProps {
  selectedSettingsMenuItem: string;
  onChange: (value: string) => void;
}

const NAV_ITEMS = [
  { value: 'profile',       label: 'Profile',       Icon: User   },
  { value: 'notifications', label: 'Notifications', Icon: Bell   },
  { value: 'privacy',       label: 'Privacy',       Icon: Shield },
  { value: 'preferences',   label: 'Preferences',   Icon: Globe  },
  { value: 'credits',       label: 'Credits',       Icon: Coins  },
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
            fontWeight: active ? 600 : 500,
            fontSize: '0.875rem',
            color: active ? 'primary.main' : 'text.secondary',
            bgcolor: active ? alpha(BRAND.coral, 0.08) : 'transparent',
            userSelect: 'none',
            '&:hover': {
              bgcolor: active ? alpha(BRAND.coral, 0.1) : 'action.hover',
              color: active ? 'primary.main' : 'text.primary',
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
