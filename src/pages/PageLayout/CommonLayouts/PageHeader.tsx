import React from 'react';
import { Box, Typography } from '@mui/material';

interface BadgeProps {
  text: string;
  /** Dot + badge color - defaults to green (#22c55e) */
  color?: string;
  textColor?: string;
  bgAlpha?: string;
}

interface PageHeaderProps {
  /** Tabler (or any) icon component - rendered at 28px in brand color */
  Icon: React.ElementType;
  title: string;
  subtitle: string;
  /** Optional pill badge, e.g. { text: 'LIVE', color: '#22c55e' } */
  badge?: BadgeProps;
  /** CSS transform override for the icon, e.g. 'rotate(-8deg)' */
  iconTransform?: string;
  /** Margin-bottom - defaults to 3 */
  mb?: number | string;
}

/**
 * Airbnb-style page section header:
 * [Icon square]  Title  [optional badge]
 *                Subtitle
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  Icon,
  title,
  subtitle,
  badge,
  iconTransform,
  mb = 3,
}) => {
  const dotColor = badge?.color ?? '#22c55e';
  const badgeBg  = badge?.bgAlpha ?? 'rgba(34,197,94,0.10)';
  const badgeBorder = badge?.bgAlpha ? undefined : 'rgba(34,197,94,0.28)';
  const badgeText   = badge?.textColor ?? '#16a34a';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb }}>
      {/* Icon in brand-light rounded square */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 52,
          height: 52,
          borderRadius: '12px',
          background: '#FFF0F3',
          flexShrink: 0,
        }}
      >
        <Icon
          size={28}
          color="#FF385C"
          stroke={1.75}
          style={iconTransform ? { transform: iconTransform } : undefined}
        />
      </Box>

      {/* Text block */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
          <Typography
            sx={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 800,
              fontSize: { xs: '1.3rem', md: '1.6rem' },
              lineHeight: 1.2,
              color: 'text.primary',
              letterSpacing: '-0.025em',
            }}
          >
            {title}
          </Typography>

          {badge && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                px: 1,
                py: 0.35,
                borderRadius: '50px',
                background: badgeBg,
                border: `1px solid ${badgeBorder ?? dotColor + '44'}`,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: dotColor,
                  animation: 'page-header-live-pulse 1.8s ease-out infinite',
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.58rem',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: badgeText,
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1,
                }}
              >
                {badge.text}
              </Typography>
            </Box>
          )}
        </Box>

        <Typography
          sx={{
            fontSize: '0.875rem',
            color: 'text.secondary',
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1.55,
            maxWidth: 480,
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
};

export default PageHeader;
