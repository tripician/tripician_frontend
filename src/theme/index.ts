import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

// Universal color palette based on the image reference
const colors = {
  // Light theme colors (based on the image)
  light: {
    primary: {
      main: '#007ddcff',
      light: '#007ddcff',
      dark: '#29587aff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#008bbdff',
      light: '#00a8d4',
      dark: '#006d94',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5', // Light beige background from image
      paper: '#ffffff',
      sidebar: '#f8f8f8', // Slightly darker beige for sidebar
    },
    text: {
      primary: '#2c2c2c', // Dark gray text
      secondary: '#666666',
      disabled: '#999999',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  // Dark theme colors
  dark: {
    primary: {
      main: '#a8a8a8ff',
      light: '#a8a8a8ff',
      dark: '#262626ff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00a8d4',
      light: '#4fc3f7',
      dark: '#008bbdff',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#ffffff',
    },
    background: {
      default: '#1a1a1a',
      paper: '#2d2d2d',
      sidebar: '#242424',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
      disabled: '#666666',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
};

export const createAppTheme = (mode: 'light' | 'dark') => {
  const colorPalette = colors[mode];
  
  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      ...colorPalette,
    },
    typography: {
      fontFamily: '"system-ui", "Avenir", "Helvetica", "Arial", sans-serif',
      // Display / Page Titles
      h1: { fontWeight: 700, fontSize: '2.75rem', lineHeight: 1.15 },
      h2: { fontWeight: 700, fontSize: '2.125rem', lineHeight: 1.2 },
      h3: { fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.25 },
      h4: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.3 },
      // Card / Section titles
      h5: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.35 }, // 18px
      h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.4 },      // 16px
      // Subtitles (meta / secondary headings)
      subtitle1: { fontWeight: 500, fontSize: '0.9375rem', lineHeight: 1.4 }, // 15px
      subtitle2: { fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.4, letterSpacing: '.06em', textTransform: 'uppercase' }, // 12px label style
      // Body text
      body1: { fontSize: '0.9375rem', lineHeight: 1.55 }, // 15px
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },  // 13px compact
      button: { fontWeight: 600, textTransform: 'none' },
      caption: { fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '.05em' }, // 11px
      overline: { fontSize: '0.625rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: mode === 'light' 
              ? '0 2px 8px rgba(0, 0, 0, 0.08)' 
              : '0 2px 8px rgba(0, 0, 0, 0.3)',
            '&:hover': {
              boxShadow: mode === 'light' 
                ? '0 4px 16px rgba(0, 0, 0, 0.12)' 
                : '0 4px 16px rgba(0, 0, 0, 0.4)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(45, 45, 45, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: mode === 'light' 
              ? '0 1px 3px rgba(0, 0, 0, 0.05)' 
              : '0 1px 3px rgba(0, 0, 0, 0.3)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: mode === 'light' 
              ? 'linear-gradient(180deg, #000000 0%, #0052a1 100%)'
              : 'linear-gradient(180deg, #2d3748 0%, #1a202c 100%)',
            color: 'white',
            '& .MuiListItem-root': {
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
              '&.Mui-selected': {
                backgroundColor: 'rgba(255,255,255,0.15)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                },
              },
            },
            '& .MuiListItemText-primary': {
              color: 'white',
            },
            '& .MuiListItemIcon-root': {
              color: 'white',
            },
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};
