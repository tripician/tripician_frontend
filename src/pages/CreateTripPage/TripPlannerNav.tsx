import React from 'react';
import { BRAND } from '../../theme';
import { Box, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SettingsIcon from '@mui/icons-material/Settings';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import SoonTag from '../../components/CommonComponents/SoonTag';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { motion } from 'framer-motion';
import { visiblePlannerNavItems } from './plannerNavItems';

interface TripPlannerNavProps { active?: string; onChange?: (id: string) => void; onSettingsClick?:()=>void; hideSections?: string[]; canAccessDocs?: boolean; docsEnabled?: boolean; settingsDisabled?: boolean; budgetEnabled?: boolean }

const TripPlannerNav: React.FC<TripPlannerNavProps> = ({ active = 'plan', onChange, onSettingsClick, hideSections=[], canAccessDocs=true, docsEnabled=true, settingsDisabled=false, budgetEnabled=true }) => {
  const { importExport } = FEATURE_FLAGS;
  return (
    <Box
      sx={(theme) => ({
        width: 72,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        py: 0,
        gap: 1.25,
        justifyContent: 'center',
        background: theme.palette.mode === 'light'
          ? '#ffffff'
          : '#18181b',
        color: theme.palette.mode === 'light' ? '#222222' : '#f4f4f5',
        position: 'relative',
        boxShadow: theme.palette.mode === 'light'
          ? '2px 0 12px rgba(0,0,0,0.07)'
          : '2px 0 12px rgba(0,0,0,0.45)',
        borderRight: theme.palette.mode === 'light'
          ? '1px solid rgba(0,0,0,0.07)'
          : '1px solid rgba(255,255,255,0.06)',
        zIndex: 5,
        '&::after': {
          content: '""',
          position: 'absolute',
          right: 0,
          top: '12%',
          bottom: '12%',
          width: '1px',
          background: `linear-gradient(180deg, transparent 0%, ${alpha(BRAND.coral, 0.45)} 50%, transparent 100%)`,
          pointerEvents: 'none',
        },
      })}
    >
  {visiblePlannerNavItems({ hideSections, canAccessDocs, docsEnabled, budgetEnabled }).map(item => {
        const selected = item.id === active;
        const isDocs = item.id==='docs';
  const disabledDocs = isDocs && !docsEnabled;
  const isDisabled = disabledDocs;
        return (
          <Tooltip key={item.id} title={isDisabled ? `${item.label} (Coming Soon)` : item.label} placement='right' arrow>
            <Box
              component={motion.div}
              whileHover={isDisabled ? {} : { scale: 1.08, y: -2 }}
              whileTap={isDisabled ? {} : { scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              role='button'
              tabIndex={0}
              aria-pressed={selected}
              data-nav-id={item.id}
              onClick={() => { if(isDisabled) return; onChange?.(item.id); }}
              onKeyDown={(e)=> { if(isDisabled) return; if(e.key==='Enter' || e.key===' ') { e.preventDefault(); onChange?.(item.id); } }}
              sx={(theme) => ({
                cursor: isDisabled? 'not-allowed':'pointer',
                width: 48,
                mx: 0,
                display: isDisabled ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                borderRadius: 2,
                background: selected
                  ? (theme.palette.mode === 'light' ? alpha(BRAND.coral, 0.09) : alpha(BRAND.coral, 0.18))
                  : (isDisabled
                      ? (theme.palette.mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)')
                      : 'transparent'),
                border: selected
                  ? (theme.palette.mode === 'light' ? `1px solid ${alpha(BRAND.coral, 0.22)}` : `1px solid ${alpha(BRAND.coral, 0.35)}`)
                  : (isDisabled
                      ? (theme.palette.mode === 'light' ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.07)')
                      : 'none'),
                opacity: isDisabled ? 0.5 : 1,
                color: selected
                  ? BRAND.coral
                  : (theme.palette.mode === 'light' ? '#717171' : 'rgba(255,255,255,0.5)'),
                                transition: 'background .2s ease, color .2s ease, box-shadow .2s ease',
                userSelect: 'none',
                outline: 'none',
                '&:focus-visible': {
                  boxShadow: `0 0 0 2px ${alpha(BRAND.coral, 0.55)}`
                },
                '&:hover': isDisabled ? {} : {
                  background: theme.palette.mode === 'light'
                    ? alpha(BRAND.coral, 0.07)
                    : alpha(BRAND.coral, 0.13),
                  color: 'primary.main',
                },
                position: 'relative'
              })}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </Box>

              {isDisabled && (<SoonTag sx={{ position:'absolute', bottom:6, right:6 }} />)}
            </Box>
          </Tooltip>
        );
      })}
      
      {/* Import/Export and Settings pinned to bottom */}
      <Box sx={{ position: 'absolute', bottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      {importExport && (
        <Tooltip title='Import / Export' placement='right' arrow>
          <Box
            aria-disabled={!importExport}
            onClick={()=> { /* future: open import/export */ }}
            sx={(theme) => ({
              position: 'relative',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              border: theme.palette.mode === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
              background: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.07)',
              color: theme.palette.mode === 'light' ? '#717171' : 'rgba(255,255,255,0.45)',
              userSelect: 'none',
              transition: 'background .2s ease, color .2s ease',
              '&:hover': {
                background: theme.palette.mode === 'light' ? alpha(BRAND.coral, 0.07) : alpha(BRAND.coral, 0.13),
                color: 'primary.main',
              }
            })}
          >
            <ImportExportIcon fontSize='small' />
          </Box>
        </Tooltip>
      )}
      
      <Tooltip title={settingsDisabled ? 'Settings (Owner only)' : 'Settings'} placement='right' arrow>
        <Box
          onClick={() => { if(!settingsDisabled) onSettingsClick?.(); }}
          aria-disabled={settingsDisabled}
          sx={(theme) => ({
            cursor: settingsDisabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2,
            border: theme.palette.mode === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
            background: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)',
            color: theme.palette.mode === 'light' ? '#717171' : 'rgba(255,255,255,0.5)',
            opacity: settingsDisabled ? 0.45 : 1,
            transition: 'background .2s ease, color .2s ease',
            '&:hover': settingsDisabled ? {} : {
              background: theme.palette.mode === 'light' ? alpha(BRAND.coral, 0.07) : alpha(BRAND.coral, 0.13),
              color: 'primary.main',
            }
          })}
        >
          <SettingsIcon fontSize='small' />
        </Box>
      </Tooltip>
      </Box>
    </Box>
  );
};

export default TripPlannerNav;
