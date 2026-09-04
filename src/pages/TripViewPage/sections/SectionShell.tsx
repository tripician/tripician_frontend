import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { IconLock } from '@tabler/icons-react';

export const MembersOnlyTag: React.FC = () => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
    <IconLock size={12} />
    <Typography component="span" sx={{ fontSize: 11, fontWeight: 600 }}>
      Visible to trip members only
    </Typography>
  </Box>
);

interface SectionShellProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  membersOnly?: boolean;
  action?: React.ReactNode;
  empty?: string;
  children?: React.ReactNode;
}

const SectionShell: React.FC<SectionShellProps> = ({
  icon, title, subtitle, membersOnly = false, action, empty, children,
}) => {
  const theme = useTheme();
  const border = theme.custom.surface.border;

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 6 }, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: subtitle ? 0.75 : 2.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography sx={{ fontWeight: 700, fontSize: 22, color: 'text.primary' }}>
            {title}
          </Typography>
        </Box>
        {membersOnly && <MembersOnlyTag />}
        <Box sx={{ flex: 1 }} />
        {action}
      </Box>

      {subtitle && (
        <Typography sx={{ fontSize: 14.5, color: 'text.secondary', lineHeight: 1.6, mb: 2.5, maxWidth: 680 }}>
          {subtitle}
        </Typography>
      )}

      {children}

      {!children && empty && (
        <Box sx={{ borderRadius: '16px', border: `1px dashed ${border}`, p: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{empty}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default SectionShell;
